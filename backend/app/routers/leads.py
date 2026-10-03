from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.database import get_db
from app.routers.auth import require_feature, require_permission, TenantContext

router = APIRouter(prefix="/api/leads", tags=["Leads"])

@router.get("/", response_model=List[schemas.LeadResponse])
def read_leads(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("leads")),
    user: models.User = Depends(require_permission("leads.view"))
):
    return crud.get_leads(db, tenant=tenant, skip=skip, limit=limit, status=status)

@router.get("/{lead_id}", response_model=schemas.LeadResponse)
def read_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("leads")),
    user: models.User = Depends(require_permission("leads.view"))
):
    lead = crud.get_lead(db, lead_id=lead_id, tenant=tenant)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.post("/", response_model=schemas.LeadResponse)
def create_lead(
    lead: schemas.LeadCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("leads")),
    user: models.User = Depends(require_permission("leads.create"))
):
    return crud.create_lead(db=db, lead=lead, tenant=tenant)

@router.patch("/{lead_id}", response_model=schemas.LeadResponse)
def update_lead(
    lead_id: int,
    lead_update: schemas.LeadUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("leads")),
    user: models.User = Depends(require_permission("leads.edit"))
):
    lead = crud.update_lead(db=db, lead_id=lead_id, lead_data=lead_update, tenant=tenant)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.delete("/{lead_id}", status_code=204)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("leads")),
    user: models.User = Depends(require_permission("leads.delete"))
):
    lead = crud.get_lead(db, lead_id=lead_id, tenant=tenant)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return None

@router.post("/{lead_id}/convert", response_model=schemas.CustomerResponse)
def convert_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("leads")),
    user: models.User = Depends(require_permission("leads.convert"))
):
    customer, err = crud.convert_lead_to_customer(db=db, lead_id=lead_id, tenant=tenant)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return customer
