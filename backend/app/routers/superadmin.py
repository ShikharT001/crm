from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.routers.auth import require_role, hash_password
from app.services.template_service import seed_org_product_template

router = APIRouter(prefix="/api/superadmin", tags=["Super Admin"])

# Dependency: require Super Admin role
super_admin_only = require_role(models.UserRole.SUPER_ADMIN)

# ─── Features List ─────────────────────────────────────────────────────────────

@router.get("/features/", response_model=List[schemas.FeatureResponse])
def list_features(db: Session = Depends(get_db), _=Depends(super_admin_only)):
    return db.query(models.Feature).all()

# ─── Subscription Plans ────────────────────────────────────────────────────────

@router.get("/plans/", response_model=List[schemas.SubscriptionPlanResponse])
def list_plans(db: Session = Depends(get_db), _=Depends(super_admin_only)):
    return db.query(models.SubscriptionPlan).all()

@router.post("/plans/", response_model=schemas.SubscriptionPlanResponse)
def create_plan(payload: schemas.SubscriptionPlanCreate, db: Session = Depends(get_db), _=Depends(super_admin_only)):
    plan = models.SubscriptionPlan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

# ─── Helper: Build Organization Detail Response ───────────────────────────────

def _build_org_response(org: models.Company, db: Session) -> schemas.OrganizationDetailResponse:
    owner = db.query(models.User).filter(models.User.id == org.owner_id).first() if org.owner_id else None
    
    # Fallback: search for an ADMIN user belonging to this company if owner_id is missing
    if not owner:
        owner = db.query(models.User).filter(
            models.User.company_id == org.id,
            models.User.role == models.UserRole.ADMIN
        ).first()
        if owner:
            org.owner_id = owner.id
            try:
                db.commit()
            except Exception:
                db.rollback()

    user_count = db.query(models.User).filter(models.User.company_id == org.id).count()
    sub = db.query(models.OrganizationSubscription).filter(
        models.OrganizationSubscription.company_id == org.id,
        models.OrganizationSubscription.is_active == True
    ).first()
    
    # Enabled features
    enabled_features = []
    org_features = db.query(models.OrganizationFeature).filter(
        models.OrganizationFeature.company_id == org.id,
        models.OrganizationFeature.is_enabled == True
    ).all()
    for of in org_features:
        feat = db.query(models.Feature).filter(models.Feature.id == of.feature_id).first()
        if feat:
            enabled_features.append(feat.code)

    return schemas.OrganizationDetailResponse(
        id=org.id,
        name=org.name,
        domain=org.domain,
        industry=org.industry,
        status=org.status.value if hasattr(org.status, 'value') else str(org.status),
        owner_id=org.owner_id,
        owner_email=owner.email if owner else None,
        max_users=org.max_users or 25,
        current_users_count=user_count,
        subscription_plan_name=sub.plan.name if sub and sub.plan else "Trial",
        expires_at=sub.expires_at if sub else None,
        enabled_features=enabled_features,
        created_at=org.created_at
    )

# ─── Organization CRUD ────────────────────────────────────────────────────────

@router.get("/organizations/", response_model=List[schemas.OrganizationDetailResponse])
def list_organizations(db: Session = Depends(get_db), _=Depends(super_admin_only)):
    orgs = db.query(models.Company).order_by(models.Company.id.desc()).all()
    return [_build_org_response(o, db) for o in orgs]

@router.get("/organizations/{org_id}", response_model=schemas.OrganizationDetailResponse)
def get_organization(org_id: int, db: Session = Depends(get_db), _=Depends(super_admin_only)):
    org = db.query(models.Company).filter(models.Company.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _build_org_response(org, db)

@router.post("/organizations/", response_model=schemas.OrganizationDetailResponse, status_code=201)
def create_organization(payload: schemas.OrganizationCreateRequest, db: Session = Depends(get_db), _=Depends(super_admin_only)):
    # Check domain uniqueness if provided
    if payload.domain:
        existing = db.query(models.Company).filter(models.Company.domain == payload.domain).first()
        if existing:
            raise HTTPException(status_code=400, detail="Domain already registered to another organization.")

    try:
        # 1. Create Organization
        org = models.Company(
            name=payload.name,
            domain=payload.domain,
            industry=payload.industry or "Technology",
            status=payload.status,
            max_users=payload.max_users
        )
        db.add(org)
        db.flush()

        # 2. Create Owner User
        owner = db.query(models.User).filter(models.User.email == payload.owner_email).first()
        if owner:
            owner.company_id = org.id
            owner.role = models.UserRole.ADMIN
        else:
            owner = models.User(
                name=payload.owner_name,
                email=payload.owner_email,
                password_hash=hash_password(payload.owner_password),
                role=models.UserRole.ADMIN,
                company_id=org.id,
                is_active=True
            )
            db.add(owner)
            db.flush()

        org.owner_id = owner.id

        # 3. Create Subscription if plan_id provided
        if payload.plan_id:
            sub = models.OrganizationSubscription(
                company_id=org.id,
                plan_id=payload.plan_id,
                status=org.status,
                is_active=True
            )
            db.add(sub)

        # 4. Enable requested features
        if payload.enabled_features:
            all_features = db.query(models.Feature).all()
            for f in all_features:
                is_enabled = f.code in payload.enabled_features
                of = models.OrganizationFeature(company_id=org.id, feature_id=f.id, is_enabled=is_enabled)
                db.add(of)

        # 5. Auto-seed Industry Product Template for Organization
        seed_org_product_template(db, org.id, org.industry)

        db.commit()
        db.refresh(org)
        return _build_org_response(org, db)
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to create organization: {str(e)}")

@router.patch("/organizations/{org_id}", response_model=schemas.OrganizationDetailResponse)
def update_organization(
    org_id: int,
    payload: schemas.OrganizationUpdateRequest,
    db: Session = Depends(get_db),
    _=Depends(super_admin_only)
):
    org = db.query(models.Company).filter(models.Company.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if payload.name:
        org.name = payload.name
    if payload.domain:
        org.domain = payload.domain
    if payload.industry:
        org.industry = payload.industry
    if payload.status:
        org.status = payload.status
    if payload.max_users:
        org.max_users = payload.max_users

    db.commit()

    # Update Subscription Plan if changed
    if payload.plan_id:
        existing_sub = db.query(models.OrganizationSubscription).filter(
            models.OrganizationSubscription.company_id == org.id
        ).first()
        if existing_sub:
            existing_sub.plan_id = payload.plan_id
            existing_sub.status = org.status
        else:
            new_sub = models.OrganizationSubscription(
                company_id=org.id,
                plan_id=payload.plan_id,
                status=org.status,
                is_active=True
            )
            db.add(new_sub)
        db.commit()

    # Update Feature Toggles if provided
    if payload.enabled_features is not None:
        all_features = db.query(models.Feature).all()
        for f in all_features:
            is_enabled = f.code in payload.enabled_features
            of = db.query(models.OrganizationFeature).filter(
                models.OrganizationFeature.company_id == org.id,
                models.OrganizationFeature.feature_id == f.id
            ).first()
            if of:
                of.is_enabled = is_enabled
            else:
                db.add(models.OrganizationFeature(company_id=org.id, feature_id=f.id, is_enabled=is_enabled))
        db.commit()

    db.refresh(org)
    return _build_org_response(org, db)

@router.delete("/organizations/{org_id}", status_code=204)
def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    _=Depends(super_admin_only)
):
    org = db.query(models.Company).filter(models.Company.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Clear owner_id FK on Company to prevent circular FK constraint blocking deletion
    org.owner_id = None
    db.commit()

    # Cascade cleanup of all tenant-linked records
    db.query(models.ProductFieldValue).filter(
        models.ProductFieldValue.product_id.in_(
            db.query(models.Product.id).filter(models.Product.company_id == org_id)
        )
    ).delete(synchronize_session=False)

    db.query(models.ProductVariant).filter(
        models.ProductVariant.product_id.in_(
            db.query(models.Product.id).filter(models.Product.company_id == org_id)
        )
    ).delete(synchronize_session=False)

    db.query(models.OpportunityProduct).filter(
        models.OpportunityProduct.opportunity_id.in_(
            db.query(models.Opportunity.id).filter(models.Opportunity.company_id == org_id)
        )
    ).delete(synchronize_session=False)

    db.query(models.Opportunity).filter(models.Opportunity.company_id == org_id).delete(synchronize_session=False)
    db.query(models.Contact).filter(models.Contact.company_id == org_id).delete(synchronize_session=False)
    db.query(models.Customer).filter(models.Customer.company_id == org_id).delete(synchronize_session=False)
    db.query(models.Lead).filter(models.Lead.company_id == org_id).delete(synchronize_session=False)
    db.query(models.Product).filter(models.Product.company_id == org_id).delete(synchronize_session=False)
    db.query(models.OrgProductFieldOption).filter(
        models.OrgProductFieldOption.field_id.in_(
            db.query(models.OrgProductField.id).filter(models.OrgProductField.company_id == org_id)
        )
    ).delete(synchronize_session=False)
    db.query(models.OrgProductField).filter(models.OrgProductField.company_id == org_id).delete(synchronize_session=False)
    db.query(models.OrgCategory).filter(models.OrgCategory.company_id == org_id).delete(synchronize_session=False)
    db.query(models.Employee).filter(models.Employee.company_id == org_id).delete(synchronize_session=False)
    db.query(models.User).filter(models.User.company_id == org_id).delete(synchronize_session=False)
    db.query(models.OrganizationSubscription).filter(models.OrganizationSubscription.company_id == org_id).delete(synchronize_session=False)
    db.query(models.OrganizationFeature).filter(models.OrganizationFeature.company_id == org_id).delete(synchronize_session=False)

    db.delete(org)
    db.commit()
    return None

# ─── Module 3: Industry Templates CRUD ────────────────────────────────────────

@router.get("/templates/", response_model=List[schemas.IndustryTemplateResponse])
def list_industry_templates(db: Session = Depends(get_db), _=Depends(super_admin_only)):
    return db.query(models.IndustryTemplate).order_by(models.IndustryTemplate.name).all()

@router.get("/templates/{template_id}", response_model=schemas.IndustryTemplateResponse)
def get_industry_template(template_id: int, db: Session = Depends(get_db), _=Depends(super_admin_only)):
    template = db.query(models.IndustryTemplate).filter(models.IndustryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Industry template not found")
    return template

@router.post("/templates/", response_model=schemas.IndustryTemplateResponse, status_code=201)
def create_industry_template(payload: schemas.IndustryTemplateCreate, db: Session = Depends(get_db), _=Depends(super_admin_only)):
    existing = db.query(models.IndustryTemplate).filter(models.IndustryTemplate.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Template with code '{payload.code}' already exists")

    fields_data = payload.fields or []
    template_data = payload.model_dump(exclude={"fields"})

    template = models.IndustryTemplate(**template_data)
    db.add(template)
    db.flush()

    for f_data in fields_data:
        tf = models.TemplateField(template_id=template.id, **f_data.model_dump())
        db.add(tf)

    db.commit()
    db.refresh(template)
    return template

@router.delete("/templates/{template_id}", status_code=204)
def delete_industry_template(template_id: int, db: Session = Depends(get_db), _=Depends(super_admin_only)):
    template = db.query(models.IndustryTemplate).filter(models.IndustryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Industry template not found")
    db.delete(template)
    db.commit()
    return None

@router.post("/templates/{template_id}/apply/{org_id}")
def apply_template_to_org(template_id: int, org_id: int, overwrite: bool = False, db: Session = Depends(get_db), _=Depends(super_admin_only)):
    template = db.query(models.IndustryTemplate).filter(models.IndustryTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Industry template not found")

    org = db.query(models.Company).filter(models.Company.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if overwrite:
        db.query(models.OrgProductFieldOption).filter(
            models.OrgProductFieldOption.field_id.in_(
                db.query(models.OrgProductField.id).filter(models.OrgProductField.company_id == org_id)
            )
        ).delete(synchronize_session=False)
        db.query(models.OrgProductField).filter(models.OrgProductField.company_id == org_id).delete(synchronize_session=False)
        db.query(models.OrgCategory).filter(models.OrgCategory.company_id == org_id).delete(synchronize_session=False)
        db.commit()

    success = seed_org_product_template(db, org_id, template.code)
    db.commit()
    return {"status": "success", "message": f"Template '{template.name}' applied to organization '{org.name}'"}
