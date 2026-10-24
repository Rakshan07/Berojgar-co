import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.models.profile import Profile, Skill, UserSkill, SkillCategory
from backend.app.schemas.profile import ProfileUpdate, UserSkillCreate, UserSkillUpdate

PROFICIENCY_MAP = {
    1: "Exploring",
    2: "Developing",
    3: "Independent",
    4: "Advanced / Can mentor"
}

class ProfileService:
    def __init__(self, db: Session):
        self.db = db

    def get_profile_by_user_id(self, user_id: uuid.UUID) -> Optional[Profile]:
        return self.db.scalars(
            select(Profile).where(Profile.user_id == user_id)
        ).first()

    def update_profile(self, user_id: uuid.UUID, req: ProfileUpdate) -> Profile:
        profile = self.get_profile_by_user_id(user_id)
        if not profile:
            profile = Profile(user_id=user_id)
            self.db.add(profile)

        update_data = req.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            if val is not None:
                setattr(profile, key, val)

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def get_user_skills(self, user_id: uuid.UUID) -> List[UserSkill]:
        return list(self.db.scalars(
            select(UserSkill).where(UserSkill.user_id == user_id)
        ).all())

    def add_user_skill(self, user_id: uuid.UUID, req: UserSkillCreate) -> UserSkill:
        # Check skill exists
        skill = self.db.get(Skill, req.skill_id)
        if not skill:
            raise ValueError(f"Skill with id '{req.skill_id}' does not exist")

        existing = self.db.scalars(
            select(UserSkill).where(UserSkill.user_id == user_id, UserSkill.skill_id == req.skill_id)
        ).first()

        if existing:
            existing.proficiency = req.proficiency
            existing.is_self_declared = req.is_self_declared
            self.db.commit()
            self.db.refresh(existing)
            return existing

        user_skill = UserSkill(
            user_id=user_id,
            skill_id=req.skill_id,
            proficiency=req.proficiency,
            is_self_declared=req.is_self_declared,
            evidence_count=1 if not req.is_self_declared else 0
        )
        self.db.add(user_skill)
        self.db.commit()
        self.db.refresh(user_skill)
        return user_skill

    def remove_user_skill(self, user_id: uuid.UUID, skill_id: str) -> bool:
        user_skill = self.db.scalars(
            select(UserSkill).where(UserSkill.user_id == user_id, UserSkill.skill_id == skill_id)
        ).first()
        if not user_skill:
            return False
        self.db.delete(user_skill)
        self.db.commit()
        return True

    def list_skills(self, category_id: Optional[str] = None) -> List[Skill]:
        query = select(Skill)
        if category_id:
            query = query.where(Skill.category_id == category_id)
        return list(self.db.scalars(query).all())
