import uuid
from datetime import datetime, timezone, time
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Time, ForeignKey, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base

class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.users.id", ondelete="CASCADE"), unique=True, nullable=False)
    tagline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    hours_per_week: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    availability_constraints: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    preferred_roles: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    interests: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    github_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", back_populates="profile")

class SkillCategory(Base):
    __tablename__ = "skill_categories"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    category_id: Mapped[str] = mapped_column(String(50), ForeignKey("hackloop.skill_categories.id", ondelete="RESTRICT"), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    category: Mapped["SkillCategory"] = relationship("SkillCategory")

class UserSkill(Base):
    __tablename__ = "user_skills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id: Mapped[str] = mapped_column(String(100), ForeignKey("hackloop.skills.id", ondelete="CASCADE"), nullable=False, index=True)
    proficiency: Mapped[int] = mapped_column(Integer, nullable=False) # 1=Exploring, 2=Developing, 3=Independent, 4=Advanced
    is_self_declared: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_assessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", back_populates="skills")
    skill: Mapped["Skill"] = relationship("Skill")

class ParticipantAvailability(Base):
    __tablename__ = "participant_availability"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.users.id", ondelete="CASCADE"), nullable=False)
    event_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    day_of_week: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # 0=Sun, 6=Sat
    start_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    is_busy: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class EventProfile(Base):
    __tablename__ = "event_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.users.id", ondelete="CASCADE"), nullable=False)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.events.id", ondelete="CASCADE"), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preferred_role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    event_skills: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    strengths: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    growth_areas: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    contribution_areas: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    assessment_highlights: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    github_highlights: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    compatibility_bonus: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    generated_by: Mapped[str] = mapped_column(String(50), default="ai", nullable=False)
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

