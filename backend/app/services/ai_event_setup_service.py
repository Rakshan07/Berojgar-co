import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.integrations.ai.factory import get_ai_provider
from backend.app.models.event import Event, EventRequirement, EventRole
from backend.app.models.profile import Skill
from backend.app.models.assessment import AssessmentQuestionDraft
from backend.app.models.ai_setup import AIEventSetup
from backend.app.schemas.ai_setup import AISetupRequest, AISetupApproveRequest

class AIEventSetupService:
    def __init__(self, db: Session):
        self.db = db
        self.provider = get_ai_provider()

    async def generate_draft(
        self,
        event_id: uuid.UUID,
        organizer_id: uuid.UUID,
        req: AISetupRequest
    ) -> AIEventSetup:
        event = self.db.get(Event, event_id)
        if not event:
            raise ValueError("Event not found")
        if event.organizer_id != organizer_id:
            raise PermissionError("Only the organizer can generate AI event setup")

        # Get known skill library catalog
        known_skills = list(self.db.scalars(select(Skill.name).limit(40)).all())

        category = req.category or event.category_id
        constraints = {
            "min_team_size": event.min_team_size,
            "max_team_size": event.max_team_size,
            "mode": event.mode,
            "focus_areas": req.focus_areas or []
        }

        # Create record in pending state
        setup_record = AIEventSetup(
            event_id=event.id,
            organizer_id=organizer_id,
            provider=settings.AI_PROVIDER,
            model=settings.AI_MODEL,
            prompt_version="v1",
            request_context={"category": category, "constraints": constraints},
            status="pending"
        )
        self.db.add(setup_record)
        self.db.flush()

        try:
            output = await self.provider.generate_event_setup(
                event_title=event.title,
                category=category,
                description=event.description + (f"\n{req.additional_context}" if req.additional_context else ""),
                constraints=constraints,
                known_skills=known_skills
            )

            setup_record.suggested_roles = [r.model_dump() for r in output.suggested_roles]
            setup_record.suggested_requirements = [r.model_dump() for r in output.suggested_requirements]
            setup_record.suggested_questions = [q.model_dump() for q in output.suggested_questions]
            setup_record.explanation = output.explanation
            setup_record.status = "generated"
            self.db.commit()
            self.db.refresh(setup_record)
            return setup_record

        except Exception as e:
            logger.error(f"Failed to generate event setup: {e}")
            setup_record.status = "failed"
            setup_record.error_message = str(e)
            self.db.commit()
            self.db.refresh(setup_record)
            raise ValueError(f"AI event setup generation failed: {e}")

    def get_generation(self, generation_id: uuid.UUID) -> Optional[AIEventSetup]:
        return self.db.get(AIEventSetup, generation_id)

    def approve_generation(
        self,
        generation_id: uuid.UUID,
        organizer_id: uuid.UUID,
        req: AISetupApproveRequest
    ) -> AIEventSetup:
        setup_record = self.get_generation(generation_id)
        if not setup_record:
            raise ValueError("AI setup generation record not found")
        if setup_record.organizer_id != organizer_id:
            raise PermissionError("Only the organizer can approve this generation")

        event = self.db.get(Event, setup_record.event_id)
        if not event:
            raise ValueError("Event not found")

        # Roles to save
        roles_to_add = req.approved_roles or [
            type("Obj", (), r)() for r in setup_record.suggested_roles
        ]
        for role_data in (req.approved_roles or []):
            role_item = EventRole(
                event_id=event.id,
                name=role_data.name,
                description=role_data.description,
                suggested_count=role_data.suggested_count
            )
            self.db.add(role_item)

        # Requirements to save
        for req_data in (req.approved_requirements or []):
            req_item = EventRequirement(
                event_id=event.id,
                skill_name=req_data.skill_name,
                category=req_data.category,
                required=req_data.required,
                min_proficiency=req_data.min_proficiency,
                target_count=req_data.target_count,
                priority=req_data.priority,
                is_custom=True
            )
            self.db.add(req_item)

        # Questions to save as drafts
        for q_data in (req.approved_questions or []):
            q_draft = AssessmentQuestionDraft(
                event_id=event.id,
                source="ai_generated",
                question_text=q_data.question_text,
                skill_target=q_data.skill_target,
                suggested_rubric={"guidelines": q_data.rubric_guidelines} if q_data.rubric_guidelines else {},
                status="approved"
            )
            self.db.add(q_draft)

        setup_record.status = "approved"
        self.db.commit()
        self.db.refresh(setup_record)
        return setup_record
