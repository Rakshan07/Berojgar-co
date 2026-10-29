import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.logging import logger
from backend.app.integrations.ai.factory import get_ai_provider
from backend.app.services.ai_analysis_service import AIAnalysisService

class EventAssessmentService:
    def __init__(self, db: Session):
        self.db = db
        self.ai = get_ai_provider()
        self.analysis_service = AIAnalysisService(db)

    async def get_or_generate_event_assessment(
        self,
        event_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Fetches existing assessment for an event or dynamically generates one using AI."""
        # 1. Fetch event details
        event_row = self.db.execute(
            text("""
                SELECT id, title, description, category_id AS category, min_team_size, max_team_size, organizer_id AS created_by 
                FROM hackloop.events 
                WHERE id = :eid
            """),
            {"eid": event_id}
        ).mappings().first()

        if not event_row:
            raise ValueError(f"Event {event_id} not found")

        # 2. Check if an assessment already exists in hackloop.assessments
        assessment_row = self.db.execute(
            text("""
                SELECT id, title, description, version, status 
                FROM hackloop.assessments 
                WHERE event_id = :eid 
                ORDER BY version DESC LIMIT 1
            """),
            {"eid": event_id}
        ).mappings().first()

        assessment_id = None
        if assessment_row:
            assessment_id = assessment_row["id"]
            title = assessment_row["title"]
            description = assessment_row["description"]
        else:
            # Fetch event roles and skills to personalize generation
            roles_rows = self.db.execute(
                text("SELECT name FROM hackloop.event_roles WHERE event_id = :eid"),
                {"eid": event_id}
            ).fetchall()
            required_roles = [r[0] for r in roles_rows]

            skills_rows = self.db.execute(
                text("""
                    SELECT DISTINCT s.name 
                    FROM hackloop.event_roles r 
                    JOIN hackloop.event_role_skills rs ON rs.event_role_id = r.id 
                    JOIN hackloop.skills s ON s.id = rs.skill_id 
                    WHERE r.event_id = :eid
                """),
                {"eid": event_id}
            ).fetchall()
            required_skills = [s[0] for s in skills_rows]

            # Fetch candidate details
            user_row = self.db.execute(
                text("SELECT display_name FROM hackloop.users WHERE id = :uid"),
                {"uid": user_id}
            ).mappings().first()
            cand_name = user_row["display_name"] if user_row else "Participant"

            # Generate questions via AI Provider
            generated_questions = await self.ai.generate_event_assessment(
                event_title=event_row["title"],
                category=event_row["category"] or "General",
                description=event_row["description"] or "",
                required_roles=required_roles,
                required_skills=required_skills,
                candidate_info={"name": cand_name, "user_id": str(user_id)}
            )

            # Insert assessment record
            title = f"{event_row['title']} – Candidate & Teamwork Assessment"
            description = f"Tailored skill verification and collaboration alignment assessment for {event_row['title']}."
            assessment_id = uuid.uuid4()

            self.db.execute(
                text("""
                    INSERT INTO hackloop.assessments (id, event_id, title, description, version, status, created_by, published_at)
                    VALUES (:id, :eid, :title, :desc, 1, 'published', :creator, now())
                """),
                {
                    "id": assessment_id,
                    "eid": event_id,
                    "title": title,
                    "desc": description,
                    "creator": event_row["created_by"] or user_id
                }
            )

            # Insert questions
            for idx, q in enumerate(generated_questions, start=1):
                q_id = uuid.uuid4()
                # Store options as JSON string or dict
                options_data = q.options if isinstance(q.options, list) else []
                rubric_data = {"category": q.category, "guidelines": q.rubric_guidelines}
                
                import json
                self.db.execute(
                    text("""
                        INSERT INTO hackloop.assessment_questions 
                        (id, assessment_id, order_index, question_text, question_type, skill_target, options, rubric)
                        VALUES (:id, :aid, :idx, :txt, :qtype, :target, CAST(:opts AS jsonb), CAST(:rubric AS jsonb))
                    """),
                    {
                        "id": q_id,
                        "aid": assessment_id,
                        "idx": idx,
                        "txt": q.question_text,
                        "qtype": q.question_type or "multiple_choice",
                        "target": q.skill_target or "General",
                        "opts": json.dumps(options_data),
                        "rubric": json.dumps(rubric_data)
                    }
                )
            self.db.commit()

        # 3. Fetch questions
        questions_rows = self.db.execute(
            text("""
                SELECT id, order_index, question_text, question_type, skill_target, options, rubric
                FROM hackloop.assessment_questions
                WHERE assessment_id = :aid
                ORDER BY order_index ASC
            """),
            {"aid": assessment_id}
        ).mappings().all()

        questions_list = []
        for qr in questions_rows:
            opts = qr["options"]
            if isinstance(opts, dict) and "options" in opts:
                opts = opts["options"]
            elif not isinstance(opts, list):
                opts = []

            category = "skill_assessment"
            if qr.get("rubric") and isinstance(qr["rubric"], dict):
                category = qr["rubric"].get("category", "skill_assessment")

            questions_list.append({
                "id": qr["id"],
                "order_index": qr["order_index"],
                "question_text": qr["question_text"],
                "question_type": qr["question_type"],
                "skill_target": qr["skill_target"],
                "category": category,
                "options": opts
            })

        # 4. Check if participant has already submitted
        submission_row = self.db.execute(
            text("""
                SELECT id, status, submitted_at 
                FROM hackloop.assessment_submissions 
                WHERE assessment_id = :aid AND user_id = :uid
            """),
            {"aid": assessment_id, "uid": user_id}
        ).mappings().first()

        return {
            "assessment_id": assessment_id,
            "event_id": event_id,
            "event_title": event_row["title"],
            "title": title,
            "description": description,
            "questions": questions_list,
            "already_submitted": bool(submission_row and submission_row["status"] == "submitted"),
            "submission_id": submission_row["id"] if submission_row else None
        }

    async def get_assessment_suggestions(
        self,
        event_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Provides evidence-grounded AI suggestions for assessment questions. Never fabricates facts."""
        # 1. Fetch the assessment questions
        assessment_info = await self.get_or_generate_event_assessment(event_id, user_id)
        questions = assessment_info["questions"]

        # 2. Gather candidate evidence: Resume, GitHub, Profile Skills
        resume_text = self.analysis_service.extract_resume_text(user_id) or ""
        
        profile_row = self.db.execute(
            text("SELECT github_url, bio FROM hackloop.profiles WHERE user_id = :uid"),
            {"uid": user_id}
        ).mappings().first()

        user_row = self.db.execute(
            text("SELECT display_name FROM hackloop.users WHERE id = :uid"),
            {"uid": user_id}
        ).mappings().first()

        github_url = profile_row["github_url"] if profile_row else None
        github_repos = await self.analysis_service.fetch_github_repos(github_url)

        skills_rows = self.db.execute(
            text("""
                SELECT s.name AS skill_name, us.proficiency 
                FROM hackloop.user_skills us 
                JOIN hackloop.skills s ON s.id = us.skill_id 
                WHERE us.user_id = :uid
            """),
            {"uid": user_id}
        ).mappings().all()

        candidate_evidence = {
            "candidate_name": user_row["display_name"] if user_row else "Participant",
            "github_username": github_url,
            "resume_text": resume_text,
            "github_repos": github_repos,
            "skills": [dict(s) for s in skills_rows],
            "bio": profile_row["bio"] if profile_row else ""
        }

        # 3. Call AI provider for grounded suggestions
        suggestions = await self.ai.suggest_assessment_answers(
            questions=questions,
            candidate_evidence=candidate_evidence
        )

        evidence_count = sum(1 for s in suggestions if s.get("evidence_found"))
        evidence_summary = (
            f"Found concrete evidence for {evidence_count} of {len(questions)} questions from "
            f"{'uploaded resume' if resume_text else ''}{' and ' if resume_text and github_repos else ''}"
            f"{'GitHub repos' if github_repos else 'profile'}. "
            f"Questions without verified evidence have no suggestion to avoid treating guesses as facts."
        )

        return {
            "event_id": event_id,
            "participant_id": user_id,
            "suggestions": suggestions,
            "evidence_summary": evidence_summary,
            "note": "AI suggestions are strictly grounded in your verified evidence. You can review, edit, or replace them freely."
        }

    async def submit_assessment(
        self,
        event_id: uuid.UUID,
        user_id: uuid.UUID,
        answers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Saves assessment submission and answers against participant & event, and updates event profile."""
        assessment_info = await self.get_or_generate_event_assessment(event_id, user_id)
        aid = assessment_info["assessment_id"]

        now = datetime.now(timezone.utc)

        # Check existing submission
        sub_row = self.db.execute(
            text("SELECT id FROM hackloop.assessment_submissions WHERE assessment_id = :aid AND user_id = :uid"),
            {"aid": aid, "uid": user_id}
        ).mappings().first()

        if sub_row:
            sub_id = sub_row["id"]
            self.db.execute(
                text("UPDATE hackloop.assessment_submissions SET status = 'submitted', submitted_at = :now WHERE id = :sid"),
                {"sid": sub_id, "now": now}
            )
            # Delete old answers to support clean resubmission
            self.db.execute(
                text("DELETE FROM hackloop.assessment_answers WHERE submission_id = :sid"),
                {"sid": sub_id}
            )
        else:
            sub_id = uuid.uuid4()
            self.db.execute(
                text("""
                    INSERT INTO hackloop.assessment_submissions (id, assessment_id, user_id, status, started_at, submitted_at)
                    VALUES (:id, :aid, :uid, 'submitted', :now, :now)
                """),
                {"id": sub_id, "aid": aid, "uid": user_id, "now": now}
            )

        # Insert answers
        for ans in answers:
            qid = ans.get("question_id")
            if isinstance(qid, str):
                qid = uuid.UUID(qid)
            txt = ans.get("answer_text", "")
            
            ans_id = uuid.uuid4()
            self.db.execute(
                text("""
                    INSERT INTO hackloop.assessment_answers (id, submission_id, question_id, answer_text, submitted_at)
                    VALUES (:id, :sid, :qid, :txt, :now)
                """),
                {"id": ans_id, "sid": sub_id, "qid": qid, "txt": txt, "now": now}
            )

        self.db.commit()

        # Trigger secondary event profile creation/refresh
        from backend.app.services.secondary_profile_service import SecondaryProfileService
        profile_svc = SecondaryProfileService(self.db)
        event_profile = await profile_svc.get_or_create_event_profile(
            event_id=event_id,
            user_id=user_id,
            force_refresh=True
        )

        return {
            "submission_id": sub_id,
            "assessment_id": aid,
            "event_id": event_id,
            "user_id": user_id,
            "status": "submitted",
            "submitted_at": now,
            "answers_count": len(answers),
            "event_profile_created": bool(event_profile),
            "event_profile_id": event_profile.get("id") if event_profile else None
        }
