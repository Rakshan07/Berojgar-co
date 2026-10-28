"""Email ownership verification before password-based registration."""
import secrets
from typing import Literal
from fastapi import APIRouter,Depends,Request,HTTPException
from pydantic import BaseModel,EmailStr,ConfigDict,Field
from backend.app.db.session import get_db
from .auth import token_hash
from .db import one,execute,require
from .mail import mail_ready,send_signup_otp
router=APIRouter(prefix='/auth',tags=['Email signup'])
class BeginSignup(BaseModel):
    model_config=ConfigDict(extra='forbid')
    email:EmailStr
    role:Literal['participant','organizer']='participant'
@router.post('/signup/email')
def begin(body:BeginSignup,request:Request,db=Depends(get_db)):
    require(mail_ready(),503,'Email delivery is not configured. Please try again later.')
    email=str(body.email).strip().lower()
    email_digest=token_hash(email)
    client_digest=token_hash(request.client.host if request.client else 'unknown')
    for key in sorted(['email:'+email,'signup-client:'+client_digest]):
        execute(db,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key=key)
    counts=one(db,"""SELECT count(*) FILTER (WHERE email_digest=:email AND created_at>now()-interval '15 minutes') AS emails,
      count(*) FILTER (WHERE client_digest=:client) AS clients FROM hackloop.email_signup_attempts
      WHERE created_at>now()-interval '1 hour' AND (email_digest=:email OR client_digest=:client)""",email=email_digest,client=client_digest)
    require(counts['emails']<3 and counts['clients']<20,429,'Too many verification emails requested. Please wait before trying again.')
    execute(db,"DELETE FROM hackloop.email_signup_attempts WHERE created_at<now()-interval '24 hours'")
    execute(db,'INSERT INTO hackloop.email_signup_attempts(email_digest,client_digest) VALUES(:email,:client)',email=email_digest,client=client_digest)
    existing=one(db,'SELECT 1 FROM hackloop.users WHERE lower(email)=:email',email=email)
    challenge=secrets.token_urlsafe(48)
    code=None
    if not existing:
        code=f'{secrets.randbelow(1000000):06d}'
        execute(db,'DELETE FROM hackloop.email_signup_links WHERE email=:email OR expires_at<now()',email=email)
        execute(db,'DELETE FROM hackloop.email_signup_codes WHERE email=:email OR expires_at<now()',email=email)
        execute(db,"INSERT INTO hackloop.email_signup_codes(challenge_hash,code_hash,email,role,expires_at) VALUES(:challenge,:code,:email,:role,now()+interval '10 minutes')",challenge=token_hash(challenge),code=token_hash(challenge+':'+code),email=email,role=body.role)
    db.commit()
    if code:
        try:send_signup_otp(email,code)
        except Exception:
            execute(db,'DELETE FROM hackloop.email_signup_codes WHERE challenge_hash=:challenge',challenge=token_hash(challenge))
            db.commit()
            raise HTTPException(503,'The verification email could not be sent. Please try again shortly.') from None
    return {'challenge':challenge,'message':'If this email is available for signup, a six-digit verification code has been sent. Check your inbox and spam folder. If you already have an account, sign in instead.'}


class VerifyCode(BaseModel):
    model_config=ConfigDict(extra='forbid')
    challenge:str=Field(min_length=40,max_length=128)
    code:str=Field(pattern=r'^\d{6}$')

@router.post('/signup/email/verify')
def verify(body:VerifyCode,db=Depends(get_db)):
    # Lock email first, matching resend and registration, to serialize invalidation.
    found=one(db,'SELECT email FROM hackloop.email_signup_codes WHERE challenge_hash=:challenge',challenge=token_hash(body.challenge))
    message='This code is invalid or expired. Request a new code.'
    require(found,400,message)
    execute(db,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key='email:'+found['email'])
    pending=one(db,'SELECT * FROM hackloop.email_signup_codes WHERE challenge_hash=:challenge AND attempts<5 AND expires_at>now() FOR UPDATE',challenge=token_hash(body.challenge))
    require(pending,400,message)
    if not secrets.compare_digest(pending['code_hash'],token_hash(body.challenge+':'+body.code)):
        execute(db,'UPDATE hackloop.email_signup_codes SET attempts=attempts+1 WHERE challenge_hash=:challenge',challenge=token_hash(body.challenge))
        db.commit()
        raise HTTPException(400,'Incorrect code. Please check your email and try again.')
    require(not one(db,'SELECT 1 FROM hackloop.users WHERE lower(email)=:email',email=pending['email']),409,'This email is already registered. Please sign in.')
    token=secrets.token_urlsafe(48)
    execute(db,'DELETE FROM hackloop.email_signup_codes WHERE challenge_hash=:challenge',challenge=token_hash(body.challenge))
    execute(db,"INSERT INTO hackloop.email_signup_links(token_hash,email,role,expires_at) VALUES(:token,:email,:role,now()+interval '15 minutes')",token=token_hash(token),email=pending['email'],role=pending['role'])
    db.commit()
    return {'verification_token':token,'email':pending['email'],'role':pending['role']}
