from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app import models
from app.routers.auth import get_current_active_user, require_role, TenantContext, get_tenant_context

router = APIRouter(prefix="/api/activity", tags=["Activity"])

@router.get("/logs")
def get_activity_logs(
    user_id: Optional[int] = Query(None),
    limit: int = Query(100),
    action: Optional[str] = Query(None),
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    query = tenant.filter_query(db.query(models.UserActivityLog), models.UserActivityLog)
    
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        query = query.filter(models.UserActivityLog.user_id == current_user.id)
    elif user_id:
        query = query.filter(models.UserActivityLog.user_id == user_id)
        
    if action:
        query = query.filter(models.UserActivityLog.action == action)
        
    logs = query.order_by(models.UserActivityLog.created_at.desc()).limit(limit).all()
    
    result = []
    for log in logs:
        role_val = log.user.role.value if log.user and hasattr(log.user.role, 'value') else (str(log.user.role) if log.user else 'employee')
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_name": log.user.name if log.user else "Unknown",
            "user_email": log.user.email if log.user else "Unknown",
            "user_role": role_val,
            "action": log.action,
            "ip_address": log.ip_address or "127.0.0.1",
            "user_agent": log.user_agent or "",
            "details": log.details or f"{log.action.capitalize()} event",
            "created_at": log.created_at
        })
    return result

@router.get("/online-users")
def get_online_users(
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN)),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    query = tenant.filter_query(db.query(models.UserActivityLog), models.UserActivityLog)
    
    logs = query.filter(
        models.UserActivityLog.action == 'login',
        models.UserActivityLog.created_at >= twenty_four_hours_ago
    ).order_by(models.UserActivityLog.created_at.desc()).all()
    
    users = {}
    for log in logs:
        if log.user_id not in users and log.user:
            role_val = log.user.role.value if hasattr(log.user.role, 'value') else str(log.user.role)
            users[log.user_id] = {
                "id": log.user_id,
                "user_id": log.user_id,
                "name": log.user.name,
                "user_name": log.user.name,
                "email": log.user.email,
                "user_email": log.user.email,
                "role": role_val,
                "user_role": role_val,
                "last_seen": log.created_at,
                "last_login": log.created_at,
                "ip_address": log.ip_address
            }
    return list(users.values())
