from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.routers.auth import (
    get_current_active_user,
    require_role,
    build_user_response,
    hash_password,
)

router = APIRouter(prefix="/api/users", tags=["Users"])

UserRole = models.UserRole

# ─── Permission helpers ───────────────────────────────────────────────────────

def _can_manage_target(actor: models.User, target: models.User) -> bool:
    """Returns True if `actor` is allowed to manage `target`."""
    if actor.role == UserRole.SUPER_ADMIN:
        return True
    if actor.role == UserRole.ADMIN:
        # Admin can manage users in same company, but not other Admins / Super Admins
        return (
            target.company_id == actor.company_id
            and target.role not in (UserRole.SUPER_ADMIN, UserRole.ADMIN)
        )
    if actor.role == UserRole.MANAGER:
        # Manager can only manage their direct subordinates (employees)
        return target.manager_id == actor.id and target.role == UserRole.EMPLOYEE
    return False  # Employee cannot manage anyone


def _allowed_create_roles(actor: models.User) -> List[UserRole]:
    """Returns the list of roles this actor is allowed to create."""
    if actor.role == UserRole.SUPER_ADMIN:
        return list(UserRole)
    if actor.role == UserRole.ADMIN:
        return [UserRole.MANAGER, UserRole.EMPLOYEE]
    if actor.role == UserRole.MANAGER:
        return [UserRole.EMPLOYEE]
    return []


# ─── GET /api/users/ ─────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.UserResponse])
def list_users(
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    query = db.query(models.User)

    # Scope by role
    if current_user.role == UserRole.SUPER_ADMIN:
        pass  # See all
    elif current_user.role == UserRole.ADMIN:
        query = query.filter(models.User.company_id == current_user.company_id)
        # Exclude other admins / super admins from the list
        query = query.filter(models.User.role.notin_([UserRole.SUPER_ADMIN]))
    elif current_user.role == UserRole.MANAGER:
        query = query.filter(models.User.company_id == current_user.company_id)
        query = query.filter(models.User.role.notin_([UserRole.SUPER_ADMIN]))
    else:
        from app.routers.auth import check_user_permission
        if check_user_permission(db, current_user, "users.view"):
            query = query.filter(models.User.company_id == current_user.company_id)
            query = query.filter(models.User.role.notin_([UserRole.SUPER_ADMIN]))
        else:
            query = query.filter(models.User.id == current_user.id)

    if role:
        query = query.filter(models.User.role == role)
    if is_active is not None:
        query = query.filter(models.User.is_active == is_active)

    users = query.order_by(models.User.id.asc()).all()
    return [build_user_response(u, db) for u in users]


# ─── POST /api/users/ ────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.UserResponse, status_code=201)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    allowed_roles = _allowed_create_roles(current_user)
    if not allowed_roles:
        raise HTTPException(status_code=403, detail="You do not have permission to create users.")

    if payload.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"You can only create users with roles: {[r.value for r in allowed_roles]}"
        )

    # Enforce company scope
    if current_user.role != UserRole.SUPER_ADMIN:
        if payload.company_id and payload.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="You can only create users in your own company.")
        payload.company_id = current_user.company_id

    # Enforce manager assignment for employees created by managers
    if current_user.role == UserRole.MANAGER and payload.role == UserRole.EMPLOYEE:
        payload.manager_id = current_user.id

    # Check email uniqueness
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        company_id=payload.company_id,
        manager_id=payload.manager_id,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return build_user_response(user, db)


# ─── GET /api/users/{user_id} ────────────────────────────────────────────────

@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Allow viewing self always; otherwise check permission
    if user_id != current_user.id and not _can_manage_target(current_user, user):
        raise HTTPException(status_code=403, detail="Access denied.")

    return build_user_response(user, db)


# ─── PATCH /api/users/{user_id} ──────────────────────────────────────────────

@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    is_self = (user_id == current_user.id)
    can_manage = _can_manage_target(current_user, user)

    if not is_self and not can_manage:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Employees editing themselves can only update name/password
    if is_self and current_user.role == UserRole.EMPLOYEE:
        allowed_self_fields = {"name", "password"}
        for field in payload.model_dump(exclude_unset=True):
            if field not in allowed_self_fields:
                raise HTTPException(
                    status_code=403,
                    detail=f"Employees can only update: {allowed_self_fields}"
                )

    # Role escalation guard
    if payload.role and payload.role != user.role:
        allowed_roles = _allowed_create_roles(current_user)
        if payload.role not in allowed_roles and current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=403,
                detail=f"You cannot assign the role '{payload.role.value}'."
            )

    update_data = payload.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        if hasattr(user, key):
            setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return build_user_response(user, db)


# ─── DELETE /api/users/{user_id} ─────────────────────────────────────────────

@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself.")

    if not _can_manage_target(current_user, user):
        raise HTTPException(status_code=403, detail="Access denied.")

    db.delete(user)
    db.commit()


# ─── POST /api/users/{user_id}/toggle-active ─────────────────────────────────

@router.post("/{user_id}/toggle-active", response_model=schemas.UserResponse)
def toggle_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself.")

    if not _can_manage_target(current_user, user):
        raise HTTPException(status_code=403, detail="Access denied.")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return build_user_response(user, db)


# ─── GET /api/users/company/{company_id} ─────────────────────────────────────

@router.get("/company/{company_id}", response_model=List[schemas.UserResponse])
def list_users_by_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
):
    if current_user.role == UserRole.ADMIN and current_user.company_id != company_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    users = db.query(models.User).filter(models.User.company_id == company_id).all()
    return [build_user_response(u, db) for u in users]
