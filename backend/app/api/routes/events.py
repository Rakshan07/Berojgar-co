import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.event_service import EventService
from backend.app.services.registration_service import RegistrationService
from backend.app.schemas.event import (
    EventCreate,
    EventUpdate,
    EventResponse,
    EventCategoryResponse,
    EventRegistrationCreate,
    EventRegistrationResponse,
    EventRequirementCreate,
    EventRequirementResponse,
)
from backend.app.schemas.common import PaginatedResponse, MessageResponse
from backend.app.api.dependencies import get_current_user, require_role
from backend.app.models.auth import User

router = APIRouter(prefix="/events", tags=["Events & Registrations"])

def map_event_response(event) -> EventResponse:
    reg_count = len([r for r in event.registrations if r.status == "registered"]) if event.registrations else 0
    return EventResponse(
        id=event.id,
        title=event.title,
        slug=event.slug,
        category_id=event.category_id,
        category_name=event.category.name if event.category else event.category_id,
        category_color=event.category.color if event.category else "violet",
        description=event.description,
        organizer_id=event.organizer_id,
        organizer_name=event.organizer.full_name if event.organizer else None,
        organization_id=event.organization_id,
        mode=event.mode,
        location=event.location,
        min_team_size=event.min_team_size,
        max_team_size=event.max_team_size,
        start_date=event.start_date,
        end_date=event.end_date,
        registration_deadline=event.registration_deadline,
        max_participants=event.max_participants,
        registered_count=reg_count,
        status=event.status,
        tags=event.tags or [],
        requirements=[
            EventRequirementResponse(
                id=r.id,
                event_id=r.event_id,
                skill_name=r.skill_name,
                skill_id=r.skill_id,
                category=r.category,
                required=r.required,
                min_proficiency=r.min_proficiency,
                target_count=r.target_count,
                priority=r.priority,
                role_association=r.role_association,
                is_custom=r.is_custom
            )
            for r in event.requirements
        ],
        roles=[],
        created_at=event.created_at,
        updated_at=event.updated_at
    )

@router.get("/categories", response_model=List[EventCategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    service = EventService(db)
    return service.list_categories()

@router.get("", response_model=PaginatedResponse[EventResponse])
def list_events(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    service = EventService(db)
    events, total = service.list_events(
        category_id=category,
        status=status,
        search=search,
        page=page,
        limit=limit
    )
    items = [map_event_response(e) for e in events]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_more=(page * limit) < total
    )

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    req: EventCreate,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = EventService(db)
        event = service.create_event(current_user.id, req)
        return map_event_response(event)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{event_id}", response_model=EventResponse)
def get_event_detail(event_id: uuid.UUID, db: Session = Depends(get_db)):
    service = EventService(db)
    event = service.get_event(event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return map_event_response(event)

@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: uuid.UUID,
    req: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        service = EventService(db)
        event = service.update_event(event_id, current_user.id, req)
        return map_event_response(event)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{event_id}/publish", response_model=EventResponse)
def publish_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        service = EventService(db)
        event = service.publish_event(event_id, current_user.id)
        return map_event_response(event)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{event_id}/register", response_model=EventRegistrationResponse)
def register_for_event(
    event_id: uuid.UUID,
    req: EventRegistrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        service = RegistrationService(db)
        reg = service.register(event_id, current_user.id, req)
        return EventRegistrationResponse(
            id=reg.id,
            event_id=reg.event_id,
            user_id=reg.user_id,
            user_name=current_user.full_name,
            user_email=current_user.email,
            status=reg.status,
            preferred_roles=reg.preferred_roles,
            registered_at=reg.registered_at,
            withdrawn_at=reg.withdrawn_at
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{event_id}/withdraw", response_model=EventRegistrationResponse)
def withdraw_registration(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        service = RegistrationService(db)
        reg = service.withdraw(event_id, current_user.id)
        return EventRegistrationResponse(
            id=reg.id,
            event_id=reg.event_id,
            user_id=reg.user_id,
            user_name=current_user.full_name,
            user_email=current_user.email,
            status=reg.status,
            preferred_roles=reg.preferred_roles,
            registered_at=reg.registered_at,
            withdrawn_at=reg.withdrawn_at
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{event_id}/participants", response_model=List[EventRegistrationResponse])
def list_event_participants(
    event_id: uuid.UUID,
    status: Optional[str] = "registered",
    db: Session = Depends(get_db)
):
    service = RegistrationService(db)
    registrations = service.list_registrations(event_id, status=status)
    return [
        EventRegistrationResponse(
            id=r.id,
            event_id=r.event_id,
            user_id=r.user_id,
            user_name=r.user.full_name if r.user else None,
            user_email=r.user.email if r.user else None,
            status=r.status,
            preferred_roles=r.preferred_roles or [],
            registered_at=r.registered_at,
            withdrawn_at=r.withdrawn_at
        )
        for r in registrations
    ]

@router.post("/{event_id}/requirements", response_model=EventRequirementResponse)
def add_event_requirement(
    event_id: uuid.UUID,
    req: EventRequirementCreate,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    service = EventService(db)
    item = service.add_requirement(event_id, req)
    return EventRequirementResponse(
        id=item.id,
        event_id=item.event_id,
        skill_name=item.skill_name,
        skill_id=item.skill_id,
        category=item.category,
        required=item.required,
        min_proficiency=item.min_proficiency,
        target_count=item.target_count,
        priority=item.priority,
        role_association=item.role_association,
        is_custom=item.is_custom
    )
