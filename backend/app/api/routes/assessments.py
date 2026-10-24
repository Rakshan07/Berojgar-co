import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.assessment_service import AssessmentService
from backend.app.schemas.assessment import (
    AssessmentCreate,
    AssessmentResponse,
    AssessmentQuestionResponse,
    SubmissionCreate,
    SubmissionResponse,
    SubmissionEvaluationCreate,
    SubmissionEvaluationResponse,
)
from backend.app.api.dependencies import get_current_user, require_role
from backend.app.models.auth import User

router = APIRouter(tags=["Assessments & Evidence"])

def map_assessment_response(assessment) -> AssessmentResponse:
    return AssessmentResponse(
        id=assessment.id,
        event_id=assessment.event_id,
        title=assessment.title,
        description=assessment.description,
        version=assessment.version,
        status=assessment.status,
        created_by=assessment.created_by,
        created_at=assessment.created_at,
        published_at=assessment.published_at,
        questions=[
            AssessmentQuestionResponse(
                id=q.id,
                assessment_id=q.assessment_id,
                order_index=q.order_index,
                question_text=q.question_text,
                question_type=q.question_type,
                skill_target=q.skill_target,
                options=q.options,
                rubric=q.rubric
            )
            for q in assessment.questions
        ]
    )

@router.post("/events/{event_id}/assessments", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_assessment(
    event_id: uuid.UUID,
    req: AssessmentCreate,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    service = AssessmentService(db)
    assessment = service.create_assessment(event_id, current_user.id, req)
    return map_assessment_response(assessment)

@router.post("/assessments/{assessment_id}/publish", response_model=AssessmentResponse)
def publish_assessment(
    assessment_id: uuid.UUID,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = AssessmentService(db)
        assessment = service.publish_assessment(assessment_id, current_user.id)
        return map_assessment_response(assessment)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/assessments/{assessment_id}", response_model=AssessmentResponse)
def get_assessment(
    assessment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AssessmentService(db)
    is_org = any(r.id in ("organizer", "admin") for r in current_user.roles)
    assessment = service.get_assessment(assessment_id, is_organizer=is_org)
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    return map_assessment_response(assessment)

@router.post("/assessments/{assessment_id}/submissions", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
def submit_assessment(
    assessment_id: uuid.UUID,
    req: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        service = AssessmentService(db)
        sub = service.submit_answers(assessment_id, current_user.id, req)
        return SubmissionResponse(
            id=sub.id,
            assessment_id=sub.assessment_id,
            user_id=sub.user_id,
            status=sub.status,
            started_at=sub.started_at,
            submitted_at=sub.submitted_at,
            evaluations=[]
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/submissions/{submission_id}/evaluate", response_model=SubmissionEvaluationResponse)
def evaluate_submission(
    submission_id: uuid.UUID,
    req: SubmissionEvaluationCreate,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = AssessmentService(db)
        eval_record = service.evaluate_submission(submission_id, current_user.id, req)
        return SubmissionEvaluationResponse(
            id=eval_record.id,
            submission_id=eval_record.submission_id,
            evaluator_id=eval_record.evaluator_id,
            evaluator_type=eval_record.evaluator_type,
            model_id=eval_record.model_id,
            score=eval_record.score,
            rubric_scores=eval_record.rubric_scores,
            feedback_notes=eval_record.feedback_notes,
            evaluated_at=eval_record.evaluated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
