"""AI service for Skillfy: Event Brief generation, Personalized Case Study generation,
and Evidence-Based Answer Evaluation using the Google Gemini API (google-genai SDK).

Designed strictly for free-tier constraints:
- Input/output token bounds
- Bounded concurrency and timeouts
- Structured Pydantic JSON outputs
- Untrusted content isolation (prompt injection safety)
- Explicit, truthful errors (no silent fake mocks in production)
"""
import json
import asyncio
import logging
import re
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class AIServiceError(Exception):
    """Raised when the AI service encounters an operational error, missing key, or quota limit."""
    pass

# ─── Pydantic Output Schemas ──────────────────────────────────────────────────

class BriefRole(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=5, max_length=500)
    suggested_count: int = Field(default=1, ge=1, le=10)

class BriefSkill(BaseModel):
    skill_name: str = Field(min_length=1, max_length=100)
    category: str = Field(default="Technical", max_length=50)
    min_proficiency: int = Field(default=2, ge=1, le=4)
    required: bool = True

class EventBriefOutput(BaseModel):
    summary: str = Field(min_length=20, max_length=2000)
    participant_goals: List[str] = Field(min_length=1, max_length=10)
    relevant_skills: List[BriefSkill] = Field(min_length=1, max_length=15)
    complementary_roles: List[BriefRole] = Field(min_length=1, max_length=8)
    important_constraints: List[str] = Field(default_factory=list, max_length=10)
    assessment_criteria: List[str] = Field(min_length=1, max_length=10)

class RubricCriterion(BaseModel):
    criterion_name: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=5, max_length=300)
    max_score: float = Field(default=25.0, ge=1.0, le=100.0)

class CaseStudyRubric(BaseModel):
    criteria: List[RubricCriterion] = Field(min_length=1, max_length=5)
    key_points: List[str] = Field(min_length=1, max_length=8)
    target_role: str = Field(min_length=2, max_length=100)
    target_skill: str = Field(min_length=1, max_length=100)
    estimated_time_minutes: int = Field(default=15, ge=5, le=60)
    scoring_guidelines: str = Field(min_length=10, max_length=1000)

class CaseStudyQuestion(BaseModel):
    prompt: str = Field(min_length=30, max_length=4000)
    target_role: str = Field(min_length=2, max_length=100)
    target_skill: str = Field(min_length=1, max_length=100)
    difficulty: Literal["beginner", "intermediate", "advanced"]
    response_type: Literal["text"] = "text"
    estimated_time_minutes: int = Field(default=15, ge=5, le=60)
    expected_response_format: str = Field(default="Written analysis (2-4 paragraphs)")
    rubric: CaseStudyRubric

class CaseStudiesOutput(BaseModel):
    questions: List[CaseStudyQuestion] = Field(min_length=2, max_length=3)
    rationale: str = Field(min_length=10, max_length=1000)

class CriterionScoreItem(BaseModel):
    question_position: int = Field(ge=1, le=5)
    criterion_name: str
    score: float = Field(ge=0.0, le=100.0)
    max_score: float = Field(ge=1.0, le=100.0)
    explanation: str

class SkillEstimateItem(BaseModel):
    skill_name: str
    estimated_level: Literal["beginner", "intermediate", "advanced"]
    score: float = Field(ge=0.0, le=100.0)
    confidence: float = Field(ge=0.1, le=1.0)
    evidence_summary: str

class RoleSuitabilityItem(BaseModel):
    role_name: str
    suitability_score: float = Field(ge=0.0, le=100.0)
    fit_level: Literal["developing", "strong", "exceptional"]
    reasoning: str

class EvaluationOutput(BaseModel):
    criterion_scores: List[CriterionScoreItem]
    skill_estimates: List[SkillEstimateItem]
    role_suitability: RoleSuitabilityItem
    strengths: List[str] = Field(min_length=1, max_length=8)
    areas_to_improve: List[str] = Field(min_length=1, max_length=8)
    overall_explanation: str = Field(min_length=20, max_length=2000)
    confidence: float = Field(ge=0.1, le=1.0)
    insufficient_evidence: bool = False

# ─── Sanitization & Guardrails ────────────────────────────────────────────────

def sanitize_untrusted_input(text: Optional[str], max_len: int = 5000) -> str:
    """Strip dangerous control characters and trim untrusted text to prevent prompt injection/overflow."""
    if not text:
        return ""
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", str(text))
    return cleaned[:max_len].strip()

def get_gemini_client():
    """Retrieve and validate the Gemini client. Raises AIServiceError if key is missing."""
    key = settings.effective_gemini_api_key
    if not key or key.strip().lower() in ("none", "your_gemini_api_key_here", "mock-key", ""):
        raise AIServiceError(
            "Gemini API key is not configured. Please enter your GEMINI_API_KEY in the root .env file "
            "to enable AI event briefs, assessment generation, and evaluations."
        )
    try:
        from google import genai
        return genai.Client(api_key=key.strip(), http_options={"timeout": settings.AI_REQUEST_TIMEOUT_SECONDS * 1000})
    except Exception as e:
        raise AIServiceError(f"Failed to initialize Gemini client: {e}")

async def generate_with_retry(client, **kwargs):
    """Retry temporary provider outages within the browser request budget."""
    configured = [kwargs['model']] + [m.strip() for m in settings.AI_FALLBACK_MODELS.split(',') if m.strip()]
    models = list(dict.fromkeys(configured))[:3]
    for attempt in range(3):
        try:
            request_args = {**kwargs, 'model': models[min(attempt, len(models)-1)]}
            return await asyncio.wait_for(client.aio.models.generate_content(**request_args), timeout=24)
        except Exception as exc:
            code = getattr(exc, 'code', None)
            temporary = code in (500, 502, 503, 504) or isinstance(exc, (TimeoutError, asyncio.TimeoutError))
            if not temporary:
                raise AIServiceError('The AI service could not process this request. Your answers are saved. Please check the service configuration or try again.') from None
            if attempt == 2:
                raise AIServiceError('The AI service is temporarily busy. Your answers are saved. Please retry evaluation shortly; you do not need to answer again.') from None
            await asyncio.sleep(2 ** (attempt + 1))

# ─── 1. Generate Event Brief ──────────────────────────────────────────────────

async def generate_event_brief(
    title: str,
    category: str,
    description: str,
    rules: Optional[str] = None,
    deliverables: Optional[str] = None,
    constraints: Optional[str] = None,
    judging_criteria: Optional[str] = None,
    min_team_size: int = 2,
    max_team_size: int = 5,
) -> EventBriefOutput:
    """Analyze event parameters and generate a structured event brief.
    Organizer rules are authoritative; AI does not silently change them.
    """
    client = get_gemini_client()
    from google.genai import types

    safe_title = sanitize_untrusted_input(title, 200)
    safe_category = sanitize_untrusted_input(category, 50)
    safe_desc = sanitize_untrusted_input(description, 4000)
    safe_rules = sanitize_untrusted_input(rules, 2000)
    safe_deliv = sanitize_untrusted_input(deliverables, 2000)
    safe_const = sanitize_untrusted_input(constraints, 2000)
    safe_judge = sanitize_untrusted_input(judging_criteria, 2000)

    prompt = f"""You are the Skillfy Event Architect.
Analyze the following organizer-provided event draft and produce a structured event brief:

EVENT METADATA:
- Title: {safe_title}
- Category: {safe_category}
- Team Size Range: {min_team_size} to {max_team_size} members

ORGANIZER BRIEF & DESCRIPTION:
\"\"\"
{safe_desc}
\"\"\"

ORGANIZER RULES & ELIGIBILITY:
\"\"\"
{safe_rules or "Standard event rules apply."}
\"\"\"

EXPECTED DELIVERABLES:
\"\"\"
{safe_deliv or "Project prototype, documentation, and demonstration."}
\"\"\"

CONSTRAINTS & PERMITTED TOOLS:
\"\"\"
{safe_const or "Open domain tooling."}
\"\"\"

JUDGING CRITERIA:
\"\"\"
{safe_judge or "Innovation, technical execution, completeness, and collaboration."}
\"\"\"

INSTRUCTIONS:
1. Synthesize a concise summary of what participants need to accomplish.
2. Outline 3 to 6 participant goals.
3. Suggest 4 to 8 relevant skills with category (Technical, Design, Research, Management) and minimum proficiency (1=Exploring, 2=Developing, 3=Independent, 4=Advanced).
4. Suggest 3 to 5 complementary roles (e.g. Lead Developer, Systems Architect, UX Researcher, Data Lead) needed for balanced teams.
5. Highlight important constraints and assessment criteria based strictly on the organizer's requirements.
Do not invent requirements that contradict the organizer's description.

Return ONLY a valid JSON object matching the EventBriefOutput schema:
{{
  "summary": "...",
  "participant_goals": ["..."],
  "relevant_skills": [
    {{"skill_name": "...", "category": "...", "min_proficiency": 2, "required": true}}
  ],
  "complementary_roles": [
    {{"name": "...", "description": "...", "suggested_count": 1}}
  ],
  "important_constraints": ["..."],
  "assessment_criteria": ["..."]
}}
"""

    model_name = settings.AI_MODEL or "gemini-2.5-flash"
    try:
        response = await generate_with_retry(client,
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=6000,
                response_schema=EventBriefOutput,
                thinking_config=(types.ThinkingConfig(thinking_level="minimal") if model_name.startswith("gemini-3") else types.ThinkingConfig(thinking_budget=0)),
            ),
        )
        raw_text = response.text or "{}"
        parsed = json.loads(raw_text)
        output = EventBriefOutput.model_validate(parsed)
        output._model_used = response.model_version or model_name
        return output
    except AIServiceError:
        raise
    except Exception as e:
        logger.error(f"Gemini event brief generation failed: {e}")
        raise AIServiceError(f"AI event brief generation failed: {e}")

# ─── 2. Generate Personalized Case Studies ────────────────────────────────────

async def generate_case_studies(
    event_title: str,
    category: str,
    event_brief: str,
    rules: Optional[str],
    participant_skills: List[Dict[str, Any]],
    preferred_roles: List[str],
    experience_level: str = "intermediate",
) -> CaseStudiesOutput:
    """Generate 2 (or 3 when justified by selected roles) practical, open-ended
    case-study questions requiring written answers.
    Questions adapt to the participant's stated skills, level, and preferred role.
    """
    client = get_gemini_client()
    from google.genai import types

    safe_title = sanitize_untrusted_input(event_title, 200)
    safe_category = sanitize_untrusted_input(category, 50)
    safe_brief = sanitize_untrusted_input(event_brief, 3000)
    safe_rules = sanitize_untrusted_input(rules, 1500)

    skills_summary = ", ".join(
        [f"{s.get('skill_name', s.get('name', 'Skill'))} ({s.get('experience_level', experience_level)})" for s in participant_skills[:10]]
    ) or "General problem-solving"

    roles_summary = ", ".join(preferred_roles[:3]) or "Contributor"
    num_questions = 3 if len(preferred_roles) >= 2 else 2

    prompt = f"""You are the Skillfy Assessment Designer.
Design EXACTLY {num_questions} personalized, practical written case-study questions for a participant entering this event.

EVENT DETAILS:
- Title: {safe_title}
- Category: {safe_category}
- Event Brief & Deliverables: {safe_brief}
- Constraints & Rules: {safe_rules or "Standard event guidelines."}

PARTICIPANT PROFILE (FOR CALIBRATION ONLY):
- Preferred Role(s): {roles_summary}
- Declared Skills: {skills_summary}
- Stated Experience Level: {experience_level} (beginner / intermediate / advanced)

CRITICAL REQUIREMENTS:
1. Questions MUST be practical, realistic open-ended scenarios requiring written paragraph answers.
2. DO NOT GENERATE MULTIPLE-CHOICE QUESTIONS.
3. Questions must relate directly to this actual event ({safe_title}) and require the participant to think through realistic architectural, analytical, creative, or collaborative decisions.
4. Difficulty calibration:
   - beginner: foundational understanding, safe decision-making, systematic troubleshooting.
   - intermediate: trade-off evaluation, practical edge cases, concrete implementation strategy.
   - advanced: architecture trade-offs, scalability, failure modes, coordination under tight constraints.
5. Provide a private evaluation rubric for each question with:
   - 2 to 4 distinct criteria (with max_score summing to 100).
   - key points that demonstrate genuine competence.
   - scoring guidelines.
6. Expected completion time should be 10-20 minutes per question.

Return ONLY a valid JSON object matching this schema:
{{
  "questions": [
    {{
      "prompt": "Detailed realistic scenario description and the concrete question to solve...",
      "target_role": "...",
      "target_skill": "...",
      "difficulty": "{experience_level}",
      "response_type": "text",
      "estimated_time_minutes": 15,
      "expected_response_format": "2-4 paragraphs outlining your approach, key decisions, and trade-offs.",
      "rubric": {{
        "criteria": [
          {{"criterion_name": "Problem Analysis & Soundness", "description": "...", "max_score": 40}},
          {{"criterion_name": "Technical Execution & Specifics", "description": "...", "max_score": 40}},
          {{"criterion_name": "Trade-offs & Edge Cases", "description": "...", "max_score": 20}}
        ],
        "key_points": ["...", "..."],
        "target_role": "...",
        "target_skill": "...",
        "estimated_time_minutes": 15,
        "scoring_guidelines": "..."
      }}
    }}
  ],
  "rationale": "Brief 2-sentence rationale on why these questions evaluate this participant's readiness for {roles_summary}."
}}
"""

    model_name = settings.AI_MODEL or "gemini-2.5-flash"
    try:
        response = await generate_with_retry(client,
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
                max_output_tokens=6000,
                response_schema=CaseStudiesOutput,
                thinking_config=(types.ThinkingConfig(thinking_level="minimal") if model_name.startswith("gemini-3") else types.ThinkingConfig(thinking_budget=0)),
            ),
        )
        raw_text = response.text or "{}"
        parsed = json.loads(raw_text)
        output = CaseStudiesOutput.model_validate(parsed)
        output._model_used = response.model_version or model_name
        # Ensure question count matches expected
        if len(output.questions) > num_questions:
            output.questions = output.questions[:num_questions]
        return output
    except AIServiceError:
        raise
    except Exception as e:
        logger.error(f"Gemini case study generation failed: {e}")
        raise AIServiceError(f"AI case study generation failed: {e}")

# ─── 3. Evaluate Assessment Answers ───────────────────────────────────────────

async def evaluate_answers(
    event_title: str,
    category: str,
    questions_with_rubrics: List[Dict[str, Any]],
    answers_by_question_id: Dict[str, str],
    participant_level: str = "intermediate",
    selected_role: str = "Contributor",
) -> EvaluationOutput:
    """Evaluate submitted written answers against the stored questions and private rubrics.
    Evaluates evidence in the answers; does not reward sheer verbosity or hallucinate facts.
    """
    client = get_gemini_client()
    from google.genai import types

    # Prepare sanitized questions and answers
    qa_blocks = []
    for i, q in enumerate(questions_with_rubrics, start=1):
        qid = str(q.get("id"))
        prompt_text = sanitize_untrusted_input(q.get("prompt"), 3000)
        user_answer = sanitize_untrusted_input(answers_by_question_id.get(qid, ""), 5000)
        rubric = q.get("rubric") or {}

        qa_blocks.append(
            f"--- QUESTION {i} (Target Role: {q.get('target_role') or selected_role}, Target Skill: {q.get('target_skill', 'General')}) ---\n"
            f"Prompt: {prompt_text}\n"
            f"Private Rubric: {json.dumps(rubric)}\n"
            f"Candidate's Submitted Answer:\n\"\"\"\n{user_answer or '[No Answer Provided]'}\n\"\"\"\n"
        )

    all_qa = "\n\n".join(qa_blocks)

    eval_prompt = f"""You are the Skillfy Assessment Evaluator.
Evaluate the candidate's submitted written answers against the assigned questions and private rubrics.

EVENT CONTEXT:
- Event: {sanitize_untrusted_input(event_title, 200)}
- Category: {sanitize_untrusted_input(category, 50)}
- Target Role: {sanitize_untrusted_input(selected_role, 100)}
- Declared Difficulty / Calibration Level: {participant_level}

QUESTIONS, PRIVATE RUBRICS, AND CANDIDATE ANSWERS:
{all_qa}

EVALUATION RULES:
1. Evaluate ONLY what the candidate wrote. Do not hallucinate capabilities or score unrelated personal details.
2. Short assessments are an estimate, not absolute proof of someone's entire ability.
3. Do not reward verbosity simply for being long. Look for sound reasoning, practical trade-offs, and concrete technical clarity.
4. If an answer is trivial or empty, mark insufficient_evidence=true and assign a score reflective of lack of evidence.
5. Criterion scores must score against the private rubric criteria for each question (0 to max_score).
6. Provide role suitability (developing / strong / exceptional) with honest reasoning.
7. Outline 2-4 concrete strengths and 2-4 actionable areas to improve.

Return ONLY a valid JSON object matching the EvaluationOutput schema:
{{
  "criterion_scores": [
    {{
      "question_position": 1,
      "criterion_name": "...",
      "score": 32.0,
      "max_score": 40.0,
      "explanation": "..."
    }}
  ],
  "skill_estimates": [
    {{
      "skill_name": "...",
      "estimated_level": "{participant_level}",
      "score": 78.0,
      "confidence": 0.85,
      "evidence_summary": "..."
    }}
  ],
  "role_suitability": {{
    "role_name": "{selected_role}",
    "suitability_score": 80.0,
    "fit_level": "strong",
    "reasoning": "..."
  }},
  "strengths": ["...", "..."],
  "areas_to_improve": ["...", "..."],
  "overall_explanation": "Concise summary grounded strictly in the candidate's answers.",
  "confidence": 0.80,
  "insufficient_evidence": false
}}
"""

    model_name = settings.AI_MODEL or "gemini-2.5-flash"
    try:
        response = await generate_with_retry(client,
            model=model_name,
            contents=eval_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
                max_output_tokens=6000,
                response_schema=EvaluationOutput,
                thinking_config=(types.ThinkingConfig(thinking_level="minimal") if model_name.startswith("gemini-3") else types.ThinkingConfig(thinking_budget=0)),
            ),
        )
        raw_text = response.text or "{}"
        parsed = json.loads(raw_text)
        output = EvaluationOutput.model_validate(parsed)
        output._model_used = response.model_version or model_name
        return output
    except AIServiceError:
        raise
    except Exception as e:
        logger.error(f"Gemini answer evaluation failed: {e}")
        raise AIServiceError(f"AI answer evaluation failed: {e}")

