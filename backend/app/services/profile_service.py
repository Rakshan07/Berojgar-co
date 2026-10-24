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

    def ensure_skill(self, name: str, category: Optional[str] = None) -> Skill:
        # Normalize skill name
        clean_name = name.strip()
        slug = clean_name.lower().replace(" ", "-").replace("/", "-").replace(".", "-")[:50]
        
        # Check by id or name
        skill = self.db.scalars(
            select(Skill).where((Skill.id == slug) | (Skill.name.ilike(clean_name)))
        ).first()
        if skill:
            return skill

        valid_categories = ['Frontend', 'Backend', 'Design', 'Data', 'AI/ML', 'Research', 'Debate', 'Soft Skills', 'Management', 'Creative']
        matched_cat = "Backend"
        if category:
            for c in valid_categories:
                if c.lower() in category.lower() or category.lower() in c.lower():
                    matched_cat = c
                    break

        new_skill = Skill(
            id=slug,
            name=clean_name,
            category_id=matched_cat,
            description=f"Skill extracted from candidate evidence ({matched_cat})",
            is_verified=True
        )
        self.db.add(new_skill)
        self.db.commit()
        self.db.refresh(new_skill)
        return new_skill

    def list_skills(self, category_id: Optional[str] = None) -> List[Skill]:
        query = select(Skill)
        if category_id:
            query = query.where(Skill.category_id == category_id)
        return list(self.db.scalars(query).all())

