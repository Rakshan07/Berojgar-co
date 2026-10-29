import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ── 1. Resume and GitHub Analysis Schemas ──
class GitHubRepoSummary(BaseModel):
    name: str
    description: Optional[str] = None
    language: Optional[str] = None
    topics: List[str] = []
    stars: int = 0
    updated_at: Optional[str] = None

class GitHubContributionEvidence(BaseModel):
    repo_name: str
    primary_language: Optional[str] = None
    technologies: List[str] = []
    contribution_summary: str
    evidence_quote: str

class ParticipantAIProfileAnalysis(BaseModel):
    participant_id: uuid.UUID
    candidate_name: str
    github_username: Optional[str] = None
    resume_found: bool = False
    github_accessible: bool = False
    extracted_skills: List[Dict[str, Any]] = []
    project_contributions: List[GitHubContributionEvidence] = []
    strengths: List[str] = []
    summary: str
    provider: str
    model: str

# ── 2. Event-Specific Assessment Schemas ──
class AssessmentQuestionDetail(BaseModel):
    id: uuid.UUID
    order_index: int
    question_text: str
    question_type: str = "multiple_choice" # 'multiple_choice' or 'open_text'
    skill_target: Optional[str] = None
    category: Optional[str] = "skill_assessment" # 'skill_assessment' or 'teamwork_personality'
    options: Optional[List[str]] = None

class EventAssessmentDetailResponse(BaseModel):
    assessment_id: uuid.UUID
    event_id: uuid.UUID
    event_title: str
    title: str
    description: Optional[str] = None
    questions: List[AssessmentQuestionDetail] = []
    already_submitted: bool = False
    submission_id: Optional[uuid.UUID] = None

# ── 3. AI Answer Suggestions Schemas ──
class QuestionAnswerSuggestion(BaseModel):
    question_id: uuid.UUID
    question_text: str
    suggested_answer: Optional[str] = None
    evidence_found: bool = False
    evidence_source: Optional[str] = None
    confidence: float = 0.0
    is_verified: bool = False
    explanation: str

class AssessmentSuggestionsResponse(BaseModel):
    event_id: uuid.UUID
    participant_id: uuid.UUID
    suggestions: List[QuestionAnswerSuggestion] = []
    evidence_summary: str
    note: str = "AI suggestions are grounded exclusively in your verified resume and GitHub projects. Please review, edit, or write your own answers before submitting."

class AssessmentAnswerSubmissionItem(BaseModel):
    question_id: uuid.UUID
    answer_text: str

class AssessmentSubmitPayload(BaseModel):
    answers: List[AssessmentAnswerSubmissionItem]

class AssessmentSubmitResult(BaseModel):
    submission_id: uuid.UUID
    assessment_id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    submitted_at: datetime
    answers_count: int
    event_profile_created: bool
    event_profile_id: Optional[uuid.UUID] = None

# ── 4. Secondary Event Profile Schemas ──
class EventProfileDetail(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    event_id: uuid.UUID
    summary: Optional[str] = None
    preferred_role: Optional[str] = None
    event_skills: List[Dict[str, Any]] = []
    strengths: List[str] = []
    growth_areas: List[str] = []
    contribution_areas: List[str] = []
    assessment_highlights: List[Dict[str, Any]] = []
    github_highlights: List[Dict[str, Any]] = []
    compatibility_bonus: float = 0.0
    generated_by: str = "ai_synthesis"
    model_used: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ── 5 & 6. Team Recommendations & Compatibility Schemas ──
class CompatibilityPillar(BaseModel):
    name: str
    weight: str
    score: float

class TeamRecommendationItem(BaseModel):
    team_id: uuid.UUID
    team_name: str
    event_id: uuid.UUID
    status: str
    current_members_count: int
    max_team_size: int
    vacant_roles: List[str] = []
    recommended_role: str
    compatibility_score: float # 0.0 to 100.0
    pillars: List[CompatibilityPillar] = []
    match_reasons: List[str] = []
    covered_skills: List[str] = []
    missing_requirements: List[Dict[str, Any]] = []
    coverage_notes: List[str] = []
    members: List[Dict[str, Any]] = []

class TeamRecommendationsResponse(BaseModel):
    event_id: uuid.UUID
    participant_id: uuid.UUID
    participant_name: str
    participant_preferred_role: Optional[str] = None
    recommendations_count: int
    recommendations: List[TeamRecommendationItem] = []

# ── 7 & 8. Dynamic Team Membership & Chat Schemas ──
class TeamJoinRequestPayload(BaseModel):
    requested_role: Optional[str] = None

class TeamLeaveRequestPayload(BaseModel):
    departure_reason: Optional[str] = "Participant withdrew from team"

class TeamActionResponse(BaseModel):
    success: bool
    team_id: uuid.UUID
    membership_id: Optional[uuid.UUID] = None
    user_id: uuid.UUID
    role: Optional[str] = None
    message: str
    active_members_count: int
    vacant_roles: List[str] = []

class TeamChatMessageItem(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    message: str
    created_at: datetime

class TeamChatPostPayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
