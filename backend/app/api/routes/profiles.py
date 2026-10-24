from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.profile_service import ProfileService, PROFICIENCY_MAP
from backend.app.schemas.profile import (
    ProfileResponse,
    ProfileUpdate,
    UserSkillCreate,
    UserSkillResponse,
    SkillResponse,
)
from backend.app.schemas.common import MessageResponse
from backend.app.api.dependencies import get_current_user
from backend.app.models.auth import User
from backend.app.schemas.ai_setup import (
    ProfileEvidenceExtractionRequest,
    ProfileEvidenceExtractionResponse,
    ApplyEvidenceRequest,
)
from backend.app.integrations.ai.factory import get_ai_provider

router = APIRouter(prefix="/profiles", tags=["Profiles & Skills"])


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = ProfileService(db)
    profile = service.get_profile_by_user_id(current_user.id)
    skills = service.get_user_skills(current_user.id)

    skills_res = [
        UserSkillResponse(
            id=us.id,
            skill_id=us.skill_id,
            skill_name=us.skill.name if us.skill else us.skill_id,
            category=us.skill.category_id if us.skill else "General",
            proficiency=us.proficiency,
            proficiency_label=PROFICIENCY_MAP.get(us.proficiency, "Exploring"),
            is_self_declared=us.is_self_declared,
            evidence_count=us.evidence_count,
            last_assessed_at=us.last_assessed_at
        )
        for us in skills
    ]

    return ProfileResponse(
        id=profile.id if profile else current_user.id,
        user_id=current_user.id,
        full_name=current_user.full_name,
        username=current_user.username,
        avatar_url=current_user.avatar_url,
        tagline=profile.tagline if profile else None,
        bio=profile.bio if profile else None,
        timezone=profile.timezone if profile else "UTC",
        hours_per_week=profile.hours_per_week if profile else 15,
        availability_constraints=profile.availability_constraints if profile else [],
        preferred_roles=profile.preferred_roles if profile else [],
        interests=profile.interests if profile else [],
        github_url=profile.github_url if profile else None,
        portfolio_url=profile.portfolio_url if profile else None,
        linkedin_url=profile.linkedin_url if profile else None,
        evidence_count=profile.evidence_count if profile else 0,
        skills=skills_res,
        created_at=profile.created_at if profile else current_user.created_at,
        updated_at=profile.updated_at if profile else current_user.updated_at
    )

@router.patch("/me", response_model=ProfileResponse)
def update_my_profile(
    req: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ProfileService(db)
    service.update_profile(current_user.id, req)
    return get_my_profile(current_user=current_user, db=db)

@router.get("/me/skills", response_model=List[UserSkillResponse])
def get_my_skills(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = ProfileService(db)
    skills = service.get_user_skills(current_user.id)
    return [
        UserSkillResponse(
            id=us.id,
            skill_id=us.skill_id,
            skill_name=us.skill.name if us.skill else us.skill_id,
            category=us.skill.category_id if us.skill else "General",
            proficiency=us.proficiency,
            proficiency_label=PROFICIENCY_MAP.get(us.proficiency, "Exploring"),
            is_self_declared=us.is_self_declared,
            evidence_count=us.evidence_count,
            last_assessed_at=us.last_assessed_at
        )
        for us in skills
    ]

@router.post("/me/skills", response_model=UserSkillResponse)
def add_my_skill(
    req: UserSkillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        service = ProfileService(db)
        us = service.add_user_skill(current_user.id, req)
        return UserSkillResponse(
            id=us.id,
            skill_id=us.skill_id,
            skill_name=us.skill.name if us.skill else us.skill_id,
            category=us.skill.category_id if us.skill else "General",
            proficiency=us.proficiency,
            proficiency_label=PROFICIENCY_MAP.get(us.proficiency, "Exploring"),
            is_self_declared=us.is_self_declared,
            evidence_count=us.evidence_count,
            last_assessed_at=us.last_assessed_at
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/me/skills/{skill_id}", response_model=MessageResponse)
def remove_my_skill(
    skill_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ProfileService(db)
    if not service.remove_user_skill(current_user.id, skill_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found on profile")
    return MessageResponse(message="Skill removed successfully")

@router.get("/skills", response_model=List[SkillResponse])
def list_skill_catalog(category_id: Optional[str] = None, db: Session = Depends(get_db)):
    service = ProfileService(db)
    return service.list_skills(category_id)

@router.post("/analyze-evidence", response_model=ProfileEvidenceExtractionResponse)
async def analyze_profile_evidence(
    req: ProfileEvidenceExtractionRequest,
    current_user: User = Depends(get_current_user)
):
    provider = get_ai_provider()
    candidate_name = req.candidate_name or current_user.full_name or current_user.username
    return await provider.analyze_profile_evidence(
        content=req.content,
        source_type=req.source_type,
        candidate_name=candidate_name
    )

@router.post("/upload-evidence", response_model=ProfileEvidenceExtractionResponse)
async def upload_and_analyze_evidence(
    file: UploadFile = File(...),
    source_type: str = "resume",
    current_user: User = Depends(get_current_user)
):
    provider = get_ai_provider()
    candidate_name = current_user.full_name or current_user.username
    file_bytes = await file.read()
    mime_type = file.content_type or "application/octet-stream"

    # Normalize extension-based mime type if needed
    fn_lower = (file.filename or "").lower()
    if fn_lower.endswith(".pdf"):
        mime_type = "application/pdf"
    elif fn_lower.endswith((".png", ".jpg", ".jpeg", ".webp")):
        if fn_lower.endswith(".png"):
            mime_type = "image/png"
        elif fn_lower.endswith((".jpg", ".jpeg")):
            mime_type = "image/jpeg"
        elif fn_lower.endswith(".webp"):
            mime_type = "image/webp"

    content = None
    if mime_type.startswith("text/") or fn_lower.endswith((".txt", ".md")):
        try:
            content = file_bytes.decode("utf-8")
        except Exception:
            pass

    return await provider.analyze_profile_evidence(
        content=content,
        source_type=source_type,
        candidate_name=candidate_name,
        file_bytes=file_bytes,
        mime_type=mime_type
    )


@router.post("/apply-evidence", response_model=ProfileResponse)
def apply_extracted_evidence(
    req: ApplyEvidenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ProfileService(db)
    
    # 1. Update bio / roles / interests if provided
    update_data = {}
    if req.bio:
        update_data["bio"] = req.bio
    if req.preferred_roles:
        update_data["preferred_roles"] = req.preferred_roles
    if req.interests:
        update_data["interests"] = req.interests
    if update_data:
        service.update_profile(current_user.id, ProfileUpdate(**update_data))

    # 2. Add or update skills with evidence
    for skill_ev in req.extracted_skills:
        skill = service.ensure_skill(skill_ev.skill_name, skill_ev.category)
        service.add_user_skill(
            current_user.id,
            UserSkillCreate(
                skill_id=skill.id,
                proficiency=skill_ev.estimated_proficiency,
                is_self_declared=not skill_ev.is_verified
            )
        )

    return get_my_profile(current_user=current_user, db=db)

