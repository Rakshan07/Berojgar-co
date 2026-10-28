from backend.app.core.security import valid_new_password, PASSWORD_GUIDE
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
    verification_token: str | None = Field(default=None,min_length=40,max_length=128)
    organization: str | None = Field(default=None,max_length=200)
class Login(BaseModel):
    required_role: Literal['participant','organizer'] | None = None
    email_or_username: str = Field(min_length=1,max_length=254)
    password: str = Field(min_length=1,max_length=128)

def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()

def current_user(auth: HTTPAuthorizationCredentials | None = Depends(bearer), db=Depends(get_db)):
    require(auth,401,'Authentication required')
    user = one(db, """SELECT u.id,u.email,u.display_name,u.email_verified_at,u.created_at,
      (u.password_hash IS NOT NULL) AS has_password,
      ARRAY(SELECT role FROM hackloop.user_roles WHERE user_id=u.id) AS roles,
      EXISTS(SELECT 1 FROM hackloop.profiles WHERE user_id=u.id AND onboarding_completed_at IS NOT NULL) AS participant_complete,
      EXISTS(SELECT 1 FROM hackloop.organizer_application_details d
        JOIN hackloop.organizer_verification_requests v ON v.id=d.request_id
        WHERE v.applicant_id=u.id AND v.status IN ('pending','approved')) AS organizer_complete,
      EXISTS(SELECT 1 FROM hackloop.organization_members m
        JOIN hackloop.organizer_verification_requests v ON v.organization_id=m.organization_id
        WHERE m.user_id=u.id AND m.role IN ('owner','manager') AND v.status='approved') AS organizer_approved
      FROM hackloop.auth_tokens t JOIN hackloop.users u ON u.id=t.user_id
      WHERE t.token_hash=:token AND t.purpose='session' AND t.revoked_at IS NULL
        AND t.consumed_at IS NULL AND t.expires_at>now() AND u.account_status='active' """, token=token_hash(auth.credentials))
    require(user,401,'Invalid or expired session')
    user['full_name'] = user['display_name']
    participant_complete=user.pop('participant_complete')
    organizer_complete=user.pop('organizer_complete')
    user['onboarding_complete'] = bool(user['has_password'] and (organizer_complete if 'organizer' in user['roles'] else participant_complete))
    return user

@router.post('/register',status_code=201)
def register(body: Registration,db=Depends(get_db)):
    require(valid_new_password(body.password),422,PASSWORD_GUIDE)
    name=body.full_name.strip()
    require(len(name)>=2,422,'Enter your full name')
    email=str(body.email).lower().strip()
    execute(db,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key='email:'+email)
    require(not one(db,'SELECT 1 FROM hackloop.users WHERE lower(email)=:email',email=email),409,'This email is already registered. Please sign in.')
    require(body.verification_token,422,'Verify your email before creating a password.')
    verified=one(db,"SELECT token_hash FROM hackloop.email_signup_links WHERE token_hash=:token AND email=:email AND role=:role AND consumed_at IS NULL AND expires_at>now() FOR UPDATE",token=token_hash(body.verification_token),email=email,role=body.role)
    require(verified,400,'This verification link is invalid or expired. Request a new link.')

    try:
        user=one(db,'''INSERT INTO hackloop.users(email,display_name,password_hash)
          VALUES(:email,:name,:password) RETURNING id,email,display_name''',email=str(body.email).lower().strip(),name=name,password=hash_password(body.password))
        execute(db,'INSERT INTO hackloop.profiles(user_id) VALUES(:uid)',uid=user['id'])
        execute(db,"INSERT INTO hackloop.user_roles(user_id,role) VALUES(:uid,'participant')",uid=user['id'])
        if body.role=='organizer':
            org=one(db,'''INSERT INTO hackloop.organizations(name,slug,created_by) VALUES(:name,:slug,:uid) RETURNING id''',name=(body.organization or 'Organization pending verification').strip(),slug='org-'+secrets.token_hex(12),uid=user['id'])
            execute(db,"INSERT INTO hackloop.organization_members(organization_id,user_id,role) VALUES(:oid,:uid,'owner')",oid=org['id'],uid=user['id'])
            # A role is not approval: event writes additionally require approved verification.
            execute(db,"INSERT INTO hackloop.user_roles(user_id,role) VALUES(:uid,'organizer')",uid=user['id'])
        execute(db,'UPDATE hackloop.users SET email_verified_at=now() WHERE id=:uid',uid=user['id'])
        execute(db,'UPDATE hackloop.email_signup_links SET consumed_at=now() WHERE token_hash=:token',token=verified['token_hash'])
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
    roles=[r['role'] for r in rows(db,'SELECT role FROM hackloop.user_roles WHERE user_id=:uid',uid=user['id'])]
    require(body.required_role is None or body.required_role in roles,403,'This account is not registered as an organizer. Please use participant sign-in.')
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


class InitialPassword(BaseModel):
    password:str=Field(min_length=8,max_length=128)
    confirm_password:str=Field(min_length=8,max_length=128)

@router.post('/password/setup')
def setup_password(body:InitialPassword,user=Depends(current_user),db=Depends(get_db)):
    require(body.password==body.confirm_password,422,'Passwords do not match.')
    require(valid_new_password(body.password),422,PASSWORD_GUIDE)
    account=one(db,'SELECT password_hash FROM hackloop.users WHERE id=:uid FOR UPDATE',uid=user['id'])
    require(account and account['password_hash'] is None,409,'A website password already exists. Use Forgot Password to reset it.')
    require(one(db,"SELECT 1 FROM hackloop.auth_identities WHERE user_id=:uid AND provider IN ('google','github')",uid=user['id']),403,'Provider authentication required.')
    execute(db,'UPDATE hackloop.users SET password_hash=:password WHERE id=:uid',uid=user['id'],password=hash_password(body.password))
    db.commit()
    return {'has_password':True}
