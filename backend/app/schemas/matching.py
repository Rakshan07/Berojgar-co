import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class MatchingRunCreate(BaseModel):
    algorithm_version: Optional[str] = "teamweave-v1-greedy-complementary"
    target_team_size: Optional[int] = None
    strict_availability: Optional[bool] = False

class ProposedMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: Optional[str] = None
    suggested_role: str
    is_approved: bool = False
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True

class MatchExplanationResponse(BaseModel):
    requirements_covered: List[Dict[str, Any]] = []
    partial_covered: List[Dict[str, Any]] = []
    missing_capabilities: List[Dict[str, Any]] = []
    member_contributions: List[Dict[str, Any]] = []
    coverage_notes: List[str] = []
    match_reasons: List[str] = []
    unassigned_participants: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class ProposedTeamResponse(BaseModel):
    id: uuid.UUID
    matching_run_id: uuid.UUID
    event_id: uuid.UUID
    team_name: str
    status: str
    coverage_score: float
    members: List[ProposedMemberResponse] = []
    explanation: Optional[MatchExplanationResponse] = None
    team_size_gap: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class MatchingRunResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    initiated_by: uuid.UUID
    algorithm_version: str
    status: str
    config_snapshot: Dict[str, Any] = {}
    summary: Dict[str, Any] = {}
    proposed_teams: List[ProposedTeamResponse] = []
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
