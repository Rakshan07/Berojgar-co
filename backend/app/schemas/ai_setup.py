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
    question_type: str = "multiple_choice" # 'multiple_choice' or 'open_text'
    options: Optional[List[str]] = Field(default_factory=list)
    category: Optional[str] = "practical_experience" # 'practical_experience', 'role_preference', 'collaboration_style', 'problem_solving_commitment'
    rubric_guidelines: Optional[str] = None

class ExtractedSkillEvidence(BaseModel):
    skill_name: str
    category: str = "Technical"
    evidence_snippet: str
    estimated_proficiency: int = Field(default=2, ge=1, le=4)
    proficiency_label: Optional[str] = "Developing"
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    is_verified: bool = False
    source_reference: Optional[str] = None


class ProfileEvidenceExtractionRequest(BaseModel):
    content: str = Field(..., min_length=20, description="Resume text, project description, markdown, or GitHub repository summary")
    source_type: str = Field(default="resume", description="'resume', 'github', 'portfolio', 'project_description'")
    candidate_name: Optional[str] = None

class ProfileEvidenceExtractionResponse(BaseModel):
    candidate_name: Optional[str] = None
    summary: str
    extracted_skills: List[ExtractedSkillEvidence] = []
    project_experiences: List[Dict[str, Any]] = []
    preferred_roles: List[str] = []
    interests: List[str] = []
    provider: str
    model: str

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

class ApplyEvidenceRequest(BaseModel):
    extracted_skills: List[ExtractedSkillEvidence] = []
    bio: Optional[str] = None
    preferred_roles: Optional[List[str]] = None
    interests: Optional[List[str]] = None

