"""Provider login: PKCE, browser-bound state and one-time session handoff."""
import logging
import base64
import hashlib
import secrets
from datetime import datetime,timedelta,timezone
from typing import Literal
from urllib.parse import urlencode,urlsplit
import httpx
import jwt
from fastapi import APIRouter,Depends,Request,Response,HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel,EmailStr,TypeAdapter,Field
from sqlalchemy.exc import IntegrityError
from backend.app.core.config import settings
from backend.app.db.session import get_db
from .auth import token_hash,current_user,bearer
from backend.app.core.security import verify_password
from .db import one,rows,execute,require
logger=logging.getLogger(__name__)
router=APIRouter(prefix='/auth/oauth',tags=['Social sign-in'])
Provider=Literal['google','github']
COOKIE_PATH='/api/v1/auth/oauth'
GOOGLE_KEYS=jwt.PyJWKClient('https://www.googleapis.com/oauth2/v3/certs',timeout=10)

class Start(BaseModel):
    role:Literal['participant','organizer']='participant'
    mode:Literal['signup','signin']='signup'

def app_url():
    url=settings.PUBLIC_APP_URL.rstrip('/')
    parsed=urlsplit(url)
    require(bool(parsed.hostname) and not parsed.username and not parsed.query and not parsed.fragment and parsed.path in ('','/') and (parsed.scheme=='https' or (parsed.scheme=='http' and parsed.hostname in ('localhost','127.0.0.1'))),503,'Social sign-in is not configured')
    return url

def config(provider):
    return (settings.GOOGLE_CLIENT_ID,settings.GOOGLE_CLIENT_SECRET) if provider=='google' else (settings.GITHUB_CLIENT_ID,settings.GITHUB_CLIENT_SECRET)

def origin_check(request):
    require(request.headers.get('origin')==app_url(),403,'Please start sign-in from the website')

def cookie(response,name,value,max_age):
    response.set_cookie(name,value,max_age=max_age,httponly=True,secure=app_url().startswith('https:'),samesite='lax',path=COOKIE_PATH)

def callback_url(provider):return app_url()+'/api/v1/auth/oauth/'+provider+'/callback'

def begin_flow(provider,body,request,response,db,link_user=None,link_session=None):
    origin_check(request)
    client_id,secret=config(provider)
    require(client_id and secret,409,provider.title()+' sign-in is not configured yet. Please use your email and password.')
    state=secrets.token_urlsafe(32);browser=secrets.token_urlsafe(32);verifier=secrets.token_urlsafe(48);nonce=secrets.token_urlsafe(32)
    execute(db,'DELETE FROM hackloop.oauth_flows WHERE expires_at<now()')
    execute(db,'DELETE FROM hackloop.oauth_handoffs WHERE expires_at<now()')
    execute(db,'''INSERT INTO hackloop.oauth_flows(state_hash,browser_hash,provider,role,mode,verifier,nonce,expires_at,link_user_id,link_session_hash)
      VALUES(:state,:browser,:provider,:role,:mode,:verifier,:nonce,:expires,:link_user,:link_session)''',link_user=link_user,link_session=link_session,state=token_hash(state),browser=token_hash(browser),provider=provider,role=body.role,mode=body.mode,verifier=verifier,nonce=nonce,expires=datetime.now(timezone.utc)+timedelta(minutes=10))
    db.commit();cookie(response,'oauth_browser',browser,600)
    challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    params={'client_id':client_id,'redirect_uri':callback_url(provider),'state':state,'response_type':'code','code_challenge':challenge,'code_challenge_method':'S256','prompt':'select_account'}
    if provider=='google':params.update(scope='openid email profile',nonce=nonce);endpoint='https://accounts.google.com/o/oauth2/v2/auth'
    else:params.update(scope='read:user user:email');endpoint='https://github.com/login/oauth/authorize'
    return {'url':endpoint+'?'+urlencode(params)}

@router.post('/{provider}/start')
def start(provider:Provider,body:Start,request:Request,response:Response,db=Depends(get_db)):
    return begin_flow(provider,body,request,response,db)

class LinkGoogle(BaseModel):
    password:str=Field(min_length=1,max_length=128)

@router.get('/connections')
def connections(user=Depends(current_user),db=Depends(get_db)):
    linked=bool(one(db,"SELECT 1 FROM hackloop.auth_identities WHERE user_id=:uid AND provider='google'",uid=user['id']))
    return {'google_connected':linked}

@router.post('/google/link')
def link_google(body:LinkGoogle,request:Request,response:Response,user=Depends(current_user),auth=Depends(bearer),db=Depends(get_db)):
    origin_check(request)
    account=one(db,'SELECT password_hash FROM hackloop.users WHERE id=:uid',uid=user['id'])
    require(account and account['password_hash'] and verify_password(body.password,account['password_hash']),403,'Enter your current website password to connect Google.')
    require(not one(db,"SELECT 1 FROM hackloop.auth_identities WHERE user_id=:uid AND provider='google'",uid=user['id']),409,'Google is already connected.')
    return begin_flow('google',Start(),request,response,db,user['id'],token_hash(auth.credentials))

def connect_identity(db,provider,subject,email,flow):
    uid=flow['link_user_id']
    for key in sorted(['identity:'+provider+':'+subject,'email:'+email]):
        execute(db,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key=key)
    user=one(db,"SELECT id,email FROM hackloop.users WHERE id=:uid AND account_status='active' FOR UPDATE",uid=uid)
    session=one(db,"SELECT 1 FROM hackloop.auth_tokens WHERE user_id=:uid AND token_hash=:token AND purpose='session' AND revoked_at IS NULL AND consumed_at IS NULL AND expires_at>now()",uid=uid,token=flow['link_session_hash'])
    if not user or not session:raise OAuthProblem('link_expired')
    if user['email'].lower()!=email.lower():raise OAuthProblem('link_email_mismatch')
    existing=one(db,'SELECT user_id FROM hackloop.auth_identities WHERE provider=:provider AND provider_subject=:subject',provider=provider,subject=subject)
    if existing and existing['user_id']!=uid:raise OAuthProblem('link_conflict')
    other=one(db,'SELECT provider_subject FROM hackloop.auth_identities WHERE user_id=:uid AND provider=:provider',uid=uid,provider=provider)
    if other and other['provider_subject']!=subject:raise OAuthProblem('link_conflict')
    if not existing:
        execute(db,'INSERT INTO hackloop.auth_identities(user_id,provider,provider_subject) VALUES(:uid,:provider,:subject)',uid=uid,provider=provider,subject=subject)
    execute(db,'UPDATE hackloop.users SET email_verified_at=COALESCE(email_verified_at,now()) WHERE id=:uid',uid=uid)


def provider_identity(provider,code,flow):
    client_id,secret=config(provider)
    endpoint='https://oauth2.googleapis.com/token' if provider=='google' else 'https://github.com/login/oauth/access_token'
    with httpx.Client(timeout=15) as client:
        response=client.post(endpoint,data={'client_id':client_id,'client_secret':secret,'code':code,'grant_type':'authorization_code','redirect_uri':callback_url(provider),'code_verifier':flow['verifier']},headers={'Accept':'application/json'})
        response.raise_for_status();tokens=response.json()
        if provider=='google':
            raw=tokens['id_token'];key=GOOGLE_KEYS.get_signing_key_from_jwt(raw)
            claims=jwt.decode(raw,key.key,algorithms=['RS256'],audience=client_id,leeway=60,options={'require':['exp','iat','aud','iss','sub','nonce']})
            require(claims['iss'] in ('accounts.google.com','https://accounts.google.com') and claims['nonce']==flow['nonce'] and claims.get('email_verified') is True,400,'Provider identity could not be verified')
            if claims.get('azp'):require(claims['azp']==client_id,400,'Provider identity could not be verified')
            subject=claims['sub'];email=claims['email'];name=claims.get('name','')
        else:
            access=tokens['access_token'];headers={'Authorization':'Bearer '+access,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
            response=client.get('https://api.github.com/user',headers=headers);response.raise_for_status();user=response.json()
            response=client.get('https://api.github.com/user/emails',headers=headers);response.raise_for_status();emails=response.json()
            verified=[item for item in emails if item.get('verified') is True]
            require(verified,400,'A verified email is required')
            selected=next((item for item in verified if item.get('primary')),verified[0])
            subject=str(user['id']);email=selected['email'];name=user.get('name') or user.get('login','')
    email=str(TypeAdapter(EmailStr).validate_python(email)).lower()
    require(bool(subject),400,'Provider identity could not be verified')
    name=(name or email.split('@')[0]).strip()[:100]
    return str(subject),email,name if len(name)>=2 else 'Member'

class OAuthProblem(Exception):pass

def resolve_user(db,provider,subject,email,name,flow):
    for key in sorted(['identity:'+provider+':'+subject,'email:'+email]):execute(db,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key=key)
    user=one(db,'''SELECT u.id,u.account_status FROM hackloop.auth_identities i JOIN hackloop.users u ON u.id=i.user_id WHERE i.provider=:provider AND i.provider_subject=:subject FOR UPDATE OF u''',provider=provider,subject=subject)
    if not user:
        # Do not silently link email/password accounts: possession of a provider email
        # is not consent to preserve another person's previously created login methods.
        if one(db,'SELECT id FROM hackloop.users WHERE lower(email)=:email',email=email):raise OAuthProblem('email_exists')
        if flow['mode']=='signin':raise OAuthProblem('signup_required')
        user=one(db,'INSERT INTO hackloop.users(email,display_name,email_verified_at) VALUES(:email,:name,now()) RETURNING id,account_status',email=email,name=name)
        execute(db,'INSERT INTO hackloop.profiles(user_id) VALUES(:uid)',uid=user['id'])
        execute(db,"INSERT INTO hackloop.user_roles(user_id,role) VALUES(:uid,'participant')",uid=user['id'])
        if flow['role']=='organizer':
            org=one(db,"INSERT INTO hackloop.organizations(name,slug,created_by) VALUES('Organization pending verification',:slug,:uid) RETURNING id",slug='org-'+secrets.token_hex(12),uid=user['id'])
            execute(db,"INSERT INTO hackloop.organization_members(organization_id,user_id,role) VALUES(:oid,:uid,'owner')",oid=org['id'],uid=user['id'])
            execute(db,"INSERT INTO hackloop.user_roles(user_id,role) VALUES(:uid,'organizer')",uid=user['id'])
        execute(db,'INSERT INTO hackloop.auth_identities(user_id,provider,provider_subject) VALUES(:uid,:provider,:subject)',uid=user['id'],provider=provider,subject=subject)
    if user['account_status']!='active':raise OAuthProblem('unavailable')
    roles=[r['role'] for r in rows(db,'SELECT role FROM hackloop.user_roles WHERE user_id=:uid',uid=user['id'])]
    if flow['role']=='organizer' and 'organizer' not in roles:raise OAuthProblem('wrong_role')
    return user

@router.get('/{provider}/callback')
def callback(provider:Provider,request:Request,state:str='',code:str='',error:str='',db=Depends(get_db)):
    failure='failed'
    stage='browser_state'
    try:
        require(1<=len(state)<=200 and len(code)<=4096,400,'Invalid callback')
        flow=one(db,'SELECT * FROM hackloop.oauth_flows WHERE state_hash=:state AND provider=:provider AND consumed_at IS NULL AND expires_at>now() FOR UPDATE',state=token_hash(state),provider=provider)
        require(flow and secrets.compare_digest(flow['browser_hash'],token_hash(request.cookies.get('oauth_browser',''))),400,'Invalid browser state')
        execute(db,'UPDATE hackloop.oauth_flows SET consumed_at=now() WHERE state_hash=:state',state=token_hash(state));db.commit()
        if error:raise OAuthProblem('cancelled')
        require(code,400,'Missing provider authorization')
        stage='provider_verification'
        subject,email,name=provider_identity(provider,code,flow)
        stage='account_creation'
        if flow.get('link_user_id'):
            connect_identity(db,provider,subject,email,flow)
            db.commit()
            response=RedirectResponse(app_url()+'/profile?google=connected',status_code=303)
            response.delete_cookie('oauth_browser',path=COOKIE_PATH)
            response.headers['Cache-Control']='no-store'
            response.headers['Referrer-Policy']='no-referrer'
            return response
        try:
            user=resolve_user(db,provider,subject,email,name,flow)
        except OAuthProblem as exc:
            if provider!='google' or str(exc)!='email_exists':raise
            existing=one(db,"SELECT id,password_hash,account_status FROM hackloop.users WHERE lower(email)=:email",email=email)
            if not existing or not existing['password_hash']:raise
            if existing['account_status']!='active':raise OAuthProblem('unavailable')
            if flow['role']=='organizer' and not one(db,"SELECT 1 FROM hackloop.user_roles WHERE user_id=:uid AND role='organizer'",uid=existing['id']):raise OAuthProblem('wrong_role')
            confirmation=secrets.token_urlsafe(48)
            execute(db,'DELETE FROM hackloop.oauth_link_confirmations WHERE expires_at<now() OR user_id=:uid',uid=existing['id'])
            execute(db,'''INSERT INTO hackloop.oauth_link_confirmations(token_hash,user_id,subject,email,role,expires_at)
              VALUES(:token,:uid,:subject,:email,:role,now()+interval '5 minutes')''',token=token_hash(confirmation),uid=existing['id'],subject=subject,email=email,role=flow['role'])
            db.commit()
            response=RedirectResponse(app_url()+'/auth/complete?link=google',status_code=303)
            cookie(response,'oauth_link_confirmation',confirmation,300)
            response.delete_cookie('oauth_browser',path=COOKIE_PATH)
            response.headers['Cache-Control']='no-store';response.headers['Referrer-Policy']='no-referrer'
            return response
        stage='session_handoff'
        handoff=secrets.token_urlsafe(48)
        execute(db,'INSERT INTO hackloop.oauth_handoffs(code_hash,user_id,expires_at) VALUES(:code,:uid,:expires)',code=token_hash(handoff),uid=user['id'],expires=datetime.now(timezone.utc)+timedelta(seconds=60))
        db.commit()
        response=RedirectResponse(app_url()+'/auth/complete',status_code=303)
        cookie(response,'oauth_handoff',handoff,60)
    except OAuthProblem as exc:
        db.rollback();failure=str(exc);response=RedirectResponse(app_url()+'/auth/complete?error='+failure,status_code=303)
    except (HTTPException,httpx.HTTPError,jwt.PyJWTError,KeyError,ValueError,IntegrityError) as exc:
        # Never log exception text, request URLs, tokens, emails or SQL parameters.
        reason=type(exc).__name__
        status=None
        provider_error=''
        if isinstance(exc,httpx.HTTPStatusError):
            status=exc.response.status_code
            try:
                value=exc.response.json().get('error')
                if value in ('invalid_client','invalid_grant','unauthorized_client','access_denied'):
                    provider_error=value
            except (ValueError,AttributeError):pass
        logger.warning('OAuth callback failed: provider=%s stage=%s type=%s status=%s provider_error=%s',provider,stage,reason,status,provider_error)
        db.rollback()
        response=RedirectResponse(app_url()+'/auth/complete?'+urlencode({'error':failure,'stage':stage}),status_code=303)
    response.delete_cookie('oauth_browser',path=COOKIE_PATH)
    response.headers['Cache-Control']='no-store';response.headers['Referrer-Policy']='no-referrer'
    return response

@router.post('/exchange')
def exchange(request:Request,response:Response,db=Depends(get_db)):
    origin_check(request)
    value=request.cookies.get('oauth_handoff','')
    handoff=one(db,'DELETE FROM hackloop.oauth_handoffs WHERE code_hash=:code AND expires_at>now() RETURNING user_id',code=token_hash(value))
    require(handoff,400,'Sign-in expired. Please try again.')
    user=one(db,"SELECT id FROM hackloop.users WHERE id=:uid AND account_status='active' FOR UPDATE",uid=handoff['user_id']);require(user,403,'Account unavailable')
    token=secrets.token_urlsafe(48)
    execute(db,"INSERT INTO hackloop.auth_tokens(user_id,token_hash,purpose,expires_at) VALUES(:uid,:token,'session',:expires)",uid=user['id'],token=token_hash(token),expires=datetime.now(timezone.utc)+timedelta(hours=settings.SESSION_EXPIRE_HOURS))
    db.commit();response.delete_cookie('oauth_handoff',path=COOKIE_PATH);response.headers['Cache-Control']='no-store'
    return {'access_token':token,'token_type':'bearer'}


@router.post('/google/confirm-link')
def confirm_google_link(body:LinkGoogle,request:Request,response:Response,db=Depends(get_db)):
    origin_check(request)
    proof=token_hash(request.cookies.get('oauth_link_confirmation',''))
    pending=one(db,'SELECT * FROM hackloop.oauth_link_confirmations WHERE token_hash=:token AND expires_at>now() AND attempts<5 FOR UPDATE',token=proof)
    require(pending,400,'This confirmation expired. Start Continue with Google again.')
    uid=pending['user_id']
    for key in sorted(['identity:google:'+pending['subject'],'email:'+pending['email']]):
        execute(db,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key=key)
    user=one(db,'SELECT id,email,password_hash,account_status FROM hackloop.users WHERE id=:uid FOR UPDATE',uid=uid)
    valid=user and user['account_status']=='active' and user['email'].lower()==pending['email'] and user['password_hash'] and verify_password(body.password,user['password_hash'])
    if not valid:
        execute(db,'UPDATE hackloop.oauth_link_confirmations SET attempts=attempts+1 WHERE token_hash=:token',token=proof)
        db.commit()
        raise HTTPException(403,'Incorrect website password. Use the password you created for this website.')
    if pending['role']=='organizer':
        require(one(db,"SELECT 1 FROM hackloop.user_roles WHERE user_id=:uid AND role='organizer'",uid=uid),403,'Please use participant sign-in.')
    existing=one(db,"SELECT user_id FROM hackloop.auth_identities WHERE provider='google' AND provider_subject=:subject",subject=pending['subject'])
    other=one(db,"SELECT provider_subject FROM hackloop.auth_identities WHERE provider='google' AND user_id=:uid",uid=uid)
    require((not existing or existing['user_id']==uid) and (not other or other['provider_subject']==pending['subject']),409,'Google is connected to a different account. Please use your original sign-in method.')
    if not existing:
        execute(db,"INSERT INTO hackloop.auth_identities(user_id,provider,provider_subject) VALUES(:uid,'google',:subject)",uid=uid,subject=pending['subject'])
    execute(db,'UPDATE hackloop.users SET email_verified_at=COALESCE(email_verified_at,now()) WHERE id=:uid',uid=uid)
    execute(db,'DELETE FROM hackloop.oauth_link_confirmations WHERE token_hash=:token',token=proof)
    token=secrets.token_urlsafe(48)
    execute(db,"INSERT INTO hackloop.auth_tokens(user_id,token_hash,purpose,expires_at) VALUES(:uid,:token,'session',:expires)",uid=uid,token=token_hash(token),expires=datetime.now(timezone.utc)+timedelta(hours=settings.SESSION_EXPIRE_HOURS))
    db.commit()
    response.delete_cookie('oauth_link_confirmation',path=COOKIE_PATH)
    response.headers['Cache-Control']='no-store'
    return {'access_token':token,'token_type':'bearer'}
