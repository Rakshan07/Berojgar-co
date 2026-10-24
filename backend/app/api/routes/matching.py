import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.matching_service import MatchingService
from backend.app.schemas.matching import (
    MatchingRunCreate,
    MatchingRunResponse,
    ProposedTeamResponse,
    ProposedMemberResponse,
    MatchExplanationResponse,
)
from backend.app.schemas.team import TeamResponse, TeamMemberResponse
from backend.app.api.dependencies import get_current_user, require_role
from backend.app.models.auth import User

router = APIRouter(tags=["Matching Engine"])

def map_matching_run_response(run) -> MatchingRunResponse:
    proposed_teams = []
    for pt in run.proposed_teams:
        members = [
            ProposedMemberResponse(
                id=m.id,
                user_id=m.user_id,
                name=m.user.full_name if m.user else None,
                suggested_role=m.suggested_role,
                is_approved=m.is_approved,
                rejection_reason=m.rejection_reason
            )
            for m in pt.members
        ]
        explanation = None
        if pt.explanation:
            explanation = MatchExplanationResponse(
                requirements_covered=pt.explanation.requirements_covered,
                partial_covered=pt.explanation.partial_covered,
                missing_capabilities=pt.explanation.missing_capabilities,
                member_contributions=pt.explanation.member_contributions,
                coverage_notes=pt.explanation.coverage_notes,
                match_reasons=pt.explanation.match_reasons,
                unassigned_participants=pt.explanation.unassigned_participants
            )
        proposed_teams.append(
            ProposedTeamResponse(
                id=pt.id,
                matching_run_id=pt.matching_run_id,
                event_id=pt.event_id,
                team_name=pt.team_name,
                status=pt.status,
                coverage_score=float(pt.coverage_score or 0),
                members=members,
                explanation=explanation,
                team_size_gap=False,
                created_at=pt.created_at
            )
        )

    return MatchingRunResponse(
        id=run.id,
        event_id=run.event_id,
        initiated_by=run.initiated_by,
        algorithm_version=run.algorithm_version,
        status=run.status,
        config_snapshot=run.config_snapshot or {},
        summary=run.summary or {},
        proposed_teams=proposed_teams,
        created_at=run.created_at,
        completed_at=run.completed_at
    )

@router.post("/events/{event_id}/matching-runs", response_model=MatchingRunResponse, status_code=status.HTTP_201_CREATED)
def trigger_matching_run(
    event_id: uuid.UUID,
    req: MatchingRunCreate,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = MatchingService(db)
        run = service.execute_matching_run(event_id, current_user.id, req)
        return map_matching_run_response(run)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/events/{event_id}/matching-runs", response_model=List[MatchingRunResponse])
def list_matching_runs_for_event(
    event_id: uuid.UUID,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    service = MatchingService(db)
    runs = service.list_matching_runs(event_id)
    return [map_matching_run_response(service.get_matching_run(r.id)) for r in runs]

@router.get("/matching-runs/{run_id}", response_model=MatchingRunResponse)
def get_matching_run_detail(
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = MatchingService(db)
    run = service.get_matching_run(run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matching run not found")
    return map_matching_run_response(run)

@router.post("/matching-runs/{run_id}/approve", response_model=List[TeamResponse])
def approve_matching_run(
    run_id: uuid.UUID,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = MatchingService(db)
        teams = service.approve_matching_run(run_id, current_user.id)
        res = []
        for t in teams:
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
                for m in t.memberships
            ]
            res.append(TeamResponse(
                id=t.id,
                event_id=t.event_id,
                name=t.name,
                status=t.status,
                matching_run_id=t.matching_run_id,
                members=members,
                created_at=t.created_at,
                published_at=t.published_at
            ))
        return res
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/matching-runs/{run_id}/reject", response_model=MatchingRunResponse)
def reject_matching_run(
    run_id: uuid.UUID,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = MatchingService(db)
        run = service.reject_matching_run(run_id, current_user.id)
        return map_matching_run_response(run)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
