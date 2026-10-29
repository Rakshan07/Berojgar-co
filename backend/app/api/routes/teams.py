import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.team_service import TeamService
from backend.app.services.replacement_service import ReplacementService
from backend.app.schemas.team import (
    TeamResponse,
    TeamMemberResponse,
    TeamBlueprintResponse,
    MemberLeaveRequest,
    ReplacementRecommendationResponse,
    ApplyReplacementRequest,
    TeamMessageCreate,
    TeamMessageResponse,
)
from backend.app.api.dependencies import get_current_user, require_role
from backend.app.models.auth import User

router = APIRouter(prefix="/teams", tags=["Teams, Blueprints & Replacements"])

@router.get("/{team_id}", response_model=TeamResponse)
def get_team_detail(team_id: uuid.UUID, db: Session = Depends(get_db)):
    service = TeamService(db)
    team = service.get_team(team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    members = [
        TeamMemberResponse(
            membership_id=m.id,
            user_id=m.user_id,
            name=m.user.full_name if m.user else "",
            role=m.role,
            status=m.status,
            skills=[],
            joined_at=m.joined_at,
            departed_at=m.departed_at,
            departure_reason=m.departure_reason
        )
        for m in team.memberships
    ]
    return TeamResponse(
        id=team.id,
        event_id=team.event_id,
        name=team.name,
        status=team.status,
        matching_run_id=team.matching_run_id,
        members=members,
        created_at=team.created_at,
        published_at=team.published_at
    )

@router.get("/{team_id}/blueprint", response_model=TeamBlueprintResponse)
def get_team_blueprint(team_id: uuid.UUID, db: Session = Depends(get_db)):
    service = TeamService(db)
    blueprint = service.get_team_blueprint(team_id)
    if not blueprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return blueprint

@router.post("/{team_id}/members/{membership_id}/leave", response_model=TeamMemberResponse)
def record_member_departure(
    team_id: uuid.UUID,
    membership_id: uuid.UUID,
    req: MemberLeaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        service = ReplacementService(db)
        membership = service.record_member_departure(
            team_id=team_id,
            membership_id=membership_id,
            actor_id=current_user.id,
            departure_reason=req.departure_reason
        )
        return TeamMemberResponse(
            membership_id=membership.id,
            user_id=membership.user_id,
            name=membership.user.full_name if membership.user else "",
            role=membership.role,
            status=membership.status,
            skills=[],
            joined_at=membership.joined_at,
            departed_at=membership.departed_at,
            departure_reason=membership.departure_reason
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{team_id}/replacement-recommendations", response_model=ReplacementRecommendationResponse)
def request_replacement_recommendations(
    team_id: uuid.UUID,
    departed_user_id: uuid.UUID,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = ReplacementService(db)
        return service.generate_recommendations(
            team_id=team_id,
            departed_user_id=departed_user_id,
            actor_id=current_user.id
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/{team_id}/replacements/{recommendation_id}/apply", response_model=TeamMemberResponse)
def apply_replacement(
    team_id: uuid.UUID,
    recommendation_id: uuid.UUID,
    req: ApplyReplacementRequest,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = ReplacementService(db)
        m = service.apply_replacement(
            team_id=team_id,
            recommendation_id=recommendation_id,
            candidate_user_id=req.candidate_user_id,
            assigned_role=req.assigned_role,
            actor_id=current_user.id
        )
        return TeamMemberResponse(
            membership_id=m.id,
            user_id=m.user_id,
            name=m.user.full_name if m.user else "",
            role=m.role,
            status=m.status,
            skills=[],
            joined_at=m.joined_at,
            departed_at=m.departed_at,
            departure_reason=m.departure_reason
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

from backend.app.services.team_collaboration_service import TeamCollaborationService
from backend.app.schemas.ai_integration import TeamJoinRequestPayload, TeamLeaveRequestPayload, TeamActionResponse

@router.post("/{team_id}/join", response_model=TeamActionResponse)
def join_team(
    team_id: uuid.UUID,
    payload: Optional[TeamJoinRequestPayload] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = TeamCollaborationService(db)
    role = payload.requested_role if payload else None
    res = service.join_team(team_id=team_id, user_id=current_user.id, requested_role=role)
    return TeamActionResponse(**res)

@router.post("/{team_id}/leave", response_model=TeamActionResponse)
def leave_team(
    team_id: uuid.UUID,
    payload: Optional[TeamLeaveRequestPayload] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = TeamCollaborationService(db)
    reason = payload.departure_reason if payload else "Participant left team"
    res = service.leave_team(team_id=team_id, user_id=current_user.id, departure_reason=reason)
    return TeamActionResponse(**res)

@router.post("/{team_id}/messages", response_model=TeamMessageResponse)
def post_team_message(
    team_id: uuid.UUID,
    req: TeamMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = TeamCollaborationService(db)
    user_role_ids = [r.id for r in current_user.roles]
    msg = service.post_team_message(
        team_id=team_id,
        user_id=current_user.id,
        roles=user_role_ids,
        message_text=req.message
    )
    return TeamMessageResponse(
        id=msg["id"],
        team_id=msg["team_id"],
        user_id=msg["user_id"],
        user_name=msg["user_name"],
        message=msg["message"],
        created_at=msg["created_at"]
    )

@router.get("/{team_id}/messages", response_model=List[TeamMessageResponse])
def get_team_messages(
    team_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = TeamCollaborationService(db)
    user_role_ids = [r.id for r in current_user.roles]
    messages = service.get_team_messages(
        team_id=team_id,
        user_id=current_user.id,
        roles=user_role_ids
    )
    return [
        TeamMessageResponse(
            id=m["id"],
            team_id=m["team_id"],
            user_id=m["user_id"],
            user_name=m.get("user_name") or "",
            message=m["message"],
            created_at=m["created_at"]
        )
        for m in messages
    ]

