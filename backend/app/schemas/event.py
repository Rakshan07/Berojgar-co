import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class EventCategoryResponse(BaseModel):
    id: str
    name: str
    color: str
    is_custom: bool

    class Config:
        from_attributes = True

class EventRequirementCreate(BaseModel):
    skill_name: str
    skill_id: Optional[str] = None
    category: str = "Technical"
    required: bool = True
    min_proficiency: int = Field(default=2, ge=1, le=4)
    target_count: int = Field(default=1, ge=1)
    priority: int = 1
    role_association: Optional[str] = None
    is_custom: bool = False

class EventRequirementResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    skill_name: str
    skill_id: Optional[str] = None
    category: str
    required: bool
    min_proficiency: int
    target_count: int
    priority: int
    role_association: Optional[str] = None
    is_custom: bool

    class Config:
        from_attributes = True

class EventRoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    suggested_count: int = Field(default=1, ge=1)

class EventRoleResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    name: str
    description: Optional[str] = None
    suggested_count: int

    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    category_id: str
    description: str = Field(..., min_length=10)
    mode: str = Field(default="hybrid", pattern="^(in-person|remote|hybrid)$")
    location: Optional[str] = None
    min_team_size: int = Field(default=3, ge=1)
    max_team_size: int = Field(default=5, ge=1)
    start_date: datetime
    end_date: datetime
    registration_deadline: datetime
    max_participants: int = Field(default=100, ge=1)
    tags: List[str] = []
    requirements: List[EventRequirementCreate] = []
    roles: List[EventRoleCreate] = []

class EventUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None
    location: Optional[str] = None
    min_team_size: Optional[int] = None
    max_team_size: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    max_participants: Optional[int] = None
    tags: Optional[List[str]] = None

class EventResponse(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    category_id: str
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    description: str
    organizer_id: uuid.UUID
    organizer_name: Optional[str] = None
    organization_id: Optional[uuid.UUID] = None
    mode: str
    location: Optional[str] = None
    min_team_size: int
    max_team_size: int
    start_date: datetime
    end_date: datetime
    registration_deadline: datetime
    max_participants: int
    registered_count: int = 0
    status: str
    tags: List[str] = []
    requirements: List[EventRequirementResponse] = []
    roles: List[EventRoleResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EventRegistrationCreate(BaseModel):
    preferred_roles: List[str] = []

class EventRegistrationResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    status: str
    preferred_roles: List[str] = []
    registered_at: datetime
    withdrawn_at: Optional[datetime] = None

    class Config:
        from_attributes = True
