import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class TeamMemberResponse(BaseModel):
    membership_id: uuid.UUID
    user_id: uuid.UUID
    name: str
    role: str
    status: str
    skills: List[Dict[str, Any]] = []
    joined_at: datetime
    departed_at: Optional[datetime] = None
    departure_reason: Optional[str] = None

    class Config:
        from_attributes = True

class TeamResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    name: str
    status: str
    matching_run_id: Optional[uuid.UUID] = None
    members: List[TeamMemberResponse] = []
    created_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TeamBlueprintResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    name: str
    status: str
    members: List[Dict[str, Any]] = []
    coverage_notes: List[str] = []
    match_reasons: List[str] = []
    missing_requirements: List[Dict[str, Any]] = []
    team_size_gap: bool = False
    proposed_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

class MemberLeaveRequest(BaseModel):
    departure_reason: Optional[str] = "Participant withdrew or left the team"

class CandidateReplacement(BaseModel):
    candidate_id: uuid.UUID
    name: str
    score: float
    covered_gaps: List[Dict[str, Any]] = []
    impact_on_candidate_team: Optional[str] = None

class ReplacementRecommendationResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    departed_user_id: uuid.UUID
    departed_user_name: Optional[str] = None
    uncovered_requirements: List[Dict[str, Any]] = []
    candidates: List[CandidateReplacement] = []
    status: str
    created_at: datetime

class ApplyReplacementRequest(BaseModel):
    candidate_user_id: uuid.UUID
    assigned_role: Optional[str] = "Member"

class TeamMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class TeamMessageResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    user_id: uuid.UUID
    user_name: Optional[str] = None
    message: str
    created_at: datetime

    class Config:
        from_attributes = True
