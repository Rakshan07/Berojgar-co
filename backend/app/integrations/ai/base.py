from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from backend.app.schemas.ai_setup import (
    AISuggestedRole,
    AISuggestedRequirement,
    AISuggestedQuestion,
    ProfileEvidenceExtractionResponse
)

class AISetupOutput(BaseModel):
    suggested_roles: List[AISuggestedRole]
    suggested_requirements: List[AISuggestedRequirement]
    suggested_questions: List[AISuggestedQuestion]
    explanation: str

class BaseAIProvider(ABC):
    """Abstract interface for AI Event Setup and Evidence Extraction providers."""

    @abstractmethod
    async def generate_event_setup(
        self,
        event_title: str,
        category: str,
        description: str,
        constraints: Dict[str, Any],
        known_skills: List[str]
    ) -> AISetupOutput:
        """Generates draft roles, requirements, and assessment questions for an event."""
        pass

    @abstractmethod
    async def analyze_profile_evidence(
        self,
        content: Optional[str] = None,
        source_type: str = "resume",
        candidate_name: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        mime_type: Optional[str] = None
    ) -> ProfileEvidenceExtractionResponse:
        """Extracts structured skills, proficiencies, and evidence from resume, PDF, image, or text."""
        pass

