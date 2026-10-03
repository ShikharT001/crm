from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.database import get_db
from app.routers.auth import require_feature, require_permission, TenantContext

router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("/", response_model=List[schemas.CustomerResponse])
def read_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("contacts")),
    user: models.User = Depends(require_permission("customers.view"))
):
    return crud.get_customers(db, tenant=tenant, skip=skip, limit=limit)

@router.get("/{customer_id}", response_model=schemas.CustomerResponse)
def read_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("contacts")),
    user: models.User = Depends(require_permission("customers.view"))
):
    customer = crud.get_customer(db, customer_id=customer_id, tenant=tenant)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("/", response_model=schemas.CustomerResponse)
def create_customer(
    customer: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("contacts")),
    user: models.User = Depends(require_permission("customers.create"))
):
    return crud.create_customer(db=db, customer=customer, tenant=tenant)

@router.post("/{customer_id}/contacts", response_model=schemas.ContactResponse)
def create_contact_for_customer(
    customer_id: int,
    contact: schemas.ContactBase,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("contacts")),
    user: models.User = Depends(require_permission("contacts.create"))
):
    customer = crud.get_customer(db, customer_id=customer_id, tenant=tenant)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    contact_data = schemas.ContactCreate(**contact.model_dump(), customer_id=customer_id)
    return crud.create_contact(db=db, contact=contact_data, tenant=tenant)
