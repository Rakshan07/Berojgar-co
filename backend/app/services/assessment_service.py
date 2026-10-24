import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from backend.app.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentSubmission,
    AssessmentAnswer,
    SubmissionEvaluation,
)
from backend.app.schemas.assessment import AssessmentCreate, SubmissionCreate, SubmissionEvaluationCreate

class AssessmentService:
    def __init__(self, db: Session):
        self.db = db

    def create_assessment(self, event_id: uuid.UUID, creator_id: uuid.UUID, req: AssessmentCreate) -> Assessment:
        # Determine next version
        existing_versions = self.db.scalars(
            select(Assessment.version).where(Assessment.event_id == event_id)
        ).all()
        next_ver = max(existing_versions, default=0) + 1

        assessment = Assessment(
            event_id=event_id,
            title=req.title,
            description=req.description,
            version=next_ver,
            status="draft",
            created_by=creator_id
        )
        self.db.add(assessment)
        self.db.flush()

        for q in req.questions:
            q_item = AssessmentQuestion(
                assessment_id=assessment.id,
                order_index=q.order_index,
                question_text=q.question_text,
                question_type=q.question_type,
                skill_target=q.skill_target,
                options=q.options,
                rubric=q.rubric
            )
            self.db.add(q_item)

        self.db.commit()
        self.db.refresh(assessment)
        return assessment

    def publish_assessment(self, assessment_id: uuid.UUID, organizer_id: uuid.UUID) -> Assessment:
        assessment = self.db.get(Assessment, assessment_id)
        if not assessment:
            raise ValueError("Assessment not found")
        if assessment.status == "published":
            raise ValueError("Assessment is already published (published versions are immutable)")

        assessment.status = "published"
        assessment.published_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(assessment)
        return assessment

    def get_assessment(self, assessment_id: uuid.UUID, is_organizer: bool = False) -> Optional[Assessment]:
        assessment = self.db.scalars(
            select(Assessment)
            .options(joinedload(Assessment.questions))
            .where(Assessment.id == assessment_id)
        ).unique().first()

        if assessment and not is_organizer:
            # Strip server-side rubric for participant safety
            for q in assessment.questions:
                q.rubric = None

        return assessment

    def submit_answers(self, assessment_id: uuid.UUID, user_id: uuid.UUID, req: SubmissionCreate) -> AssessmentSubmission:
        assessment = self.db.get(Assessment, assessment_id)
        if not assessment or assessment.status != "published":
            raise ValueError("Cannot submit answers to an unverified or unpublished assessment")

        submission = self.db.scalars(
            select(AssessmentSubmission).where(
                AssessmentSubmission.assessment_id == assessment_id,
                AssessmentSubmission.user_id == user_id
            )
        ).first()

        if not submission:
            submission = AssessmentSubmission(
                assessment_id=assessment_id,
                user_id=user_id,
                status="submitted",
                submitted_at=datetime.now(timezone.utc)
            )
            self.db.add(submission)
            self.db.flush()
        else:
            submission.status = "submitted"
            submission.submitted_at = datetime.now(timezone.utc)

        for ans in req.answers:
            ans_record = AssessmentAnswer(
                submission_id=submission.id,
                question_id=ans.question_id,
                answer_text=ans.answer_text,
                file_reference=ans.file_reference
            )
            self.db.add(ans_record)

        self.db.commit()
        self.db.refresh(submission)
        return submission

    def evaluate_submission(
        self,
        submission_id: uuid.UUID,
        evaluator_id: Optional[uuid.UUID],
        req: SubmissionEvaluationCreate
    ) -> SubmissionEvaluation:
        sub = self.db.get(AssessmentSubmission, submission_id)
        if not sub:
            raise ValueError("Submission not found")

        eval_record = SubmissionEvaluation(
            submission_id=submission_id,
            evaluator_id=evaluator_id,
            evaluator_type=req.evaluator_type,
            score=req.score,
            rubric_scores=req.rubric_scores,
            feedback_notes=req.feedback_notes
        )
        self.db.add(eval_record)
        sub.status = "evaluated"
        self.db.commit()
        self.db.refresh(eval_record)
        return eval_record
