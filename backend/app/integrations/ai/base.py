from abc import ABC, abstractmethod
from typing import Dict, Any, List
from pydantic import BaseModel
from backend.app.schemas.ai_setup import AISuggestedRole, AISuggestedRequirement, AISuggestedQuestion

class AISetupOutput(BaseModel):
    suggested_roles: List[AISuggestedRole]
    suggested_requirements: List[AISuggestedRequirement]
    suggested_questions: List[AISuggestedQuestion]
    explanation: str

class BaseAIProvider(ABC):
    """Abstract interface for AI Event Setup providers."""

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
