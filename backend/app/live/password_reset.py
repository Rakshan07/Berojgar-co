from backend.app.core.security import valid_new_password, PASSWORD_GUIDE
"""Single-use, expiring password reset links backed by hashed random tokens."""
import hashlib
import logging
import secrets
from datetime import datetime,timedelta,timezone
from fastapi import APIRouter,Depends,Request,HTTPException
from pydantic import BaseModel,EmailStr,Field,ConfigDict
from backend.app.db.session import get_db
from backend.app.core.security import hash_password
from .auth import token_hash
from .db import one,execute,require
from .mail import mail_ready,send_reset_email

router=APIRouter(prefix='/auth',tags=['Password recovery'])
logger=logging.getLogger(__name__)
class ResetRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    email:EmailStr
class ResetPassword(BaseModel):
    model_config=ConfigDict(extra='forbid')
    token:str=Field(min_length=40,max_length=128)
    password:str=Field(min_length=8,max_length=128)

def digest(value):return hashlib.sha256(value.encode()).hexdigest()

@router.post('/forgot-password')
def forgot(body:ResetRequest,request:Request,db=Depends(get_db)):
    require(mail_ready(),503,'Password reset email is not configured yet. Please contact the site administrator.')
    email=str(body.email).strip().lower()
    email_key=digest(email)
    client_key=digest(request.client.host if request.client else 'unknown')
    # Serialize rate-limit checks across workers, without storing raw email or IP addresses.
    for key in sorted(['email:'+email_key,'client:'+client_key]):
        execute(db,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key=key)
    count=one(db,"""SELECT count(*) FILTER (WHERE email_digest=:email AND created_at>now()-interval '15 minutes') AS email_count,
      count(*) FILTER (WHERE client_digest=:client) AS client_count
      FROM hackloop.password_reset_requests WHERE created_at>now()-interval '1 hour' AND (email_digest=:email OR client_digest=:client)""",email=email_key,client=client_key)
    require(count['email_count']<3 and count['client_count']<20,429,'Too many reset requests. Please wait before trying again.')
    execute(db,"DELETE FROM hackloop.password_reset_requests WHERE created_at<now()-interval '24 hours'")
    execute(db,'INSERT INTO hackloop.password_reset_requests(email_digest,client_digest) VALUES(:email,:client)',email=email_key,client=client_key)
    user=one(db,"SELECT id,email FROM hackloop.users WHERE lower(email)=:email AND account_status='active' AND password_hash IS NOT NULL FOR UPDATE",email=email)
    token=None
    if user:
        token=secrets.token_urlsafe(48)
        execute(db,"UPDATE hackloop.auth_tokens SET revoked_at=now() WHERE user_id=:uid AND purpose='password_reset' AND revoked_at IS NULL AND consumed_at IS NULL",uid=user['id'])
        execute(db,"INSERT INTO hackloop.auth_tokens(user_id,token_hash,purpose,expires_at) VALUES(:uid,:hash,'password_reset',:expires)",uid=user['id'],hash=token_hash(token),expires=datetime.now(timezone.utc)+timedelta(minutes=15))
    db.commit()
    if token:
        try:
            send_reset_email(user['email'],token)
        except Exception:
            execute(db,'UPDATE hackloop.auth_tokens SET revoked_at=now() WHERE token_hash=:hash',hash=token_hash(token))
            db.commit()
            # Keep the HTTP response identical for existing/nonexistent accounts.
            logger.error('Password reset email delivery failed. Check SMTP settings and provider availability.')
    return {'message':'If an account exists for this email, you will receive a password reset link. Check your inbox and spam folder.'}

@router.post('/reset-password')
def reset(body:ResetPassword,db=Depends(get_db)):
    require(valid_new_password(body.password),422,PASSWORD_GUIDE)
    message='This reset link is invalid or expired. Please request a new one.'
    token=one(db,"SELECT user_id FROM hackloop.auth_tokens WHERE token_hash=:hash AND purpose='password_reset'",hash=token_hash(body.token))
    require(token,400,message)
    user=one(db,"SELECT id FROM hackloop.users WHERE id=:uid AND account_status='active' FOR UPDATE",uid=token['user_id'])
    require(user,400,message)
    active=one(db,"""SELECT id FROM hackloop.auth_tokens WHERE token_hash=:hash AND purpose='password_reset'
      AND revoked_at IS NULL AND consumed_at IS NULL AND expires_at>now() FOR UPDATE""",hash=token_hash(body.token))
    require(active,400,message)
    execute(db,'UPDATE hackloop.users SET password_hash=:password WHERE id=:uid',password=hash_password(body.password),uid=user['id'])
    execute(db,'UPDATE hackloop.auth_tokens SET consumed_at=now() WHERE id=:id',id=active['id'])
    execute(db,"UPDATE hackloop.auth_tokens SET revoked_at=now() WHERE user_id=:uid AND purpose IN ('session','password_reset') AND revoked_at IS NULL",uid=user['id'])
    db.commit()
    return {'message':'Your password has been reset. Sign in with your new password.'}
