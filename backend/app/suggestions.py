"""Static event-setup suggestions (mirrors AI_DEMO_SUGGESTIONS in the frontend)
and the optional Claude-backed path."""

import json
import logging

from . import config

log = logging.getLogger(__name__)

STATIC_SUGGESTIONS = {
    "hackathon": {
        "roles": ["Frontend Developer", "Backend Developer", "UI/UX Designer", "Product Manager", "Data Engineer"],
        "skills": [
            {"skill": "Frontend Development", "required": True, "proficiency": 2},
            {"skill": "Backend Development", "required": True, "proficiency": 2},
            {"skill": "UX Design", "required": True, "proficiency": 1},
            {"skill": "Project Management", "required": False, "proficiency": 1},
        ],
        "reason": "Hackathons need full-stack coverage plus a design and a coordination role.",
    },
    "debate": {
        "roles": ["Lead Speaker", "Research Lead", "Opposition Speaker", "Rebuttal Specialist"],
        "skills": [
            {"skill": "Argumentation", "required": True, "proficiency": 3},
            {"skill": "Research & Analysis", "required": True, "proficiency": 2},
            {"skill": "Presentation", "required": True, "proficiency": 3},
            {"skill": "Rebuttal", "required": False, "proficiency": 2},
        ],
        "reason": "Debate teams need strong argumentation and presentation, backed by research.",
    },
    "research": {
        "roles": ["Research Lead", "Data Analyst", "Technical Implementer", "Technical Writer"],
        "skills": [
            {"skill": "Research & Analysis", "required": True, "proficiency": 3},
            {"skill": "Academic Writing", "required": True, "proficiency": 2},
            {"skill": "Python", "required": True, "proficiency": 2},
            {"skill": "Data Visualization", "required": False, "proficiency": 2},
        ],
        "reason": "Research teams need analysis, implementation and writing capacity.",
    },
}
DEFAULT_CATEGORY = "hackathon"


def static_suggestions(category: str) -> dict:
    return STATIC_SUGGESTIONS.get(category, STATIC_SUGGESTIONS[DEFAULT_CATEGORY])


def _ask_claude(category: str) -> dict:
    import anthropic  # lazy: not needed (or installed) at zero-cost setup

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    msg = client.messages.create(
        model="claude-haiku-5-5",
        max_tokens=600,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Suggest team roles and skill requirements for a '{category}' event. "
                    'Reply with JSON only: {"roles": [str], "skills": [{"skill": str, '
                    '"required": bool, "proficiency": 1-4}], "reason": str}'
                ),
            }
        ],
    )
    return json.loads(msg.content[0].text)


def get_suggestions(category: str) -> dict:
    """Returns {'source': 'claude'|'static', ...}. Never raises: any failure falls back to static."""
    if config.ANTHROPIC_API_KEY:  # empty key => no network call, no cost
        try:
            return {**_ask_claude(category), "source": "claude"}
        except Exception:
            log.warning("Claude suggestion failed; using static fallback", exc_info=True)
    return {**static_suggestions(category), "source": "static"}
