import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base

class AIEventSetup(Base):
    __tablename__ = "ai_event_setups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.events.id", ondelete="CASCADE"), nullable=False)
    organizer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.users.id", ondelete="RESTRICT"), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False) # 'mock', 'openai', 'gemini', 'anthropic'
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), default="v1", nullable=False)
    request_context: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    suggested_roles: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    suggested_requirements: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    suggested_questions: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False) # 'pending', 'generated', 'approved', 'rejected', 'failed'
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    event: Mapped["Event"] = relationship("Event")
    organizer: Mapped["User"] = relationship("User")
