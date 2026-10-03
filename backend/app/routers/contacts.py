from typing import List, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import crud, models
from app.database import get_db
from app.routers.auth import require_feature, require_permission, TenantContext

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])

@router.get("/", response_model=List[Any])
def read_all_contacts(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("contacts")),
    user: models.User = Depends(require_permission("contacts.view"))
):
    return crud.get_contacts_with_full_details(db, tenant=tenant)
