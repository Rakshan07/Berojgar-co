import re
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, and_, or_

from backend.app.models.event import Event, EventCategory, EventRequirement, EventRole, EventRegistration
from backend.app.schemas.event import EventCreate, EventUpdate, EventRequirementCreate, EventRoleCreate

def slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug[:100]

class EventService:
    def __init__(self, db: Session):
        self.db = db

    def list_categories(self) -> List[EventCategory]:
        return list(self.db.scalars(select(EventCategory).order_by(EventCategory.name)).all())

    def create_event(self, organizer_id: uuid.UUID, req: EventCreate) -> Event:
        # Validate dates
        if req.end_date < req.start_date:
            raise ValueError("Event end_date must be greater than or equal to start_date")
        if req.registration_deadline > req.end_date:
            raise ValueError("Registration deadline cannot be after event end_date")
        if req.min_team_size > req.max_team_size:
            raise ValueError("min_team_size cannot exceed max_team_size")

        # Ensure category exists or create custom
        cat = self.db.get(EventCategory, req.category_id)
        if not cat:
            cat = EventCategory(
                id=req.category_id,
                name=req.category_id.capitalize(),
                is_custom=True
            )
            self.db.add(cat)
            self.db.flush()

        base_slug = slugify(req.title)
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

        event = Event(
            title=req.title,
            slug=slug,
            category_id=cat.id,
            description=req.description,
            organizer_id=organizer_id,
            mode=req.mode,
            location=req.location,
            min_team_size=req.min_team_size,
            max_team_size=req.max_team_size,
            start_date=req.start_date,
            end_date=req.end_date,
            registration_deadline=req.registration_deadline,
            max_participants=req.max_participants,
            status="draft",
            tags=req.tags,
        )
        self.db.add(event)
        self.db.flush()

        # Add requirements
        for r in req.requirements:
            req_item = EventRequirement(
                event_id=event.id,
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
            self.db.add(req_item)

        # Add roles
        for rl in req.roles:
            role_item = EventRole(
                event_id=event.id,
                name=rl.name,
                description=rl.description,
                suggested_count=rl.suggested_count
            )
            self.db.add(role_item)

        self.db.commit()
        self.db.refresh(event)
        return event

    def get_event(self, event_id: uuid.UUID) -> Optional[Event]:
        return self.db.scalars(
            select(Event)
            .options(
                joinedload(Event.category),
                joinedload(Event.requirements),
                joinedload(Event.roles),
                joinedload(Event.organizer)
            )
            .where(Event.id == event_id)
        ).first()

    def update_event(self, event_id: uuid.UUID, organizer_id: uuid.UUID, req: EventUpdate) -> Event:
        event = self.get_event(event_id)
        if not event:
            raise ValueError("Event not found")
        if event.organizer_id != organizer_id:
            raise PermissionError("Only the event organizer can update this event")

        data = req.model_dump(exclude_unset=True)
        for key, val in data.items():
            if val is not None:
                setattr(event, key, val)

        # Re-validate dates if changed
        if event.end_date < event.start_date:
            raise ValueError("Event end_date must be greater than or equal to start_date")
        if event.registration_deadline > event.end_date:
            raise ValueError("Registration deadline cannot be after event end_date")

        self.db.commit()
        self.db.refresh(event)
        return event

    def publish_event(self, event_id: uuid.UUID, organizer_id: uuid.UUID) -> Event:
        event = self.get_event(event_id)
        if not event:
            raise ValueError("Event not found")
        if event.organizer_id != organizer_id:
            raise PermissionError("Only the event organizer can publish this event")

        event.status = "open"
        self.db.commit()
        self.db.refresh(event)
        return event

    def list_events(
        self,
        category_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        organizer_id: Optional[uuid.UUID] = None,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[Event], int]:
        query = select(Event).options(
            joinedload(Event.category),
            joinedload(Event.requirements),
            joinedload(Event.roles),
            joinedload(Event.organizer)
        )

        filters = []
        if category_id:
            filters.append(Event.category_id == category_id)
        if status:
            filters.append(Event.status == status)
        if organizer_id:
            filters.append(Event.organizer_id == organizer_id)
        if search:
            filters.append(
                or_(
                    Event.title.ilike(f"%{search}%"),
                    Event.description.ilike(f"%{search}%")
                )
            )

        if filters:
            query = query.where(and_(*filters))

        count_query = select(func.count(Event.id))
        if filters:
            count_query = count_query.where(and_(*filters))
        total = self.db.scalar(count_query) or 0

        offset = (page - 1) * limit
        events = list(self.db.scalars(query.order_by(Event.start_date.desc()).offset(offset).limit(limit)).unique().all())
        return events, total

    def add_requirement(self, event_id: uuid.UUID, req: EventRequirementCreate) -> EventRequirement:
        item = EventRequirement(
            event_id=event_id,
            skill_name=req.skill_name,
            skill_id=req.skill_id,
            category=req.category,
            required=req.required,
            min_proficiency=req.min_proficiency,
            target_count=req.target_count,
            priority=req.priority,
            role_association=req.role_association,
            is_custom=req.is_custom
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item
