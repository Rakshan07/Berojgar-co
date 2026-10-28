import os
os.environ['DATABASE_URL']=os.environ.get('TEST_DATABASE_URL','postgresql+psycopg://postgres@127.0.0.1:55439/postgres')
os.environ['PGPASSWORD']=''
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import text
from backend.app.main import app
from backend.app.db.session import engine
from backend.app.live import email_signup
from backend.app.live.auth import token_hash

def test_verified_email_signup(monkeypatch):
    assert engine.url.database.startswith('codex_reset_test_') or engine.url.port==55439
    client=TestClient(app);sent=[]
    monkeypatch.setattr(email_signup,'mail_ready',lambda:True)
    monkeypatch.setattr(email_signup,'send_signup_otp',lambda email,code:sent.append((email,code)))
    email=uuid.uuid4().hex+'@example.com';password='VerifiedPassword!234'
    body={'email':email,'full_name':'New member','password':password,'role':'participant'}
    assert client.post('/api/v1/auth/register',json=body).status_code==422
    def begin(email=email):
        r=client.post('/api/v1/auth/signup/email',json={'email':email})
        assert r.status_code==200,r.text
        return r.json()['challenge']
    def verify(challenge,code):return client.post('/api/v1/auth/signup/email/verify',json={'challenge':challenge,'code':code})
    first=begin();firstcode=sent[-1][1]
    assert len(firstcode)==6 and firstcode.isdigit()
    with engine.connect() as c:
        assert not c.execute(text('SELECT 1 FROM hackloop.users WHERE email=:email'),{'email':email}).scalar()
        assert c.execute(text('SELECT code_hash FROM hackloop.email_signup_codes WHERE email=:email'),{'email':email}).scalar()==token_hash(first+':'+firstcode)
    current=begin();code=sent[-1][1]
    assert verify(first,firstcode).status_code==400
    wrong='000000' if code!='000000' else '111111'
    for _ in range(5):assert verify(current,wrong).status_code==400
    assert verify(current,code).status_code==400
    current=begin();code=sent[-1][1]
    verified=verify(current,code)
    assert verified.status_code==200,verified.text
    token=verified.json()['verification_token']
    assert verify(current,code).status_code==400
    assert client.post('/api/v1/auth/register',json={**body,'verification_token':token,'role':'organizer'}).status_code==400
    assert client.post('/api/v1/auth/register',json={**body,'verification_token':token,'email':'other@example.com'}).status_code==400
    assert client.post('/api/v1/auth/register',json={**body,'verification_token':token}).status_code==201
    assert client.post('/api/v1/auth/register',json={**body,'verification_token':token}).status_code==409
    access=client.post('/api/v1/auth/login',json={'email_or_username':email,'password':password}).json()['access_token']
    me=client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+access}).json()
    assert me['email_verified_at'] and me['has_password'] and not me['onboarding_complete']
    assert client.post('/api/v1/auth/signup/email',json={'email':email}).status_code==429
    expired=uuid.uuid4().hex+'@example.com'
    old=begin(expired);oldcode=sent[-1][1]
    with engine.begin() as c:c.execute(text("UPDATE hackloop.email_signup_codes SET expires_at=now()-interval '1 minute' WHERE email=:email"),{'email':expired})
    assert verify(old,oldcode).status_code==400
    def fail(*args):raise RuntimeError('SMTP unavailable')
    monkeypatch.setattr(email_signup,'send_signup_otp',fail)
    failed=uuid.uuid4().hex+'@example.com'
    assert client.post('/api/v1/auth/signup/email',json={'email':failed}).status_code==503
    with engine.connect() as c:assert not c.execute(text('SELECT 1 FROM hackloop.email_signup_codes WHERE email=:email'),{'email':failed}).scalar()
