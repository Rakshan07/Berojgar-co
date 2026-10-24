from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.challenge_service import ChallengeService
from backend.app.schemas.gamification import (
    DailyChallengeResponse,
    SubmitChallengeRequest,
    ChallengeResultResponse,
)
from backend.app.schemas.common import MessageResponse
from backend.app.api.dependencies import get_current_user
from backend.app.models.auth import User

router = APIRouter(prefix="/challenges", tags=["Daily Challenges & XP"])

@router.get("/today", response_model=DailyChallengeResponse)
def get_daily_challenge(db: Session = Depends(get_db)):
    service = ChallengeService(db)
    ch = service.get_todays_challenge()
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No challenge available for today")
    return DailyChallengeResponse(
        id=ch.id,
        challenge_date=ch.challenge_date,
        category=ch.category,
        question=ch.question,
        options=ch.options,
        points=ch.points,
        skill_tag=ch.skill_tag
    )

@router.post("/{challenge_id}/submit", response_model=ChallengeResultResponse)
def submit_daily_challenge(
    challenge_id: str,
    req: SubmitChallengeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        service = ChallengeService(db)
        return service.submit_attempt(current_user.id, challenge_id, req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/xp/me")
def get_my_xp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ChallengeService(db)
    total_xp = service.get_user_xp_total(current_user.id)
    return {"user_id": current_user.id, "total_xp": total_xp}
