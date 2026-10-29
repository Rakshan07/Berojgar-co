import json
from typing import Dict, Any, List
import httpx
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.integrations.ai.base import BaseAIProvider, AISetupOutput
from backend.app.integrations.ai.mock_provider import MockAIProvider

class OpenAICompatibleProvider(BaseAIProvider):
    """Provider for OpenAI / Gemini OpenAI-compatible endpoints with structured outputs."""

    def __init__(self, api_key: str, model: str, base_url: str = "https://api.openai.com/v1"):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.fallback = MockAIProvider()

    async def generate_event_setup(
        self,
        event_title: str,
        category: str,
        description: str,
        constraints: Dict[str, Any],
        known_skills: List[str]
    ) -> AISetupOutput:
        # If API key is placeholder or empty, gracefully use domain fallback
        if not self.api_key or self.api_key in ("mock-key", "your-ai-api-key-here"):
            logger.info("Using mock AI provider fallback (no production API key provided)")
            return await self.fallback.generate_event_setup(
                event_title, category, description, constraints, known_skills
            )

        prompt = f"""You are the Skillfy Event Architect.
Design realistic role, skill requirement, and assessment recommendations for the following event:
Title: {event_title}
Category: {category}
Description: {description}
Constraints: {json.dumps(constraints)}
Skill Catalog Context: {', '.join(known_skills[:30])}

Return a valid JSON object matching this schema:
{{
  "suggested_roles": [
    {{"name": "...", "description": "...", "suggested_count": 1}}
  ],
  "suggested_requirements": [
    {{"skill_name": "...", "category": "...", "required": true, "min_proficiency": 2, "target_count": 1, "priority": 1}}
  ],
  "suggested_questions": [
    {{"question_text": "...", "skill_target": "...", "question_type": "open_text", "rubric_guidelines": "..."}}
  ],
  "explanation": "..."
}}
"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a professional team formation assistant. Output JSON only."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.4
        }

        try:
            async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
                res = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
                res.raise_for_status()
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                return AISetupOutput.model_validate(parsed)
        except Exception as e:
            logger.error(f"AI Provider call failed: {e}. Falling back to domain fallback.")
            return await self.fallback.generate_event_setup(
                event_title, category, description, constraints, known_skills
            )

    async def analyze_profile_evidence(self, *args, **kwargs):
        return await self.fallback.analyze_profile_evidence(*args, **kwargs)

    async def analyze_github_repos(self, *args, **kwargs):
        return await self.fallback.analyze_github_repos(*args, **kwargs)

    async def generate_event_assessment(self, *args, **kwargs):
        return await self.fallback.generate_event_assessment(*args, **kwargs)

    async def suggest_assessment_answers(self, *args, **kwargs):
        return await self.fallback.suggest_assessment_answers(*args, **kwargs)

    async def generate_secondary_event_profile(self, *args, **kwargs):
        return await self.fallback.generate_secondary_event_profile(*args, **kwargs)

