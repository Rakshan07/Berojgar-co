import json
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.integrations.ai.base import BaseAIProvider, AISetupOutput
from backend.app.integrations.ai.mock_provider import MockAIProvider
from backend.app.schemas.ai_setup import (
    AISuggestedRole,
    AISuggestedRequirement,
    AISuggestedQuestion,
    ProfileEvidenceExtractionResponse,
    ExtractedSkillEvidence
)

class GeminiProvider(BaseAIProvider):
    """Production AI provider leveraging Google Gemini (e.g. gemini-2.5-flash / gemini-2.5-flash-lite)
    via the official google-genai SDK with structured Pydantic JSON outputs and graceful fallbacks.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.effective_gemini_api_key
        self.model = model or settings.AI_MODEL or "gemini-2.5-flash"
        self.fallback = MockAIProvider()

    def _has_valid_key(self) -> bool:
        if not self.api_key:
            return False
        cleaned = self.api_key.strip().lower()
        return bool(cleaned and cleaned not in ("mock-key", "your-ai-api-key-here", "your_gemini_api_key_here", "none"))

    async def generate_event_setup(
        self,
        event_title: str,
        category: str,
        description: str,
        constraints: Dict[str, Any],
        known_skills: List[str]
    ) -> AISetupOutput:
        """Generates dynamic roles, requirements, and 3-4 event-specific assessment questions."""
        if not self._has_valid_key():
            logger.info("Gemini API key not configured or set to placeholder; using deterministic domain fallback.")
            return await self.fallback.generate_event_setup(
                event_title, category, description, constraints, known_skills
            )

        prompt = f"""You are the TeamWeave Event Setup Architect.
Generate structured, realistic team formation recommendations and participant assessment questions for this event:
- Title: {event_title}
- Category/Type: {category} (Support ANY arbitrary event type: hackathons, debates, research sprints, creative, college projects, workplace initiatives)
- Description: {description}
- Team Size Range: {constraints.get('min_team_size', 3)} to {constraints.get('max_team_size', 5)} members
- Reference Skill Catalog (sample): {', '.join(known_skills[:35])}

Requirements:
1. "suggested_roles": 3 to 5 complementary roles with description and suggested_count.
2. "suggested_requirements": 4 to 8 required and optional skills with min_proficiency (1=Exploring, 2=Developing, 3=Independent, 4=Advanced), priority (1=high, 3=low), and target_count.
3. "suggested_questions": EXACTLY 3 to 4 multiple-choice assessment questions tailored strictly to this specific event type ({category}):
   - Question 1 (Practical Experience): Relevant hands-on skills or tool proficiency.
   - Question 2 (Role Preference): Preferred contribution style and team responsibility.
   - Question 3 (Collaboration & Communication): Working rhythm, decision-making, or problem-solving agreements.
   - Question 4 (Commitment & Availability): Hours per week or problem-solving approach.
   Provide 3 to 4 distinct multiple-choice options per question.
4. "explanation": 2-3 sentences explaining why this teaming blueprint ensures balanced coverage and complementary member matching.

Return a valid JSON object matching this schema:
{{
  "suggested_roles": [
    {{"name": "...", "description": "...", "suggested_count": 1}}
  ],
  "suggested_requirements": [
    {{"skill_name": "...", "category": "...", "required": true, "min_proficiency": 2, "target_count": 1, "priority": 1}}
  ],
  "suggested_questions": [
    {{
      "question_text": "...",
      "skill_target": "...",
      "question_type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "category": "practical_experience",
      "rubric_guidelines": "..."
    }}
  ],
  "explanation": "..."
}}
"""

        try:
            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            raw_text = response.text or "{}"
            parsed = json.loads(raw_text)
            output = AISetupOutput.model_validate(parsed)
            # Ensure question count is bounded to 3-4
            if len(output.suggested_questions) > 4:
                output.suggested_questions = output.suggested_questions[:4]
            return output
        except Exception as e:
            logger.warning(f"Google Gemini generation encountered an issue ({e}). Falling back to high-fidelity domain fallback.")
            fallback_res = await self.fallback.generate_event_setup(
                event_title, category, description, constraints, known_skills
            )
            fallback_res.explanation = f"(Demo fallback active: {str(e)[:120]}) {fallback_res.explanation}"
            return fallback_res

    async def analyze_profile_evidence(
        self,
        content: Optional[str] = None,
        source_type: str = "resume",
        candidate_name: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        mime_type: Optional[str] = None
    ) -> ProfileEvidenceExtractionResponse:
        """Extracts structured skills, proficiencies, and evidence snippets from resume text, PDF, or image."""
        if not self._has_valid_key():
            logger.info("Gemini API key not configured; using deterministic resume extractor fallback.")
            return await self.fallback.analyze_profile_evidence(
                content=content, source_type=source_type, candidate_name=candidate_name,
                file_bytes=file_bytes, mime_type=mime_type
            )

        prompt = f"""You are the TeamWeave Evidence Analyzer.
Analyze the following {source_type} document/image for candidate '{candidate_name or "Participant"}'.
Extract only verifiable skills, tools, and experiences. Do not hallucinate capabilities.

Extract:
1. "extracted_skills": List of skills with:
   - "skill_name": Canonical name (e.g. React, Python, PostgreSQL, Figma, Machine Learning)
   - "category": e.g. Frontend, Backend, Design, Data, AI/ML, Research, Management, Soft Skills
   - "evidence_snippet": Direct quote or project reference from the text explaining why this skill was identified
   - "estimated_proficiency": Integer from 1 to 4 calibrated strictly using this rubric:
       1 = Exploring: Foundational familiarity, coursework, introductory tutorials, or early learning.
       2 = Developing: Practical project/hackathon experience, can build standard features with guidance.
       3 = Independent: Autonomous end-to-end delivery, professional internship, ships production features.
       4 = Advanced / Mentor: Architectural lead, deep expertise, technical mentorship, or lead engineering.
   - "proficiency_label": String matching the level ("Exploring", "Developing", "Independent", or "Advanced / Mentor")
   - "confidence": Float between 0.1 and 1.0
   - "is_verified": true if backed by concrete project outcomes or code repository links, false if purely self-stated
   - "source_reference": Source note (e.g. "Page 1 - Experience section")
2. "project_experiences": List of objects with "title" and "description"
3. "preferred_roles": List of suitable team roles
4. "interests": List of relevant project domains or topics
5. "summary": Concise 2-sentence summary of the candidate's profile

Return a valid JSON object matching:
{{
  "candidate_name": "{candidate_name or 'Candidate'}",
  "summary": "...",
  "extracted_skills": [...],
  "project_experiences": [...],
  "preferred_roles": [...],
  "interests": [...]
}}
"""

        try:
            client = genai.Client(api_key=self.api_key)
            contents = []
            if file_bytes and mime_type:
                contents.append(types.Part.from_bytes(data=file_bytes, mime_type=mime_type))
            if content:
                contents.append(content[:15000])
            contents.append(prompt)

            response = client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                )
            )
            parsed = json.loads(response.text or "{}")
            prof_map = {1: "Exploring", 2: "Developing", 3: "Independent", 4: "Advanced / Mentor"}
            extracted = []
            for s in parsed.get("extracted_skills", []):
                p_level = s.get("estimated_proficiency", 2)
                if not s.get("proficiency_label"):
                    s["proficiency_label"] = prof_map.get(p_level, "Developing")
                extracted.append(ExtractedSkillEvidence.model_validate(s))

            return ProfileEvidenceExtractionResponse(
                candidate_name=parsed.get("candidate_name") or candidate_name,
                summary=parsed.get("summary") or "Extracted skills from document.",
                extracted_skills=extracted,
                project_experiences=parsed.get("project_experiences", []),
                preferred_roles=parsed.get("preferred_roles", []),
                interests=parsed.get("interests", []),
                provider="gemini",
                model=self.model
            )

        except Exception as e:
            logger.warning(f"Gemini resume analysis failed ({e}). Falling back to heuristic extractor.")
            fallback_res = await self.fallback.analyze_profile_evidence(
                content=content, source_type=source_type, candidate_name=candidate_name,
                file_bytes=file_bytes, mime_type=mime_type
            )
            fallback_res.summary = f"(Demo fallback: {str(e)[:100]}) {fallback_res.summary}"
            return fallback_res

