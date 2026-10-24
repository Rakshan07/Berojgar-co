import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base

class MatchingRun(Base):
    __tablename__ = "matching_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.events.id", ondelete="CASCADE"), nullable=False, index=True)
    initiated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.users.id", ondelete="RESTRICT"), nullable=False)
    algorithm_version: Mapped[str] = mapped_column(String(100), default="teamweave-v1-greedy-complementary", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False) # 'pending', 'processing', 'completed', 'approved', 'rejected', 'failed'
    config_snapshot: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    summary: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    event: Mapped["Event"] = relationship("Event")
    initiator: Mapped["User"] = relationship("User")
    proposed_teams: Mapped[List["ProposedTeam"]] = relationship("ProposedTeam", back_populates="matching_run", cascade="all, delete-orphan")

class ProposedTeam(Base):
    __tablename__ = "proposed_teams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matching_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.matching_runs.id", ondelete="CASCADE"), nullable=False)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.events.id", ondelete="CASCADE"), nullable=False)
    team_name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="proposed", nullable=False) # 'proposed', 'approved', 'rejected', 'modified'
    coverage_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    matching_run: Mapped["MatchingRun"] = relationship("MatchingRun", back_populates="proposed_teams")
    members: Mapped[List["ProposedMemberAssignment"]] = relationship("ProposedMemberAssignment", back_populates="proposed_team", cascade="all, delete-orphan")
    explanation: Mapped[Optional["MatchExplanation"]] = relationship("MatchExplanation", back_populates="proposed_team", uselist=False, cascade="all, delete-orphan")

class ProposedMemberAssignment(Base):
    __tablename__ = "proposed_member_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposed_team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.proposed_teams.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.users.id", ondelete="CASCADE"), nullable=False)
    suggested_role: Mapped[str] = mapped_column(String(100), default="Member", nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    proposed_team: Mapped["ProposedTeam"] = relationship("ProposedTeam", back_populates="members")
    user: Mapped["User"] = relationship("User")

class MatchExplanation(Base):
    __tablename__ = "match_explanations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposed_team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hackloop.proposed_teams.id", ondelete="CASCADE"), unique=True, nullable=False)
    requirements_covered: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    partial_covered: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    missing_capabilities: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    member_contributions: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    coverage_notes: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    match_reasons: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    unassigned_participants: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    proposed_team: Mapped["ProposedTeam"] = relationship("ProposedTeam", back_populates="explanation")
