import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AISuggestedRole(BaseModel):
    name: str
    description: Optional[str] = None
    suggested_count: int = 1

class AISuggestedRequirement(BaseModel):
    skill_name: str
    category: str = "Technical"
    required: bool = True
    min_proficiency: int = Field(default=2, ge=1, le=4)
    target_count: int = 1
    priority: int = 1

class AISuggestedQuestion(BaseModel):
    question_text: str
    skill_target: Optional[str] = None
    question_type: str = "open_text"
    rubric_guidelines: Optional[str] = None

class AISetupRequest(BaseModel):
    category: Optional[str] = None
    focus_areas: Optional[List[str]] = None
    additional_context: Optional[str] = None

class AISetupResponse(BaseModel):
    generation_id: uuid.UUID
    event_id: uuid.UUID
    provider: str
    model: str
    prompt_version: str
    suggested_roles: List[AISuggestedRole] = []
    suggested_requirements: List[AISuggestedRequirement] = []
    suggested_questions: List[AISuggestedQuestion] = []
    explanation: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AISetupApproveRequest(BaseModel):
    approved_roles: Optional[List[AISuggestedRole]] = None
    approved_requirements: Optional[List[AISuggestedRequirement]] = None
    approved_questions: Optional[List[AISuggestedQuestion]] = None
