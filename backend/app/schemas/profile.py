import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class SkillResponse(BaseModel):
    id: str
    name: str
    category_id: str
    description: Optional[str] = None
    is_verified: bool

    class Config:
        from_attributes = True

class UserSkillBase(BaseModel):
    skill_id: str
    proficiency: int = Field(..., ge=1, le=4, description="1=Exploring, 2=Developing, 3=Independent, 4=Advanced")
    is_self_declared: bool = True

class UserSkillCreate(UserSkillBase):
    pass

class UserSkillUpdate(BaseModel):
    proficiency: int = Field(..., ge=1, le=4)
    is_self_declared: Optional[bool] = None

class UserSkillResponse(BaseModel):
    id: uuid.UUID
    skill_id: str
    skill_name: Optional[str] = None
    category: Optional[str] = None
    proficiency: int
    proficiency_label: Optional[str] = None
    is_self_declared: bool
    evidence_count: int
    last_assessed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    tagline: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = None
    timezone: Optional[str] = Field(None, max_length=50)
    hours_per_week: Optional[int] = Field(None, ge=0, le=168)
    availability_constraints: Optional[List[str]] = None
    preferred_roles: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None

class ProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    username: str
    avatar_url: Optional[str] = None
    tagline: Optional[str] = None
    bio: Optional[str] = None
    timezone: str
    hours_per_week: int
    availability_constraints: List[str] = []
    preferred_roles: List[str] = []
    interests: List[str] = []
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    evidence_count: int
    skills: List[UserSkillResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
