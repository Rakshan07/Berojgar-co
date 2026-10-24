import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from backend.app.models.event import Event, EventRegistration
from backend.app.schemas.event import EventRegistrationCreate

class RegistrationService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, event_id: uuid.UUID, user_id: uuid.UUID, req: EventRegistrationCreate) -> EventRegistration:
        # Lock event row with FOR UPDATE to prevent capacity race conditions
        event = self.db.scalars(
            select(Event).where(Event.id == event_id).with_for_update()
        ).first()

        if not event:
            raise ValueError("Event not found")

        if event.status not in ("open", "published"):
            raise ValueError(f"Event is not open for registration (status: {event.status})")

        now = datetime.now(timezone.utc)
        if event.registration_deadline < now:
            raise ValueError("Registration deadline for this event has passed")

        # Check existing registration
        existing = self.db.scalars(
            select(EventRegistration).where(
                EventRegistration.event_id == event_id,
                EventRegistration.user_id == user_id
            )
        ).first()

        if existing:
            if existing.status == "registered":
                raise ValueError("User is already registered for this event")
            # If previously withdrawn, reactivate
            existing.status = "registered"
            existing.withdrawn_at = None
            existing.preferred_roles = req.preferred_roles
            self.db.commit()
            self.db.refresh(existing)
            return existing

        # Count active registered participants
        active_count = self.db.scalar(
            select(func.count(EventRegistration.id)).where(
                EventRegistration.event_id == event_id,
                EventRegistration.status == "registered"
            )
        ) or 0

        if active_count >= event.max_participants:
            raise ValueError("Event registration capacity has been reached")

        reg = EventRegistration(
            event_id=event_id,
            user_id=user_id,
            status="registered",
            preferred_roles=req.preferred_roles
        )
        self.db.add(reg)
        self.db.commit()
        self.db.refresh(reg)
        return reg

    def withdraw(self, event_id: uuid.UUID, user_id: uuid.UUID) -> EventRegistration:
        reg = self.db.scalars(
            select(EventRegistration).where(
                EventRegistration.event_id == event_id,
                EventRegistration.user_id == user_id
            )
        ).first()

        if not reg or reg.status != "registered":
            raise ValueError("Active registration not found")

        reg.status = "withdrawn"
        reg.withdrawn_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(reg)
        return reg

    def list_registrations(self, event_id: uuid.UUID, status: Optional[str] = "registered") -> List[EventRegistration]:
        query = select(EventRegistration).options(
            joinedload(EventRegistration.user)
        ).where(EventRegistration.event_id == event_id)

        if status:
            query = query.where(EventRegistration.status == status)

        return list(self.db.scalars(query.order_by(EventRegistration.registered_at.asc())).all())
