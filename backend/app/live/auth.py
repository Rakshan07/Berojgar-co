import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from sqlalchemy.exc import IntegrityError
from backend.app.db.session import get_db
from backend.app.core.security import hash_password, verify_password
from backend.app.core.config import settings
from .db import rows, one, execute, require

router = APIRouter(prefix='/auth', tags=['Authentication'])
bearer = HTTPBearer(auto_error=False)
class Registration(BaseModel):
    model_config = ConfigDict(extra='forbid')
    email: EmailStr
    full_name: str = Field(min_length=2,max_length=100)
    password: str = Field(min_length=8,max_length=128)
    role: Literal['participant','organizer'] = 'participant'
    organization: str | None = Field(default=None,max_length=200)
class Login(BaseModel):
    email_or_username: str = Field(min_length=1,max_length=254)
    password: str = Field(min_length=1,max_length=128)

def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()

def current_user(auth: HTTPAuthorizationCredentials | None = Depends(bearer), db=Depends(get_db)):
    require(auth,401,'Authentication required')
    user = one(db, '''SELECT u.id,u.email,u.display_name,u.email_verified_at,u.created_at
      FROM hackloop.auth_tokens t JOIN hackloop.users u ON u.id=t.user_id
      WHERE t.token_hash=:token AND t.purpose='session' AND t.revoked_at IS NULL
        AND t.consumed_at IS NULL AND t.expires_at>now() AND u.account_status='active' ''', token=token_hash(auth.credentials))
    require(user,401,'Invalid or expired session')
    user['roles'] = [r['role'] for r in rows(db,'SELECT role FROM hackloop.user_roles WHERE user_id=:uid',uid=user['id'])]
    user['full_name'] = user['display_name']
    user['onboarding_complete'] = bool((one(db,'SELECT onboarding_completed_at FROM hackloop.profiles WHERE user_id=:uid',uid=user['id']) or {}).get('onboarding_completed_at'))
    user['organizer_approved'] = bool(one(db,'''SELECT 1 FROM hackloop.organization_members m
      JOIN hackloop.organizer_verification_requests v ON v.organization_id=m.organization_id
      WHERE m.user_id=:uid AND m.role IN ('owner','manager') AND v.status='approved' ''',uid=user['id']))
    return user

@router.post('/register',status_code=201)
def register(body: Registration,db=Depends(get_db)):
    name=body.full_name.strip()
    require(len(name)>=2,422,'Enter your full name')
    if body.role=='organizer': require(body.organization and body.organization.strip(),422,'Organization name is required')
    try:
        user=one(db,'''INSERT INTO hackloop.users(email,display_name,password_hash)
          VALUES(:email,:name,:password) RETURNING id,email,display_name''',email=str(body.email).lower().strip(),name=name,password=hash_password(body.password))
        execute(db,'INSERT INTO hackloop.profiles(user_id) VALUES(:uid)',uid=user['id'])
        execute(db,"INSERT INTO hackloop.user_roles(user_id,role) VALUES(:uid,'participant')",uid=user['id'])
        if body.role=='organizer':
            org=one(db,'''INSERT INTO hackloop.organizations(name,slug,created_by) VALUES(:name,:slug,:uid) RETURNING id''',name=body.organization.strip(),slug='org-'+secrets.token_hex(12),uid=user['id'])
            execute(db,"INSERT INTO hackloop.organization_members(organization_id,user_id,role) VALUES(:oid,:uid,'owner')",oid=org['id'],uid=user['id'])
            # A role is not approval: event writes additionally require approved verification.
            execute(db,"INSERT INTO hackloop.user_roles(user_id,role) VALUES(:uid,'organizer')",uid=user['id'])
        db.commit()
        return {**user,'full_name':name,'verification_required':body.role=='organizer'}
    except IntegrityError:
        db.rollback()
        raise HTTPException(409,'This email is already registered')

@router.post('/login')
def login(body:Login,db=Depends(get_db)):
    user=one(db,'SELECT * FROM hackloop.users WHERE lower(email)=lower(:email)',email=body.email_or_username.strip())
    valid = verify_password(body.password,user['password_hash']) if user and user['password_hash'] else False
    require(valid and user['account_status']=='active',401,'Incorrect email or password')
    token=secrets.token_urlsafe(48)
    expires=datetime.now(timezone.utc)+timedelta(hours=settings.SESSION_EXPIRE_HOURS)
    execute(db,"INSERT INTO hackloop.auth_tokens(user_id,token_hash,purpose,expires_at) VALUES(:uid,:token,'session',:expires)",uid=user['id'],token=token_hash(token),expires=expires)
    roles=[r['role'] for r in rows(db,'SELECT role FROM hackloop.user_roles WHERE user_id=:uid',uid=user['id'])]
    db.commit()
    return {'access_token':token,'token_type':'bearer','user_id':user['id'],'roles':roles}

@router.get('/me')
def me(user=Depends(current_user)):
    return user

@router.post('/logout',status_code=204)
def logout(user=Depends(current_user),auth=Depends(bearer),db=Depends(get_db)):
    execute(db,'UPDATE hackloop.auth_tokens SET revoked_at=now() WHERE token_hash=:token AND user_id=:uid',token=token_hash(auth.credentials),uid=user['id'])
    db.commit()
