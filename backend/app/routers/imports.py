import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app import models
from app.routers.auth import get_current_active_user, require_role, require_permission, TenantContext, get_tenant_context

router = APIRouter(prefix="/api/imports", tags=["Imports"])

@router.get("/template/leads", response_class=PlainTextResponse)
def get_leads_template():
    content = "title,contact_name,contact_email,phone,company_name,status,value,notes\n"
    return content

@router.get("/template/contacts", response_class=PlainTextResponse)
def get_contacts_template():
    content = "name,email,phone,position,customer_name\n"
    return content

@router.get("/history")
def get_import_history(
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    query = tenant.filter_query(db.query(models.ImportJob), models.ImportJob)
    jobs = query.order_by(models.ImportJob.created_at.desc()).all()
    
    return [
        {
            "id": job.id,
            "import_type": job.import_type,
            "filename": job.filename,
            "total_rows": job.total_rows,
            "imported_rows": job.imported_rows,
            "skipped_rows": job.skipped_rows,
            "error_rows": job.error_rows,
            "status": job.status,
            "created_at": job.created_at
        } for job in jobs
    ]

def _parse_csv(file: UploadFile):
    raw_bytes = file.file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file")
    
    content = None
    # Support multiple encodings commonly used by Excel and Windows (CP1252/Windows-1252, ISO-8859-1, UTF-8 BOM, etc.)
    for enc in ('utf-8-sig', 'utf-8', 'cp1252', 'iso-8859-1', 'latin1', 'utf-16'):
        try:
            content = raw_bytes.decode(enc)
            break
        except (UnicodeDecodeError, LookupError):
            continue
            
    if content is None:
        # Safe fallback: decode with replacement characters instead of throwing 400 error
        content = raw_bytes.decode('utf-8', errors='replace')
        
    reader = csv.DictReader(io.StringIO(content))
    # Normalize headers
    if reader.fieldnames:
        reader.fieldnames = [str(f).strip().lower().replace('\ufeff', '') for f in reader.fieldnames]
        
    return list(reader)

@router.post("/leads")
def import_leads(
    file: UploadFile = File(...),
    default_status: Optional[str] = Form(None),
    category_tag: Optional[str] = Form(None),
    assigned_user_id: Optional[int] = Form(None),
    default_company_name: Optional[str] = Form(None),
    current_user: models.User = Depends(require_permission("leads.create")),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    try:
        rows = _parse_csv(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")
        
    if len(rows) > 5000:
        raise HTTPException(status_code=400, detail="File too large. Max 5000 rows.")
        
    job = models.ImportJob(
        company_id=current_user.company_id,
        imported_by=current_user.id,
        import_type="leads",
        filename=file.filename,
        total_rows=len(rows)
    )
    db.add(job)
    db.commit()
    
    imported = 0
    skipped = 0
    errors = 0
    error_details = []
    
    valid_statuses = ["new", "contacted", "qualified", "converted", "lost"]
    fallback_status = (default_status or "New").strip().capitalize()
    if fallback_status.lower() not in valid_statuses:
        fallback_status = "New"
    
    for idx, row in enumerate(rows):
        row_num = idx + 2
        try:
            title = row.get("title", "").strip() or row.get("lead_name", "").strip()
            contact_name = row.get("contact_name", "").strip() or row.get("name", "").strip()
            contact_email = row.get("contact_email", "").strip() or row.get("email", "").strip()
            
            # Fallback title if missing
            if not title and contact_name:
                title = f"Lead - {contact_name}"
                
            if not title or not contact_name or not contact_email:
                errors += 1
                error_details.append({"row": row_num, "field": "multiple", "reason": "Missing required fields (title/name, contact_name, contact_email)"})
                continue
                
            status_raw = row.get("status", "").strip().lower()
            if status_raw in valid_statuses:
                final_status = status_raw.capitalize()
            else:
                final_status = fallback_status
                
            value = 0.0
            val_str = row.get("value", "").strip() or row.get("amount", "").strip()
            if val_str:
                try:
                    value = float(val_str.replace("$", "").replace(",", ""))
                except ValueError:
                    pass
                    
            co_name = row.get("company_name", "").strip() or row.get("company", "").strip() or default_company_name
            
            # Build notes with categorization tag if specified
            base_notes = row.get("notes", "").strip()
            notes_parts = []
            if category_tag:
                notes_parts.append(f"[Category: {category_tag.strip()}]")
            source_tag = row.get("source", "").strip() or row.get("category", "").strip()
            if source_tag:
                notes_parts.append(f"[Source: {source_tag}]")
            if base_notes:
                notes_parts.append(base_notes)
            final_notes = " ".join(notes_parts) if notes_parts else None

            lead = models.Lead(
                title=title,
                company_id=current_user.company_id,
                company_name=co_name or None,
                contact_name=contact_name,
                contact_email=contact_email,
                phone=row.get("phone", "").strip() or None,
                status=final_status,
                value=value,
                assigned_user_id=assigned_user_id,
                notes=final_notes
            )
            db.add(lead)
            imported += 1
        except Exception as e:
            errors += 1
            error_details.append({"row": row_num, "field": "unknown", "reason": str(e)})
            
    db.commit()
    
    job.imported_rows = imported
    job.skipped_rows = skipped
    job.error_rows = errors
    job.status = "completed" if errors == 0 else ("partial" if imported > 0 else "failed")
    db.commit()
    
    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "error_details": error_details,
        "job_id": job.id,
        "total": len(rows)
    }

@router.post("/contacts")
def import_contacts(
    file: UploadFile = File(...),
    assignment_mode: Optional[str] = Form("auto"),
    default_customer_id: Optional[int] = Form(None),
    default_customer_name: Optional[str] = Form(None),
    default_industry: Optional[str] = Form(None),
    category_tag: Optional[str] = Form(None),
    default_position: Optional[str] = Form(None),
    current_user: models.User = Depends(require_permission("contacts.create")),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    try:
        rows = _parse_csv(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")
        
    if len(rows) > 5000:
        raise HTTPException(status_code=400, detail="File too large. Max 5000 rows.")
        
    job = models.ImportJob(
        company_id=current_user.company_id,
        imported_by=current_user.id,
        import_type="contacts",
        filename=file.filename,
        total_rows=len(rows)
    )
    db.add(job)
    db.commit()
    
    imported = 0
    skipped = 0
    errors = 0
    error_details = []
    
    # Pre-resolve fixed customer if assignment_mode is existing or new
    fixed_customer = None
    if assignment_mode == "existing" and default_customer_id:
        fixed_customer = db.query(models.Customer).filter(
            models.Customer.id == default_customer_id,
            models.Customer.company_id == current_user.company_id
        ).first()
    elif assignment_mode == "new" and default_customer_name:
        fixed_customer = models.Customer(
            name=default_customer_name.strip(),
            company_id=current_user.company_id,
            industry=default_industry or None,
            status=models.CustomerStatus.ACTIVE
        )
        db.add(fixed_customer)
        db.flush()

    for idx, row in enumerate(rows):
        row_num = idx + 2
        try:
            name = row.get("name", "").strip() or row.get("contact_name", "").strip()
            email = row.get("email", "").strip() or row.get("contact_email", "").strip()
            
            if not name or not email:
                errors += 1
                error_details.append({"row": row_num, "field": "name/email", "reason": "Missing required name or email"})
                continue
                
            # Determine Customer Account
            if fixed_customer:
                target_customer = fixed_customer
            else:
                cust_name = row.get("customer_name", "").strip() or row.get("company_name", "").strip() or row.get("company", "").strip() or default_customer_name
                if not cust_name:
                    cust_name = f"Account - {name}"
                    
                target_customer = db.query(models.Customer).filter(
                    models.Customer.company_id == current_user.company_id,
                    models.Customer.name == cust_name
                ).first()
                
                if not target_customer:
                    target_customer = models.Customer(
                        name=cust_name,
                        company_id=current_user.company_id,
                        industry=row.get("industry", "").strip() or default_industry or None,
                        status=models.CustomerStatus.ACTIVE
                    )
                    db.add(target_customer)
                    db.flush()
                
            # Check for existing email in contacts for this customer
            existing_contact = db.query(models.Contact).filter(
                models.Contact.customer_id == target_customer.id,
                models.Contact.email == email
            ).first()
            
            if existing_contact:
                skipped += 1
                continue
                
            position = row.get("position", "").strip() or row.get("title", "").strip() or default_position
            if category_tag:
                position = f"{position} ({category_tag})" if position else category_tag

            contact = models.Contact(
                company_id=current_user.company_id,
                customer_id=target_customer.id,
                name=name,
                email=email,
                phone=row.get("phone", "").strip() or None,
                position=position or None
            )
            db.add(contact)
            imported += 1
        except Exception as e:
            errors += 1
            error_details.append({"row": row_num, "field": "unknown", "reason": str(e)})
            
    db.commit()
    
    job.imported_rows = imported
    job.skipped_rows = skipped
    job.error_rows = errors
    job.status = "completed" if errors == 0 else ("partial" if imported > 0 else "failed")
    db.commit()
    
    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "error_details": error_details,
        "job_id": job.id,
        "total": len(rows)
    }
