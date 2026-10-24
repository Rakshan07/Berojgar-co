import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AssessmentQuestionCreate(BaseModel):
    order_index: int = 1
    question_text: str
    question_type: str = "open_text"
    skill_target: Optional[str] = None
    options: Optional[Dict[str, Any]] = None
    rubric: Optional[Dict[str, Any]] = None

class AssessmentQuestionResponse(BaseModel):
    id: uuid.UUID
    assessment_id: uuid.UUID
    order_index: int
    question_text: str
    question_type: str
    skill_target: Optional[str] = None
    options: Optional[Dict[str, Any]] = None
    rubric: Optional[Dict[str, Any]] = None # Server-side / organizer view only

    class Config:
        from_attributes = True

class AssessmentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    questions: List[AssessmentQuestionCreate] = []

class AssessmentResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    title: str
    description: Optional[str] = None
    version: int
    status: str
    created_by: uuid.UUID
    created_at: datetime
    published_at: Optional[datetime] = None
    questions: List[AssessmentQuestionResponse] = []

    class Config:
        from_attributes = True

class SubmissionAnswerInput(BaseModel):
    question_id: uuid.UUID
    answer_text: Optional[str] = None
    file_reference: Optional[str] = None

class SubmissionCreate(BaseModel):
    answers: List[SubmissionAnswerInput] = []

class SubmissionEvaluationCreate(BaseModel):
    score: float = Field(..., ge=0, le=100)
    rubric_scores: Dict[str, Any] = {}
    feedback_notes: Optional[str] = None
    evaluator_type: str = "organizer"

class SubmissionEvaluationResponse(BaseModel):
    id: uuid.UUID
    submission_id: uuid.UUID
    evaluator_id: Optional[uuid.UUID] = None
    evaluator_type: str
    model_id: Optional[str] = None
    score: float
    rubric_scores: Dict[str, Any] = {}
    feedback_notes: Optional[str] = None
    evaluated_at: datetime

    class Config:
        from_attributes = True

class SubmissionResponse(BaseModel):
    id: uuid.UUID
    assessment_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    evaluations: List[SubmissionEvaluationResponse] = []

    class Config:
        from_attributes = True
