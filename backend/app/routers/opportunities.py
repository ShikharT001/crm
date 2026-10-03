from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.database import get_db
from app.routers.auth import get_tenant_context, require_permission, TenantContext

router = APIRouter(prefix="/api/opportunities", tags=["Opportunities"])

@router.get("/", response_model=List[schemas.OpportunityResponse])
def read_opportunities(
    stage: Optional[str] = None,
    skip: int = 0,
    limit: int = 2000,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    user: models.User = Depends(require_permission("opportunities.view"))
):
    return crud.get_opportunities(db, tenant=tenant, skip=skip, limit=limit, stage=stage)

@router.get("/{opp_id}", response_model=schemas.OpportunityResponse)
def read_opportunity(
    opp_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    user: models.User = Depends(require_permission("opportunities.view"))
):
    opp = crud.get_opportunity(db, opportunity_id=opp_id, tenant=tenant)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp

@router.post("/", response_model=schemas.OpportunityResponse)
def create_opportunity(
    opportunity: schemas.OpportunityCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    user: models.User = Depends(require_permission("opportunities.create"))
):
    return crud.create_opportunity(db=db, opportunity=opportunity, tenant=tenant)

@router.patch("/{opp_id}", response_model=schemas.OpportunityResponse)
def update_opportunity(
    opp_id: int,
    opp_update: schemas.OpportunityUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
    user: models.User = Depends(require_permission("opportunities.edit"))
):
    opp = crud.update_opportunity(db=db, opp_id=opp_id, opp_data=opp_update, tenant=tenant)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp
