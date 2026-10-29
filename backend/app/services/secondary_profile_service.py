import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.logging import logger
from backend.app.integrations.ai.factory import get_ai_provider
from backend.app.services.ai_analysis_service import AIAnalysisService

class SecondaryProfileService:
    def __init__(self, db: Session):
        self.db = db
        self.ai = get_ai_provider()
        self.analysis_svc = AIAnalysisService(db)

    async def get_or_create_event_profile(
        self,
        event_id: uuid.UUID,
        user_id: uuid.UUID,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Generates or retrieves a participant-event secondary profile from hackloop.event_profiles."""
        # 1. Check if event profile already exists
        if not force_refresh:
            existing = self.db.execute(
                text("""
                    SELECT id, user_id, event_id, summary, preferred_role, event_skills,
                           strengths, growth_areas, contribution_areas, assessment_highlights,
                           github_highlights, compatibility_bonus, generated_by, model_used,
                           created_at, updated_at
                    FROM hackloop.event_profiles
                    WHERE user_id = :uid AND event_id = :eid
                """),
                {"uid": user_id, "eid": event_id}
            ).mappings().first()

            if existing:
                return dict(existing)

        # 2. Gather event data
        event_row = self.db.execute(
            text("SELECT id, title, description, category_id AS category FROM hackloop.events WHERE id = :eid"),
            {"eid": event_id}
        ).mappings().first()

        if not event_row:
            raise ValueError(f"Event {event_id} not found")

        # 3. Gather participant primary profile, skills, and resume
        user_row = self.db.execute(
            text("SELECT id, display_name, email FROM hackloop.users WHERE id = :uid"),
            {"uid": user_id}
        ).mappings().first()

        profile_row = self.db.execute(
            text("SELECT bio, github_url, preferred_roles, interests, hours_per_week FROM hackloop.profiles WHERE user_id = :uid"),
            {"uid": user_id}
        ).mappings().first()

        skills_rows = self.db.execute(
            text("""
                SELECT s.name AS skill_name, s.category_id AS category, us.proficiency 
                FROM hackloop.user_skills us 
                JOIN hackloop.skills s ON s.id = us.skill_id 
                WHERE us.user_id = :uid
            """),
            {"uid": user_id}
        ).mappings().all()

        resume_text = self.analysis_svc.extract_resume_text(user_id) or ""
        github_url = profile_row["github_url"] if profile_row else None
        github_repos = await self.analysis_svc.fetch_github_repos(github_url)

        # 4. Gather submitted assessment answers for this event
        assessment_answers = self.db.execute(
            text("""
                SELECT q.question_text, q.skill_target, a.answer_text
                FROM hackloop.assessments asm
                JOIN hackloop.assessment_submissions s ON s.assessment_id = asm.id
                JOIN hackloop.assessment_answers a ON a.submission_id = s.id
                JOIN hackloop.assessment_questions q ON q.id = a.question_id
                WHERE asm.event_id = :eid AND s.user_id = :uid
                ORDER BY q.order_index ASC
            """),
            {"eid": event_id, "uid": user_id}
        ).mappings().all()

        candidate_data = {
            "name": user_row["display_name"] if user_row else "Participant",
            "skills": [
                {"name": s["skill_name"], "category": s["category"], "proficiency": s["proficiency"]}
                for s in skills_rows
            ],
            "bio": profile_row["bio"] if profile_row else "",
            "github_repos": github_repos,
            "resume_text": resume_text[:2000]
        }

        event_data = {
            "title": event_row["title"],
            "category": event_row["category"] or "General",
            "description": event_row["description"] or ""
        }

        answers_list = [
            {"question": a["question_text"], "skill_target": a["skill_target"], "answer": a["answer_text"]}
            for a in assessment_answers
        ]

        # 5. Generate secondary event profile via AI provider
        generated = await self.ai.generate_secondary_event_profile(
            candidate_data=candidate_data,
            event_data=event_data,
            assessment_answers=answers_list
        )

        # 6. Upsert into hackloop.event_profiles
        now = datetime.now(timezone.utc)
        profile_id = uuid.uuid4()

        upsert_query = text("""
            INSERT INTO hackloop.event_profiles (
                id, user_id, event_id, summary, preferred_role, event_skills,
                strengths, growth_areas, contribution_areas, assessment_highlights,
                github_highlights, compatibility_bonus, generated_by, model_used,
                created_at, updated_at
            ) VALUES (
                :id, :uid, :eid, :summary, :role, CAST(:event_skills AS jsonb),
                CAST(:strengths AS jsonb), CAST(:growth_areas AS jsonb), CAST(:contribution_areas AS jsonb),
                CAST(:assessment_highlights AS jsonb), CAST(:github_highlights AS jsonb),
                :bonus, 'ai_synthesis', :model, :now, :now
            )
            ON CONFLICT (user_id, event_id) DO UPDATE SET
                summary = EXCLUDED.summary,
                preferred_role = EXCLUDED.preferred_role,
                event_skills = EXCLUDED.event_skills,
                strengths = EXCLUDED.strengths,
                growth_areas = EXCLUDED.growth_areas,
                contribution_areas = EXCLUDED.contribution_areas,
                assessment_highlights = EXCLUDED.assessment_highlights,
                github_highlights = EXCLUDED.github_highlights,
                compatibility_bonus = EXCLUDED.compatibility_bonus,
                model_used = EXCLUDED.model_used,
                updated_at = EXCLUDED.updated_at
            RETURNING id, user_id, event_id, summary, preferred_role, event_skills,
                      strengths, growth_areas, contribution_areas, assessment_highlights,
                      github_highlights, compatibility_bonus, generated_by, model_used,
                      created_at, updated_at
        """)

        result = self.db.execute(
            upsert_query,
            {
                "id": profile_id,
                "uid": user_id,
                "eid": event_id,
                "summary": generated.get("summary", ""),
                "role": generated.get("preferred_role", "Contributor"),
                "event_skills": json.dumps(generated.get("event_skills", [])),
                "strengths": json.dumps(generated.get("strengths", [])),
                "growth_areas": json.dumps(generated.get("growth_areas", [])),
                "contribution_areas": json.dumps(generated.get("contribution_areas", [])),
                "assessment_highlights": json.dumps(generated.get("assessment_highlights", [])),
                "github_highlights": json.dumps(generated.get("github_highlights", [])),
                "bonus": float(generated.get("compatibility_bonus", 8.0)),
                "model": generated.get("model_used", "skillfy-ai"),
                "now": now
            }
        ).mappings().first()

        self.db.commit()
        return dict(result)
