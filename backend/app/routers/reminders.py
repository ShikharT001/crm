from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app import models, schemas
from app.routers.auth import (
    get_current_active_user,
    TenantContext,
    get_tenant_context,
)

router = APIRouter(prefix="/api/reminders", tags=["Reminders & Notifications"])

def _to_naive_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def _format_attendee(att: models.ReminderAttendee) -> dict:
    user = att.user
    role_val = None
    if user and user.role:
        role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    return {
        "id": att.id,
        "user_id": att.user_id,
        "user_name": user.name if user else "Unknown User",
        "user_email": user.email if user else "",
        "user_role": role_val,
        "status": att.status,
        "is_read": att.is_read,
        "is_dismissed": att.is_dismissed,
        "dismissed_at": _ensure_utc(att.dismissed_at),
    }

def _build_reminder_response(rem: models.Reminder, current_user_id: int) -> dict:
    creator = rem.creator
    creator_role_val = None
    if creator and creator.role:
        creator_role_val = creator.role.value if hasattr(creator.role, "value") else str(creator.role)

    attendees_data = [_format_attendee(a) for a in rem.attendees]
    my_attendee = next((a for a in rem.attendees if a.user_id == current_user_id), None)

    now = datetime.utcnow()
    # is_due if scheduled time arrived (or within 5 minutes) and not yet completed/cancelled
    is_due = (
        rem.status == models.ReminderStatus.SCHEDULED
        and rem.scheduled_at <= (now + timedelta(minutes=5))
        and (my_attendee is None or not my_attendee.is_dismissed)
    )

    rem_type_val = rem.reminder_type.value if hasattr(rem.reminder_type, "value") else str(rem.reminder_type)
    priority_val = rem.priority.value if hasattr(rem.priority, "value") else str(rem.priority)
    status_val = rem.status.value if hasattr(rem.status, "value") else str(rem.status)

    return {
        "id": rem.id,
        "company_id": rem.company_id,
        "creator_id": rem.creator_id,
        "creator_name": creator.name if creator else "System",
        "creator_role": creator_role_val,
        "title": rem.title,
        "description": rem.description,
        "reminder_type": rem_type_val,
        "priority": priority_val,
        "status": status_val,
        "scheduled_at": _ensure_utc(rem.scheduled_at),
        "end_at": _ensure_utc(rem.end_at),
        "meeting_link": rem.meeting_link,
        "location": rem.location,
        "related_entity_type": rem.related_entity_type,
        "related_entity_id": rem.related_entity_id,
        "related_entity_title": rem.related_entity_title,
        "created_at": _ensure_utc(rem.created_at),
        "updated_at": _ensure_utc(rem.updated_at),
        "attendees": attendees_data,
        "is_creator": rem.creator_id == current_user_id,
        "is_dismissed_by_me": my_attendee.is_dismissed if my_attendee else False,
        "is_due": is_due,
    }


# ─── GET /api/reminders/organization-users ───────────────────────────────────

@router.get("/organization-users")
def get_organization_colleagues(
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Returns active colleagues in current user's organization for meeting scheduling."""
    query = db.query(models.User).filter(models.User.is_active == True)
    if not tenant.is_super_admin:
        query = query.filter(models.User.company_id == tenant.organization_id)

    users = query.order_by(models.User.name.asc()).all()
    results = []
    for u in users:
        role_val = u.role.value if hasattr(u.role, "value") else str(u.role)
        results.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": role_val,
            "company_id": u.company_id,
        })
    return results


# ─── GET /api/reminders/due (Side Popup Notification Polling) ────────────────

@router.get("/due")
def get_due_reminders(
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Returns active reminders that are currently due for the user (scheduled_at <= now + 5 mins)
    and not yet dismissed by the current user. Used for real-time side popup notifications.
    """
    now = datetime.utcnow()
    # Looking for reminders scheduled up to 10 minutes ahead and not older than 24h
    window_future = now + timedelta(minutes=10)
    window_past = now - timedelta(hours=24)

    # Reminders where user is an attendee and has not dismissed it
    query = (
        db.query(models.Reminder)
        .join(models.ReminderAttendee, models.Reminder.id == models.ReminderAttendee.reminder_id)
        .filter(
            models.ReminderAttendee.user_id == current_user.id,
            models.ReminderAttendee.is_dismissed == False,
            models.Reminder.status == models.ReminderStatus.SCHEDULED,
            models.Reminder.scheduled_at <= window_future,
            models.Reminder.scheduled_at >= window_past,
        )
    )

    if not tenant.is_super_admin and tenant.organization_id is not None:
        query = query.filter(models.Reminder.company_id == tenant.organization_id)

    due_items = query.order_by(models.Reminder.scheduled_at.asc()).all()
    return [_build_reminder_response(rem, current_user.id) for rem in due_items]


# ─── GET /api/reminders/today ────────────────────────────────────────────────

@router.get("/today")
def get_today_reminders(
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Returns meetings and tasks scheduled for today (server UTC date bounds)."""
    now = datetime.utcnow()
    start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0)
    end_of_day = start_of_day + timedelta(days=1)

    query = (
        db.query(models.Reminder)
        .join(models.ReminderAttendee, models.Reminder.id == models.ReminderAttendee.reminder_id)
        .filter(
            models.ReminderAttendee.user_id == current_user.id,
            models.Reminder.scheduled_at >= start_of_day,
            models.Reminder.scheduled_at < end_of_day,
        )
    )

    if not tenant.is_super_admin and tenant.organization_id is not None:
        query = query.filter(models.Reminder.company_id == tenant.organization_id)

    items = query.order_by(models.Reminder.scheduled_at.asc()).all()
    return [_build_reminder_response(rem, current_user.id) for rem in items]


# ─── GET /api/reminders/ (List Reminders) ────────────────────────────────────

@router.get("/")
def list_reminders(
    type: Optional[str] = Query(None, description="meeting, task, deal_call, reminder"),
    status: Optional[str] = Query(None, description="scheduled, completed, cancelled, all"),
    scope: Optional[str] = Query("all", description="all, today, upcoming, past, my_tasks"),
    limit: int = Query(100, ge=1, le=500),
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Lists meetings, tasks, and reminders for the current user and their organization."""
    now = datetime.utcnow()
    query = db.query(models.Reminder)

    if not tenant.is_super_admin and tenant.organization_id is not None:
        query = query.filter(models.Reminder.company_id == tenant.organization_id)

    # User visibility filter:
    # Admin/Super Admin can see all in org; Managers/Employees see items where they are creator OR attendee
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]:
        query = query.join(models.ReminderAttendee, models.Reminder.id == models.ReminderAttendee.reminder_id)
        query = query.filter(
            or_(
                models.Reminder.creator_id == current_user.id,
                models.ReminderAttendee.user_id == current_user.id,
            )
        ).distinct()

    # Filter by reminder_type
    if type:
        query = query.filter(models.Reminder.reminder_type == type)

    # Filter by status
    if status and status != "all":
        query = query.filter(models.Reminder.status == status)

    # Scope filtering
    if scope == "today":
        start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0)
        end_of_day = start_of_day + timedelta(days=1)
        query = query.filter(models.Reminder.scheduled_at >= start_of_day, models.Reminder.scheduled_at < end_of_day)
    elif scope == "upcoming":
        query = query.filter(
            models.Reminder.scheduled_at >= (now - timedelta(hours=1)),
            models.Reminder.status == models.ReminderStatus.SCHEDULED,
        )
    elif scope == "past":
        query = query.filter(models.Reminder.scheduled_at < now)
    elif scope == "my_tasks":
        query = query.filter(models.Reminder.reminder_type == models.ReminderType.TASK)

    items = query.order_by(models.Reminder.scheduled_at.asc()).limit(limit).all()
    return [_build_reminder_response(rem, current_user.id) for rem in items]


# ─── POST /api/reminders/ (Create Meeting / Task / Reminder) ────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_reminder(
    data: schemas.ReminderCreate,
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Creates a new meeting, daily task, deal call, or reminder.
    Admin & Manager can invite colleagues across their organization.
    """
    # Parse reminder type
    try:
        rem_type = models.ReminderType(data.reminder_type or "meeting")
    except ValueError:
        rem_type = models.ReminderType.MEETING

    # Parse priority
    try:
        rem_priority = models.ReminderPriority(data.priority or "medium")
    except ValueError:
        rem_priority = models.ReminderPriority.MEDIUM

    reminder = models.Reminder(
        company_id=current_user.company_id,
        creator_id=current_user.id,
        title=data.title.strip(),
        description=data.description,
        reminder_type=rem_type,
        priority=rem_priority,
        status=models.ReminderStatus.SCHEDULED,
        scheduled_at=_to_naive_utc(data.scheduled_at),
        end_at=_to_naive_utc(data.end_at),
        meeting_link=data.meeting_link,
        location=data.location,
        related_entity_type=data.related_entity_type,
        related_entity_id=data.related_entity_id,
        related_entity_title=data.related_entity_title,
    )
    db.add(reminder)
    db.flush()

    # Determine attendees:
    # Always include creator
    attendee_id_set = set(data.attendee_ids or [])
    attendee_id_set.add(current_user.id)

    # Validate that all attendee IDs belong to the same organization (unless super_admin)
    if not tenant.is_super_admin and tenant.organization_id is not None:
        valid_users = (
            db.query(models.User.id)
            .filter(
                models.User.id.in_(list(attendee_id_set)),
                models.User.company_id == tenant.organization_id,
                models.User.is_active == True,
            )
            .all()
        )
        attendee_id_set = {u.id for u in valid_users}
        attendee_id_set.add(current_user.id)

    for uid in attendee_id_set:
        attendee = models.ReminderAttendee(
            reminder_id=reminder.id,
            user_id=uid,
            status="accepted" if uid == current_user.id else "invited",
            is_read=(uid == current_user.id),
            is_dismissed=False,
        )
        db.add(attendee)

    db.commit()
    db.refresh(reminder)

    return _build_reminder_response(reminder, current_user.id)


# ─── GET /api/reminders/{reminder_id} ───────────────────────────────────────

@router.get("/{reminder_id}")
def get_reminder(
    reminder_id: int,
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    tenant.enforce_ownership(reminder)
    return _build_reminder_response(reminder, current_user.id)


# ─── PATCH /api/reminders/{reminder_id} ─────────────────────────────────────

@router.patch("/{reminder_id}")
def update_reminder(
    reminder_id: int,
    data: schemas.ReminderUpdate,
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    tenant.enforce_ownership(reminder)

    # Permission check: Creator or Admin/Manager can edit
    can_edit = (
        reminder.creator_id == current_user.id
        or current_user.role in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN, models.UserRole.MANAGER]
    )
    if not can_edit:
        raise HTTPException(status_code=403, detail="Not authorized to edit this reminder")

    if data.title is not None:
        reminder.title = data.title.strip()
    if data.description is not None:
        reminder.description = data.description
    if data.reminder_type is not None:
        try:
            reminder.reminder_type = models.ReminderType(data.reminder_type)
        except ValueError:
            pass
    if data.priority is not None:
        try:
            reminder.priority = models.ReminderPriority(data.priority)
        except ValueError:
            pass
    if data.status is not None:
        try:
            reminder.status = models.ReminderStatus(data.status)
        except ValueError:
            pass
    if data.scheduled_at is not None:
        reminder.scheduled_at = _to_naive_utc(data.scheduled_at)
        # Reset dismissed flag if rescheduled into future
        for att in reminder.attendees:
            att.is_dismissed = False
    if data.end_at is not None:
        reminder.end_at = _to_naive_utc(data.end_at)
    if data.meeting_link is not None:
        reminder.meeting_link = data.meeting_link
    if data.location is not None:
        reminder.location = data.location
    if data.related_entity_type is not None:
        reminder.related_entity_type = data.related_entity_type
    if data.related_entity_id is not None:
        reminder.related_entity_id = data.related_entity_id
    if data.related_entity_title is not None:
        reminder.related_entity_title = data.related_entity_title

    # Update attendees if attendee_ids provided
    if data.attendee_ids is not None:
        existing_att_map = {a.user_id: a for a in reminder.attendees}
        target_ids = set(data.attendee_ids)
        target_ids.add(reminder.creator_id)

        # Remove attendees not in target_ids
        for uid, att in list(existing_att_map.items()):
            if uid not in target_ids:
                db.delete(att)

        # Add new attendees
        for uid in target_ids:
            if uid not in existing_att_map:
                new_att = models.ReminderAttendee(
                    reminder_id=reminder.id,
                    user_id=uid,
                    status="invited",
                    is_dismissed=False,
                )
                db.add(new_att)

    reminder.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(reminder)

    return _build_reminder_response(reminder, current_user.id)


# ─── DELETE /api/reminders/{reminder_id} ───────────────────────────────────

@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    tenant.enforce_ownership(reminder)

    can_delete = (
        reminder.creator_id == current_user.id
        or current_user.role in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN]
    )
    if not can_delete:
        raise HTTPException(status_code=403, detail="Not authorized to delete this reminder")

    db.delete(reminder)
    db.commit()
    return {"message": "Reminder deleted successfully"}


# ─── POST /api/reminders/{reminder_id}/dismiss (Dismiss Popup) ──────────────

@router.post("/{reminder_id}/dismiss")
def dismiss_reminder_popup(
    reminder_id: int,
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Marks the reminder popup as dismissed for current user so it stops alerting them."""
    attendee = (
        db.query(models.ReminderAttendee)
        .filter(
            models.ReminderAttendee.reminder_id == reminder_id,
            models.ReminderAttendee.user_id == current_user.id,
        )
        .first()
    )
    if not attendee:
        # If user is not yet an attendee, add them as dismissed
        attendee = models.ReminderAttendee(
            reminder_id=reminder_id,
            user_id=current_user.id,
            status="accepted",
            is_dismissed=True,
            dismissed_at=datetime.utcnow(),
        )
        db.add(attendee)
    else:
        attendee.is_dismissed = True
        attendee.dismissed_at = datetime.utcnow()

    db.commit()
    return {"message": "Reminder popup dismissed", "reminder_id": reminder_id}


# ─── POST /api/reminders/{reminder_id}/complete ─────────────────────────────

@router.post("/{reminder_id}/complete")
def complete_reminder(
    reminder_id: int,
    current_user: models.User = Depends(get_current_active_user),
    tenant: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Marks task or meeting as completed."""
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    tenant.enforce_ownership(reminder)

    reminder.status = models.ReminderStatus.COMPLETED
    reminder.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(reminder)

    return _build_reminder_response(reminder, current_user.id)
