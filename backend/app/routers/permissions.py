from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app import models
from app.routers.auth import get_current_active_user, require_role, TenantContext, get_tenant_context

router = APIRouter(prefix="/api/permissions", tags=["Permissions"])

ALL_PERMISSIONS = [
    # Leads
    {'key': 'leads.view', 'label': 'View Leads', 'category': 'Leads'},
    {'key': 'leads.create', 'label': 'Create Leads', 'category': 'Leads'},
    {'key': 'leads.edit', 'label': 'Edit Leads', 'category': 'Leads'},
    {'key': 'leads.delete', 'label': 'Delete Leads', 'category': 'Leads'},
    {'key': 'leads.convert', 'label': 'Convert Leads', 'category': 'Leads'},
    # Contacts
    {'key': 'contacts.view', 'label': 'View Contacts', 'category': 'Contacts'},
    {'key': 'contacts.create', 'label': 'Create Contacts', 'category': 'Contacts'},
    {'key': 'contacts.edit', 'label': 'Edit Contacts', 'category': 'Contacts'},
    {'key': 'contacts.delete', 'label': 'Delete Contacts', 'category': 'Contacts'},
    # Customers
    {'key': 'customers.view', 'label': 'View Customers', 'category': 'Customers'},
    {'key': 'customers.create', 'label': 'Create Customers', 'category': 'Customers'},
    {'key': 'customers.edit', 'label': 'Edit Customers', 'category': 'Customers'},
    # Opportunities
    {'key': 'opportunities.view', 'label': 'View Opportunities', 'category': 'Opportunities'},
    {'key': 'opportunities.create', 'label': 'Create Opportunities', 'category': 'Opportunities'},
    {'key': 'opportunities.edit', 'label': 'Edit Opportunities', 'category': 'Opportunities'},
    # Products
    {'key': 'products.view', 'label': 'View Products', 'category': 'Products'},
    {'key': 'products.create', 'label': 'Create Products', 'category': 'Products'},
    {'key': 'products.edit', 'label': 'Edit Products', 'category': 'Products'},
    {'key': 'products.delete', 'label': 'Delete Products', 'category': 'Products'},
    # Reports
    {'key': 'reports.view', 'label': 'View Reports', 'category': 'Reports'},
    # Users
    {'key': 'users.view', 'label': 'View Team Members', 'category': 'Users'},
]

class PermissionUpdate(BaseModel):
    permissions: List[str]

@router.get("/available")
def get_available_permissions(current_user: models.User = Depends(get_current_active_user)):
    return ALL_PERMISSIONS

@router.get("/me")
def get_my_permissions(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.role in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        return [p['key'] for p in ALL_PERMISSIONS]
    perms = db.query(models.UserPermission).filter(models.UserPermission.user_id == current_user.id).all()
    return [p.permission for p in perms]

@router.get("/user/{user_id}")
def get_user_permissions(
    user_id: int, 
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN)),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    target_user = tenant.filter_query(db.query(models.User), models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if target_user.role in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        return [p['key'] for p in ALL_PERMISSIONS]
    perms = db.query(models.UserPermission).filter(models.UserPermission.user_id == user_id).all()
    return [p.permission for p in perms]

@router.put("/user/{user_id}")
def update_user_permissions(
    user_id: int, 
    data: PermissionUpdate,
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN)),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    target_user = tenant.filter_query(db.query(models.User), models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.role in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=400, detail="Cannot manage permissions for Admin users")
        
    db.query(models.UserPermission).filter(models.UserPermission.user_id == user_id).delete()
    for p in data.permissions:
        db.add(models.UserPermission(
            user_id=user_id,
            permission=p,
            granted_by=current_user.id
        ))
    db.commit()
    return {"message": "Permissions updated successfully", "permissions": data.permissions}

@router.get("/all-users")
def get_all_users_permissions(
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN)),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    users = tenant.filter_query(db.query(models.User), models.User).filter(
        models.User.role.in_([models.UserRole.MANAGER, models.UserRole.EMPLOYEE])
    ).all()
    result = {}
    for u in users:
        perms = db.query(models.UserPermission).filter(models.UserPermission.user_id == u.id).all()
        result[str(u.id)] = [p.permission for p in perms]
    return result

