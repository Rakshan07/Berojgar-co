from typing import Annotated
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.app.db.session import get_db
from .auth import current_user
from .db import one, rows, execute, require
router=APIRouter(prefix='/profiles',tags=['Profiles'])
class ProfileUpdate(BaseModel):
    model_config=ConfigDict(extra='forbid')
    full_name: str | None = Field(default=None,min_length=2,max_length=100)
    bio: str | None = Field(default=None,max_length=4000)
    institution: str | None = Field(default=None,max_length=200)
    course: str | None = Field(default=None,max_length=200)
    study_year: int | None = Field(default=None,ge=1,le=12)  # Legacy clients only.
    academic_year: int | None = Field(default=None,ge=1900,le=2200)
    phone_number: str | None = Field(default=None,max_length=32)
    address_line_1: str | None = Field(default=None,max_length=250)
    city: str | None = Field(default=None,max_length=120)
    region: str | None = Field(default=None,max_length=120)
    postal_code: str | None = Field(default=None,max_length=32)
    country_code: str | None = Field(default=None,pattern='^[A-Z]{2}$')

@router.get('/me')
def profile(user=Depends(current_user),db=Depends(get_db)):
    p=one(db,'''SELECT p.*,d.phone_number,d.address_line_1,d.city,d.region,d.postal_code,d.country_code
      FROM hackloop.profiles p LEFT JOIN hackloop.profile_private_details d USING(user_id)
      WHERE p.user_id=:uid''',uid=user['id']) or {}
    skills=rows(db,'''SELECT s.id AS skill_id,s.name AS skill_name,s.category,us.proficiency
      FROM hackloop.user_skills us JOIN hackloop.skills s ON s.id=us.skill_id WHERE us.user_id=:uid ORDER BY s.name''',uid=user['id'])
    return {**p,'has_password':user['has_password'],'roles':user['roles'],'full_name':user['full_name'],'email':user['email'],'skills':skills,
            'address':', '.join(str(p.get(k)) for k in ['address_line_1','city','region','postal_code','country_code'] if p.get(k))}

def persist_profile(body,user,db,complete=False):
    fields=body.model_dump(exclude_unset=True)
    if 'full_name' in fields and fields['full_name'] is not None:
        execute(db,'UPDATE hackloop.users SET display_name=:name WHERE id=:uid',name=fields['full_name'].strip(),uid=user['id'])
    for table,allowed in [('profiles',('bio','institution','course','study_year','academic_year')),('profile_private_details',('phone_number','address_line_1','city','region','postal_code','country_code'))]:
        values={k:fields[k] for k in allowed if k in fields}
        if values:
            # Identifiers come only from the constant allowlist above; values stay bound.
            columns=', '.join(values)
            params=', '.join(':'+k for k in values)
            updates=', '.join(f'{k}=EXCLUDED.{k}' for k in values)
            execute(db,f'INSERT INTO hackloop.{table}(user_id,{columns}) VALUES(:uid,{params}) ON CONFLICT(user_id) DO UPDATE SET {updates}',uid=user['id'],**values)
    if complete:
        execute(db,'UPDATE hackloop.profiles SET onboarding_completed_at=now() WHERE user_id=:uid',uid=user['id'])
    db.commit()
    updated={**user,'full_name':fields.get('full_name') or user['full_name']}
    return profile(updated,db)

class OnboardingDetails(ProfileUpdate):
    full_name: str = Field(min_length=2,max_length=100)
    institution: str = Field(min_length=1,max_length=200)
    course: str = Field(min_length=1,max_length=200)
    academic_year: int = Field(ge=1900,le=2200)
    phone_number: str = Field(min_length=5,max_length=32)
    address_line_1: str = Field(min_length=1,max_length=250)
    city: str = Field(min_length=1,max_length=120)
    region: str = Field(min_length=1,max_length=120)
    postal_code: str = Field(min_length=1,max_length=32)
    country_code: str = Field(pattern='^[A-Z]{2}$')
    @field_validator('full_name','institution','course','phone_number','address_line_1','city','region','postal_code',mode='before')
    @classmethod
    def trim_required(cls,value):
        return value.strip() if isinstance(value,str) else value

@router.patch('/me')
def update(body:ProfileUpdate,user=Depends(current_user),db=Depends(get_db)):
    return persist_profile(body,user,db)

@router.post('/me/onboarding')
def complete_onboarding(body:OnboardingDetails,user=Depends(current_user),db=Depends(get_db)):
    require(user['has_password'],409,'Create your website password before completing your profile.')
    require('organizer' not in user['roles'],403,'Complete the organizer verification form instead')
    return persist_profile(body,user,db,complete=True)
