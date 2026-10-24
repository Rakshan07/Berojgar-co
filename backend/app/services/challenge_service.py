import uuid
from datetime import datetime, timezone, date
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from backend.app.models.gamification import DailyChallenge, UserChallengeAttempt, XPLedger, Achievement, UserAchievement
from backend.app.schemas.gamification import SubmitChallengeRequest, ChallengeResultResponse

class ChallengeService:
    def __init__(self, db: Session):
        self.db = db

    def get_todays_challenge(self) -> Optional[DailyChallenge]:
        today = date.today()
        challenge = self.db.scalars(
            select(DailyChallenge).where(DailyChallenge.challenge_date == today)
        ).first()

        if not challenge:
            # Fallback to the latest available challenge in demo/catalog
            challenge = self.db.scalars(
                select(DailyChallenge).order_by(DailyChallenge.challenge_date.desc())
            ).first()

        return challenge

    def submit_attempt(self, user_id: uuid.UUID, challenge_id: str, req: SubmitChallengeRequest) -> ChallengeResultResponse:
        challenge = self.db.get(DailyChallenge, challenge_id)
        if not challenge:
            raise ValueError("Challenge not found")

        is_correct = req.selected_answer.strip().lower() == challenge.correct_answer.strip().lower()

        existing = self.db.scalars(
            select(UserChallengeAttempt).where(
                UserChallengeAttempt.user_id == user_id,
                UserChallengeAttempt.challenge_id == challenge_id
            )
        ).first()

        points_awarded = 0
        if not existing:
            attempt = UserChallengeAttempt(
                user_id=user_id,
                challenge_id=challenge_id,
                selected_answer=req.selected_answer,
                is_correct=is_correct
            )
            self.db.add(attempt)

            if is_correct:
                points_awarded = challenge.points
                xp_entry = XPLedger(
                    user_id=user_id,
                    amount=points_awarded,
                    action_type="daily_challenge",
                    reference_id=challenge_id,
                    description=f"Completed daily challenge: {challenge.category}"
                )
                self.db.add(xp_entry)

            self.db.commit()
        else:
            is_correct = existing.is_correct

        # Calculate user streak
        streak_count = self.db.scalar(
            select(func.count(UserChallengeAttempt.id)).where(
                UserChallengeAttempt.user_id == user_id,
                UserChallengeAttempt.is_correct == True
            )
        ) or 1

        return ChallengeResultResponse(
            challenge_id=challenge_id,
            selected_answer=req.selected_answer,
            is_correct=is_correct,
            correct_answer=challenge.correct_answer,
            explanation=challenge.explanation,
            points_awarded=points_awarded,
            new_streak=streak_count
        )

    def get_user_xp_total(self, user_id: uuid.UUID) -> int:
        return self.db.scalar(
            select(func.coalesce(func.sum(XPLedger.amount), 0)).where(XPLedger.user_id == user_id)
        ) or 0
