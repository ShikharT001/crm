from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from app.database import get_db
from app import models
from app.routers.auth import get_current_active_user, require_role, TenantContext, get_tenant_context

router = APIRouter(prefix="/api/chat", tags=["Chat"])

class CreateGroup(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    member_ids: List[int] = []

class UpdateGroup(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None

class AddMembers(BaseModel):
    user_ids: List[int]

class SendMessage(BaseModel):
    content: str

@router.get("/groups")
def get_groups(
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    if current_user.role in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        groups = tenant.filter_query(db.query(models.ChatGroup), models.ChatGroup).order_by(models.ChatGroup.created_at.desc()).all()
    else:
        memberships = db.query(models.ChatGroupMember).filter(models.ChatGroupMember.user_id == current_user.id).all()
        group_ids = [m.group_id for m in memberships]
        groups = db.query(models.ChatGroup).filter(models.ChatGroup.id.in_(group_ids)).order_by(models.ChatGroup.created_at.desc()).all()
    
    result = []
    for g in groups:
        last_message = db.query(models.ChatMessage).filter(
            models.ChatMessage.group_id == g.id,
            models.ChatMessage.is_deleted == False
        ).order_by(models.ChatMessage.created_at.desc()).first()
        
        members_data = []
        for m in g.members:
            if m.user:
                role_val = m.user.role.value if hasattr(m.user.role, 'value') else str(m.user.role)
                members_data.append({
                    "id": m.user.id,
                    "user_id": m.user.id,
                    "name": m.user.name,
                    "user_name": m.user.name,
                    "role": role_val,
                    "user_role": role_val,
                    "group_role": m.role
                })
        
        result.append({
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "icon": g.icon or "💬",
            "created_by": g.created_by,
            "creator_name": g.creator.name if g.creator else None,
            "member_count": len(members_data),
            "members": members_data,
            "last_message": last_message.content if last_message else None,
            "last_message_at": last_message.created_at if last_message else None,
            "unread_count": 0
        })
    return result

@router.post("/groups")
def create_group(
    data: CreateGroup,
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN)),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    group = models.ChatGroup(
        company_id=current_user.company_id,
        name=data.name,
        description=data.description,
        icon=data.icon or "💬",
        created_by=current_user.id
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    
    # Add members including creator
    member_ids = set(data.member_ids or [])
    member_ids.add(current_user.id)
    
    for uid in member_ids:
        member = models.ChatGroupMember(
            group_id=group.id,
            user_id=uid,
            role="admin" if uid == current_user.id else "member"
        )
        db.add(member)
    db.commit()
    
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "icon": group.icon,
        "created_by": group.created_by,
        "message": "Group created successfully"
    }

@router.get("/groups/{group_id}")
def get_group(
    group_id: int,
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    group = db.query(models.ChatGroup).filter(models.ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member and current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    members_data = []
    for m in group.members:
        if m.user:
            role_val = m.user.role.value if hasattr(m.user.role, 'value') else str(m.user.role)
            members_data.append({
                "id": m.user.id,
                "user_id": m.user.id,
                "name": m.user.name,
                "user_name": m.user.name,
                "role": role_val,
                "user_role": role_val,
                "group_role": m.role
            })

    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "icon": group.icon or "💬",
        "members": members_data
    }

@router.patch("/groups/{group_id}")
def update_group(
    group_id: int,
    data: UpdateGroup,
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN)),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    group = db.query(models.ChatGroup).filter(models.ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if data.name is not None: group.name = data.name
    if data.description is not None: group.description = data.description
    if data.icon is not None: group.icon = data.icon
    
    db.commit()
    return {"message": "Group updated"}

@router.delete("/groups/{group_id}")
def delete_group(
    group_id: int,
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN)),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    group = db.query(models.ChatGroup).filter(models.ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    db.delete(group)
    db.commit()
    return {"message": "Group deleted"}

@router.post("/groups/{group_id}/members")
def add_members(
    group_id: int,
    data: AddMembers,
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN)),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    group = db.query(models.ChatGroup).filter(models.ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    existing_members = {m.user_id for m in group.members}
    
    for uid in data.user_ids:
        if uid not in existing_members:
            db.add(models.ChatGroupMember(group_id=group.id, user_id=uid))
            
    db.commit()
    return {"message": "Members added"}

@router.delete("/groups/{group_id}/members/{user_id}")
def remove_member(
    group_id: int,
    user_id: int,
    current_user: models.User = Depends(require_role(models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN)),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    member = db.query(models.ChatGroupMember).filter(
        models.ChatGroupMember.group_id == group_id,
        models.ChatGroupMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
        
    db.delete(member)
    db.commit()
    return {"message": "Member removed"}

@router.get("/groups/{group_id}/messages")
def get_messages(
    group_id: int,
    before_id: Optional[int] = Query(None),
    limit: int = Query(50),
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    group = db.query(models.ChatGroup).filter(models.ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member and current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    query = db.query(models.ChatMessage).filter(
        models.ChatMessage.group_id == group_id,
        models.ChatMessage.is_deleted == False
    )
    
    if before_id:
        query = query.filter(models.ChatMessage.id < before_id)
        
    # Get latest first for limit, then reverse
    messages = query.order_by(models.ChatMessage.created_at.desc()).limit(limit).all()
    messages.reverse()
    
    result = []
    for m in messages:
        result.append({
            "id": m.id,
            "group_id": m.group_id,
            "sender_id": m.sender_id,
            "sender_name": m.sender.name if m.sender else "Unknown",
            "sender_role": m.sender.role.value if m.sender else None,
            "content": m.content,
            "message_type": m.message_type,
            "created_at": m.created_at
        })
    return result

@router.post("/groups/{group_id}/messages")
def send_message(
    group_id: int,
    data: SendMessage,
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    group = db.query(models.ChatGroup).filter(models.ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    message = models.ChatMessage(
        group_id=group_id,
        sender_id=current_user.id,
        content=data.content
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return {
        "id": message.id,
        "group_id": message.group_id,
        "sender_id": message.sender_id,
        "sender_name": current_user.name,
        "sender_role": current_user.role.value,
        "content": message.content,
        "message_type": message.message_type,
        "created_at": message.created_at
    }

@router.delete("/messages/{message_id}")
def delete_message(
    message_id: int,
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    message = db.query(models.ChatMessage).filter(models.ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if message.sender_id != current_user.id and current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Cannot delete other people's messages")
        
    message.is_deleted = True
    db.commit()
    return {"message": "Message deleted"}
