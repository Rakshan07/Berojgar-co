import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.ai_event_setup_service import AIEventSetupService
from backend.app.schemas.ai_setup import AISetupRequest, AISetupResponse, AISetupApproveRequest
from backend.app.api.dependencies import get_current_user, require_role
from backend.app.models.auth import User

router = APIRouter(prefix="/events/{event_id}/ai-setup", tags=["AI Event Assistant"])

@router.post("", response_model=AISetupResponse, status_code=status.HTTP_201_CREATED)
async def generate_ai_event_setup(
    event_id: uuid.UUID,
    req: AISetupRequest,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = AIEventSetupService(db)
        record = await service.generate_draft(event_id, current_user.id, req)
        return AISetupResponse(
            generation_id=record.id,
            event_id=record.event_id,
            provider=record.provider,
            model=record.model,
            prompt_version=record.prompt_version,
            suggested_roles=record.suggested_roles,
            suggested_requirements=record.suggested_requirements,
            suggested_questions=record.suggested_questions,
            explanation=record.explanation,
            status=record.status,
            error_message=record.error_message,
            created_at=record.created_at
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{generation_id}", response_model=AISetupResponse)
def get_ai_setup_draft(
    event_id: uuid.UUID,
    generation_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    service = AIEventSetupService(db)
    record = service.get_generation(generation_id)
    if not record or record.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation record not found")
    return AISetupResponse(
        generation_id=record.id,
        event_id=record.event_id,
        provider=record.provider,
        model=record.model,
        prompt_version=record.prompt_version,
        suggested_roles=record.suggested_roles,
        suggested_requirements=record.suggested_requirements,
        suggested_questions=record.suggested_questions,
        explanation=record.explanation,
        status=record.status,
        error_message=record.error_message,
        created_at=record.created_at
    )

@router.post("/{generation_id}/approve", response_model=AISetupResponse)
def approve_ai_setup_draft(
    event_id: uuid.UUID,
    generation_id: uuid.UUID,
    req: AISetupApproveRequest,
    current_user: User = Depends(require_role(["organizer", "admin"])),
    db: Session = Depends(get_db)
):
    try:
        service = AIEventSetupService(db)
        record = service.approve_generation(generation_id, current_user.id, req)
        return AISetupResponse(
            generation_id=record.id,
            event_id=record.event_id,
            provider=record.provider,
            model=record.model,
            prompt_version=record.prompt_version,
            suggested_roles=record.suggested_roles,
            suggested_requirements=record.suggested_requirements,
            suggested_questions=record.suggested_questions,
            explanation=record.explanation,
            status=record.status,
            error_message=record.error_message,
            created_at=record.created_at
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
