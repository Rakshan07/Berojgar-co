import os
os.environ['DATABASE_URL']=os.environ.get('TEST_DATABASE_URL','postgresql+psycopg://postgres@127.0.0.1:55439/postgres')
os.environ['PGPASSWORD']=''
import uuid
from urllib.parse import urlsplit,parse_qs
from fastapi.testclient import TestClient
from sqlalchemy import text
from backend.app.main import app
from backend.app.db.session import engine
from backend.app.live import social_login as oauth
from backend.app.core.config import settings

from backend.tests_live.signup_helper import signup_token

def test_provider_flow(monkeypatch):
    assert engine.url.port==55439 or engine.url.database.startswith('codex_reset_test_')
    monkeypatch.setattr(settings,'PUBLIC_APP_URL','http://localhost:5174')
    monkeypatch.setattr(settings,'GOOGLE_CLIENT_ID','test-google')
    monkeypatch.setattr(settings,'GOOGLE_CLIENT_SECRET','test-secret')
    monkeypatch.setattr(settings,'GITHUB_CLIENT_ID','test-github')
    monkeypatch.setattr(settings,'GITHUB_CLIENT_SECRET','test-secret')
    origin={'Origin':'http://localhost:5174'}
    client=TestClient(app,base_url='http://localhost:5174')
    identity=['subject-'+uuid.uuid4().hex,'social-'+uuid.uuid4().hex+'@example.com','Social user']
    monkeypatch.setattr(oauth,'provider_identity',lambda *args:tuple(identity))
    def begin(provider='google',role='participant',mode='signup'):
        response=client.post('/api/v1/auth/oauth/'+provider+'/start',headers=origin,json={'role':role,'mode':mode})
        assert response.status_code==200,response.text
        params=parse_qs(urlsplit(response.json()['url']).query)
        assert params['code_challenge_method']==['S256'] and params['prompt']==['select_account']
        return params['state'][0]
    def callback(state,provider='google',**extra):
        return client.get('/api/v1/auth/oauth/'+provider+'/callback',params={'state':state,'code':'test-code',**extra},follow_redirects=False)
    assert client.post('/api/v1/auth/oauth/google/start',json={}).status_code==403
    state=begin()
    alien=TestClient(app,base_url='http://localhost:5174')
    assert 'error=failed' in alien.get('/api/v1/auth/oauth/google/callback',params={'state':state,'code':'test'},follow_redirects=False).headers['location']
    result=callback(state)
    assert result.headers['location']=='http://localhost:5174/auth/complete'
    assert 'HttpOnly' in result.headers['set-cookie']
    exchange=client.post('/api/v1/auth/oauth/exchange',headers=origin)
    assert exchange.status_code==200,exchange.text
    auth={'Authorization':'Bearer '+exchange.json()['access_token']}
    me=client.get('/api/v1/auth/me',headers=auth).json()
    assert me['onboarding_complete'] is False and me['roles']==['participant']
    assert me['has_password'] is False
    setup='/api/v1/auth/password/setup'
    password='SocialPassword!234'
    assert client.post(setup,json={'password':password,'confirm_password':password}).status_code==401
    assert client.post(setup,headers=auth,json={'password':password,'confirm_password':'Different!234'}).status_code==422
    assert client.post(setup,headers=auth,json={'password':'weakpass','confirm_password':'weakpass'}).status_code==422
    assert client.post(setup,headers=auth,json={'password':password,'confirm_password':password}).status_code==200
    assert client.post(setup,headers=auth,json={'password':'Overwrite!234','confirm_password':'Overwrite!234'}).status_code==409
    email_login=client.post('/api/v1/auth/login',json={'email_or_username':identity[1],'password':password})
    assert email_login.status_code==200
    same=client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+email_login.json()['access_token']}).json()
    assert same['id']==me['id'] and same['has_password'] is True

    assert client.post('/api/v1/auth/oauth/exchange',headers=origin).status_code==400
    assert 'error=failed' in callback(state).headers['location']
    # Existing identity signs in, but never gets promoted to organizer.
    assert 'error=wrong_role' in callback(begin(role='organizer')).headers['location']
    assert 'error=' not in callback(begin(mode='signin')).headers['location']
    assert client.post('/api/v1/auth/oauth/exchange',headers=origin).status_code==200
    # Same email through another provider must not silently acquire the original account.
    assert 'error=email_exists' in callback(begin('github'),provider='github').headers['location']
    identity[:]=['subject-'+uuid.uuid4().hex,'social-'+uuid.uuid4().hex+'@example.com','Organizer user']
    assert 'error=signup_required' in callback(begin(mode='signin')).headers['location']
    assert 'error=' not in callback(begin('github',role='organizer'),provider='github').headers['location']
    exchange=client.post('/api/v1/auth/oauth/exchange',headers=origin)
    organizer=client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+exchange.json()['access_token']}).json()
    assert 'organizer' in organizer['roles'] and organizer['organizer_approved'] is False and organizer['onboarding_complete'] is False
    cancelled=begin();assert 'error=cancelled' in callback(cancelled,error='access_denied').headers['location']
    expired=begin()
    with engine.begin() as conn:
        conn.execute(text("UPDATE hackloop.oauth_flows SET expires_at=now()-interval '1 minute' WHERE state_hash=:state"),{'state':oauth.token_hash(expired)})
    assert 'error=failed' in callback(expired).headers['location']
    monkeypatch.setattr(settings,'GOOGLE_CLIENT_SECRET','')
    assert client.post('/api/v1/auth/oauth/google/start',headers=origin,json={}).status_code==409


def test_google_identity_verifies_signature_audience_nonce_and_email(monkeypatch):
    import time,jwt,pytest
    from types import SimpleNamespace
    from cryptography.hazmat.primitives.asymmetric import rsa
    from fastapi import HTTPException
    key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    monkeypatch.setattr(settings,'GOOGLE_CLIENT_ID','test-google')
    claims={'sub':'123','iss':'https://accounts.google.com','aud':'test-google','exp':int(time.time())+300,'iat':int(time.time()),'nonce':'expected','email_verified':True,'email':'verified@example.com','name':'Verified user'}
    class Client:
        def __init__(self,*args,**kwargs):pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def post(self,*args,**kwargs):return SimpleNamespace(raise_for_status=lambda:None,json=lambda:{'id_token':jwt.encode(claims,key,algorithm='RS256')})
    monkeypatch.setattr(oauth.httpx,'Client',Client)
    monkeypatch.setattr(oauth,'GOOGLE_KEYS',SimpleNamespace(get_signing_key_from_jwt=lambda raw:SimpleNamespace(key=key.public_key())))
    assert oauth.provider_identity('google','code',{'verifier':'test','nonce':'expected'})[1]=='verified@example.com'
    with pytest.raises(HTTPException):oauth.provider_identity('google','code',{'verifier':'test','nonce':'wrong'})
    claims['email_verified']=False
    with pytest.raises(HTTPException):oauth.provider_identity('google','code',{'verifier':'test','nonce':'expected'})
    claims['email_verified']=True;claims['aud']='other-client'
    with pytest.raises(jwt.InvalidAudienceError):oauth.provider_identity('google','code',{'verifier':'test','nonce':'expected'})


def test_google_timestamp_clock_skew_is_bounded(monkeypatch):
    import time,jwt,pytest
    from types import SimpleNamespace
    from cryptography.hazmat.primitives.asymmetric import rsa
    key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    monkeypatch.setattr(settings,'GOOGLE_CLIENT_ID','test-google')
    now=int(time.time())
    claims={'sub':'123','iss':'https://accounts.google.com','aud':'test-google','exp':now+300,'iat':now+30,'nonce':'expected','email_verified':True,'email':'verified@example.com'}
    class Client:
        def __init__(self,*args,**kwargs):pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def post(self,*args,**kwargs):return SimpleNamespace(raise_for_status=lambda:None,json=lambda:{'id_token':jwt.encode(claims,key,algorithm='RS256')})
    monkeypatch.setattr(oauth.httpx,'Client',Client)
    monkeypatch.setattr(oauth,'GOOGLE_KEYS',SimpleNamespace(get_signing_key_from_jwt=lambda raw:SimpleNamespace(key=key.public_key())))
    flow={'verifier':'test','nonce':'expected'}
    assert oauth.provider_identity('google','code',flow)[1]=='verified@example.com'
    claims['iat']=now+120
    with pytest.raises(jwt.ImmatureSignatureError):oauth.provider_identity('google','code',flow)
    claims['iat']=now-300;claims['exp']=now-120
    with pytest.raises(jwt.ExpiredSignatureError):oauth.provider_identity('google','code',flow)


def test_link_google_requires_password_matching_email_and_live_session(monkeypatch):
    assert engine.url.database.startswith('codex_reset_test_') or engine.url.port==55439
    monkeypatch.setattr(settings,'PUBLIC_APP_URL','http://localhost:5174')
    monkeypatch.setattr(settings,'GOOGLE_CLIENT_ID','test-google')
    monkeypatch.setattr(settings,'GOOGLE_CLIENT_SECRET','test-secret')
    client=TestClient(app,base_url='http://localhost:5174')
    email='link-'+uuid.uuid4().hex+'@example.com'
    password='TestPassword!234'
    assert client.post('/api/v1/auth/register',json={'verification_token':signup_token(email,'participant'),'email':email,'password':password,'full_name':'Link User'}).status_code==201
    token=client.post('/api/v1/auth/login',json={'email_or_username':email,'password':password}).json()['access_token']
    headers={'Origin':'http://localhost:5174','Authorization':'Bearer '+token}
    identity=['link-sub-'+uuid.uuid4().hex,email,'Link User']
    monkeypatch.setattr(oauth,'provider_identity',lambda *args:tuple(identity))
    def begin():
        r=client.post('/api/v1/auth/oauth/google/link',headers=headers,json={'password':password})
        assert r.status_code==200,r.text
        return parse_qs(urlsplit(r.json()['url']).query)['state'][0]
    def finish(state):
        return client.get('/api/v1/auth/oauth/google/callback',params={'state':state,'code':'test'},follow_redirects=False)
    assert client.post('/api/v1/auth/oauth/google/link',json={'password':password}).status_code==401
    assert client.post('/api/v1/auth/oauth/google/link',headers=headers,json={'password':'wrong'}).status_code==403
    assert client.post('/api/v1/auth/oauth/google/link',headers={**headers,'Origin':'http://evil.example'},json={'password':password}).status_code==403
    identity[1]='different@example.com'
    assert 'error=link_email_mismatch' in finish(begin()).headers['location']
    assert client.get('/api/v1/auth/oauth/connections',headers=headers).json()['google_connected'] is False
    identity[1]=email
    before=client.get('/api/v1/auth/me',headers=headers).json()
    state=begin()
    assert finish(state).headers['location']=='http://localhost:5174/profile?google=connected'
    assert 'error=failed' in finish(state).headers['location']
    assert client.get('/api/v1/auth/oauth/connections',headers=headers).json()['google_connected'] is True
    assert client.get('/api/v1/auth/me',headers=headers).json()['id']==before['id']
    # Original password still works, and Google signs into that exact same account.
    assert client.post('/api/v1/auth/login',json={'email_or_username':email,'password':password}).status_code==200
    r=client.post('/api/v1/auth/oauth/google/start',headers=headers,json={'mode':'signin'})
    state=parse_qs(urlsplit(r.json()['url']).query)['state'][0]
    assert 'error=' not in finish(state).headers['location']
    social=client.post('/api/v1/auth/oauth/exchange',headers=headers).json()['access_token']
    assert client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+social}).json()['id']==before['id']
    # A pending link cannot complete after its original session is revoked.
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM hackloop.auth_identities WHERE user_id=:uid AND provider='google'"),{'uid':before['id']})
    pending=begin()
    with engine.begin() as conn:
        conn.execute(text('UPDATE hackloop.auth_tokens SET revoked_at=now() WHERE token_hash=:token'),{'token':oauth.token_hash(token)})
    assert 'error=link_expired' in finish(pending).headers['location']


def test_existing_password_account_links_during_google_signin(monkeypatch):
    assert engine.url.database.startswith('codex_reset_test_') or engine.url.port==55439
    monkeypatch.setattr(settings,'PUBLIC_APP_URL','http://localhost:5174')
    monkeypatch.setattr(settings,'GOOGLE_CLIENT_ID','test-google')
    monkeypatch.setattr(settings,'GOOGLE_CLIENT_SECRET','test-secret')
    client=TestClient(app,base_url='http://localhost:5174')
    origin={'Origin':'http://localhost:5174'}
    email='inline-'+uuid.uuid4().hex+'@example.com';password='TestPassword!234'
    registration=client.post('/api/v1/auth/register',json={'verification_token':signup_token(email,'participant'),'email':email,'password':password,'full_name':'Existing User'})
    assert registration.status_code==201
    original=client.post('/api/v1/auth/login',json={'email_or_username':email,'password':password}).json()['access_token']
    before=client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+original}).json()
    subject='inline-sub-'+uuid.uuid4().hex
    monkeypatch.setattr(oauth,'provider_identity',lambda *args:(subject,email,'Existing User'))
    def begin():
        r=client.post('/api/v1/auth/oauth/google/start',headers=origin,json={'mode':'signin'})
        state=parse_qs(urlsplit(r.json()['url']).query)['state'][0]
        return client.get('/api/v1/auth/oauth/google/callback',params={'state':state,'code':'test'},follow_redirects=False)
    assert begin().headers['location'].endswith('/auth/complete?link=google')
    alien=TestClient(app,base_url='http://localhost:5174')
    assert alien.post('/api/v1/auth/oauth/google/confirm-link',headers=origin,json={'password':password}).status_code==400
    assert client.post('/api/v1/auth/oauth/google/confirm-link',json={'password':password}).status_code==403
    for _ in range(5):
        assert client.post('/api/v1/auth/oauth/google/confirm-link',headers=origin,json={'password':'wrong'}).status_code==403
    assert client.post('/api/v1/auth/oauth/google/confirm-link',headers=origin,json={'password':password}).status_code==400
    assert begin().headers['location'].endswith('?link=google')
    result=client.post('/api/v1/auth/oauth/google/confirm-link',headers=origin,json={'password':password})
    assert result.status_code==200,result.text
    me=client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+result.json()['access_token']}).json()
    assert me['id']==before['id'] and me['roles']==before['roles']
    assert client.post('/api/v1/auth/oauth/google/confirm-link',headers=origin,json={'password':password}).status_code==400
    assert begin().headers['location']=='http://localhost:5174/auth/complete'
    session=client.post('/api/v1/auth/oauth/exchange',headers=origin).json()['access_token']
    assert client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+session}).json()['id']==before['id']
