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

    @abstractmethod
    async def analyze_github_repos(
        self,
        github_username: str,
        repos: List[Dict[str, Any]],
        candidate_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyzes GitHub repositories to extract skills, project contributions, and technical strengths."""
        pass

    @abstractmethod
    async def generate_event_assessment(
        self,
        event_title: str,
        category: str,
        description: str,
        required_roles: List[str],
        required_skills: List[str],
        candidate_info: Dict[str, Any]
    ) -> List[AISuggestedQuestion]:
        """Generates event-specific skill-based and teamwork/personality assessment questions."""
        pass

    @abstractmethod
    async def suggest_assessment_answers(
        self,
        questions: List[Dict[str, Any]],
        candidate_evidence: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generates evidence-backed answer suggestions grounded in candidate resume and GitHub projects."""
        pass

    @abstractmethod
    async def generate_secondary_event_profile(
        self,
        candidate_data: Dict[str, Any],
        event_data: Dict[str, Any],
        assessment_answers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Synthesizes primary profile, resume, GitHub, and assessment answers into an event-specific secondary profile."""
        pass


