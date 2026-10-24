import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class DailyChallengeResponse(BaseModel):
    id: str
    challenge_date: date
    category: str
    question: str
    options: List[Dict[str, str]]
    points: int
    skill_tag: Optional[str] = None

    class Config:
        from_attributes = True

class SubmitChallengeRequest(BaseModel):
    selected_answer: str

class ChallengeResultResponse(BaseModel):
    challenge_id: str
    selected_answer: str
    is_correct: bool
    correct_answer: str
    explanation: str
    points_awarded: int
    new_streak: int = 1

class XPLedgerResponse(BaseModel):
    id: uuid.UUID
    amount: int
    action_type: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AchievementResponse(BaseModel):
    id: str
    code: str
    title: str
    description: Optional[str] = None
    icon_name: Optional[str] = None
    xp_reward: int
    unlocked_at: Optional[datetime] = None

    class Config:
        from_attributes = True
