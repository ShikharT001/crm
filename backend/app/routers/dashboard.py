from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import crud, schemas
from app.database import get_db
from app.routers.auth import get_tenant_context, TenantContext

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=schemas.DashboardStats)
def read_dashboard_stats(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context)
):
    return crud.get_dashboard_stats(db, tenant=tenant)
