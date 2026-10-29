import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user
from backend.app.models.auth import User
from backend.app.schemas.ai_integration import (
    ParticipantAIProfileAnalysis,
    EventAssessmentDetailResponse,
    AssessmentSuggestionsResponse,
    AssessmentSubmitPayload,
    AssessmentSubmitResult,
    EventProfileDetail,
    TeamRecommendationsResponse,
    TeamJoinRequestPayload,
    TeamLeaveRequestPayload,
    TeamActionResponse,
    TeamChatMessageItem,
    TeamChatPostPayload
)
from backend.app.services.ai_analysis_service import AIAnalysisService
from backend.app.services.event_assessment_service import EventAssessmentService
from backend.app.services.secondary_profile_service import SecondaryProfileService
from backend.app.services.intelligent_matching_service import IntelligentMatchingService
from backend.app.services.team_collaboration_service import TeamCollaborationService

router = APIRouter(tags=["AI Intelligence, Assessments & Team Collaboration"])

# ─────────────────────────────────────────────────────────────────────────────
# 1. Resume and GitHub Analysis
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/profiles/me/analyze-ai", response_model=ParticipantAIProfileAnalysis)
async def analyze_my_profile_with_ai(
    github_url: Optional[str] = Query(None, description="Optional GitHub URL or handle override"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyzes participant's uploaded resume (from hackloop.profile_documents) and public GitHub repositories."""
    service = AIAnalysisService(db)
    analysis = await service.analyze_participant_evidence(
        user_id=current_user.id,
        candidate_name=current_user.full_name or current_user.username,
        github_override=github_url
    )
    return ParticipantAIProfileAnalysis(**analysis)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Event-Specific Assessments
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/events/{event_id}/assessment", response_model=EventAssessmentDetailResponse)
async def get_or_create_event_assessment(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves or dynamically generates personalized event assessment questions using event criteria, resume, and GitHub."""
    service = EventAssessmentService(db)
    res = await service.get_or_generate_event_assessment(event_id=event_id, user_id=current_user.id)
    return EventAssessmentDetailResponse(**res)

# ─────────────────────────────────────────────────────────────────────────────
# 3. AI Answer Suggestions
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/events/{event_id}/assessment/suggestions", response_model=AssessmentSuggestionsResponse)
async def get_assessment_answer_suggestions(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Provides evidence-grounded AI suggestions for assessment questions. Never fabricates experience."""
    service = EventAssessmentService(db)
    res = await service.get_assessment_suggestions(event_id=event_id, user_id=current_user.id)
    return AssessmentSuggestionsResponse(**res)

@router.post("/events/{event_id}/assessment/submit", response_model=AssessmentSubmitResult)
async def submit_event_assessment(
    event_id: uuid.UUID,
    payload: AssessmentSubmitPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Saves assessment answers against participant and event, and automatically creates/refreshes secondary event profile."""
    service = EventAssessmentService(db)
    answers_data = [a.model_dump() for a in payload.answers]
    res = await service.submit_assessment(
        event_id=event_id,
        user_id=current_user.id,
        answers=answers_data
    )
    return AssessmentSubmitResult(**res)

# ─────────────────────────────────────────────────────────────────────────────
# 4. Secondary Event Profiles
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/events/{event_id}/event-profile", response_model=EventProfileDetail)
async def get_secondary_event_profile(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches participant's secondary event profile generated from primary profile, resume, GitHub, and assessment answers."""
    service = SecondaryProfileService(db)
    profile = await service.get_or_create_event_profile(
        event_id=event_id,
        user_id=current_user.id,
        force_refresh=False
    )
    return EventProfileDetail(**profile)

@router.post("/events/{event_id}/event-profile/generate", response_model=EventProfileDetail)
async def generate_or_refresh_secondary_event_profile(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Triggers or forces refresh of participant's secondary event profile."""
    service = SecondaryProfileService(db)
    profile = await service.get_or_create_event_profile(
        event_id=event_id,
        user_id=current_user.id,
        force_refresh=True
    )
    return EventProfileDetail(**profile)

# ─────────────────────────────────────────────────────────────────────────────
# 5 & 6. Intelligent Team Recommendations & Compatibility Calculation
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/events/{event_id}/team-recommendations", response_model=TeamRecommendationsResponse)
def get_intelligent_team_recommendations(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recommends teams with explainable compatibility scores. Never recommends for filled/unavailable roles."""
    service = IntelligentMatchingService(db)
    recs = service.recommend_teams_for_participant(
        event_id=event_id,
        user_id=current_user.id
    )
    return TeamRecommendationsResponse(**recs)

# ─────────────────────────────────────────────────────────────────────────────
# 7. Dynamic Team Membership
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/teams/{team_id}/join", response_model=TeamActionResponse)
def join_team(
    team_id: uuid.UUID,
    payload: Optional[TeamJoinRequestPayload] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Joins an event team for an available vacant role. Rejects if role is filled or team is full."""
    service = TeamCollaborationService(db)
    role = payload.requested_role if payload else None
    res = service.join_team(
        team_id=team_id,
        user_id=current_user.id,
        requested_role=role
    )
    return TeamActionResponse(**res)

@router.post("/teams/{team_id}/leave", response_model=TeamActionResponse)
def leave_team(
    team_id: uuid.UUID,
    payload: Optional[TeamLeaveRequestPayload] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leaves an event team. The role immediately becomes vacant again for new participant recommendations."""
    service = TeamCollaborationService(db)
    reason = payload.departure_reason if payload else "Participant left team"
    res = service.leave_team(
        team_id=team_id,
        user_id=current_user.id,
        departure_reason=reason
    )
    return TeamActionResponse(**res)

# ─────────────────────────────────────────────────────────────────────────────
# 8. Team Chat Integration
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/teams/{team_id}/messages", response_model=List[TeamChatMessageItem])
def get_team_chat_messages(
    team_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves team messages. Access is strictly restricted to authorized active team members."""
    service = TeamCollaborationService(db)
    user_role_ids = [r.id for r in current_user.roles]
    messages = service.get_team_messages(
        team_id=team_id,
        user_id=current_user.id,
        roles=user_role_ids
    )
    return [TeamChatMessageItem(**m) for m in messages]

@router.post("/teams/{team_id}/messages", response_model=TeamChatMessageItem)
def post_team_chat_message(
    team_id: uuid.UUID,
    payload: TeamChatPostPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Posts a message to team chat. Access is strictly restricted to authorized active team members."""
    service = TeamCollaborationService(db)
    user_role_ids = [r.id for r in current_user.roles]
    msg = service.post_team_message(
        team_id=team_id,
        user_id=current_user.id,
        roles=user_role_ids,
        message_text=payload.message
    )
    return TeamChatMessageItem(**msg)
