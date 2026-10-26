import os
os.environ['DATABASE_URL']=os.environ.get('TEST_DATABASE_URL','postgresql+psycopg://postgres@127.0.0.1:55439/postgres')
os.environ['PGPASSWORD']=''
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import text
from backend.app.main import app
from backend.app.db.session import engine
from backend.app.live import password_reset as recovery
from backend.app.live.auth import token_hash

def test_reset_flow(monkeypatch):
    assert engine.url.port == 55439 or engine.url.database.startswith('codex_reset_test_')
    with engine.begin() as conn:
        conn.execute(text('DELETE FROM hackloop.password_reset_requests'))
    sent=[]
    monkeypatch.setattr(recovery,'mail_ready',lambda:True)
    monkeypatch.setattr(recovery,'send_reset_email',lambda email,token:sent.append(token))
    client=TestClient(app)
    email=f'reset-{uuid.uuid4().hex}@example.com'
    old='Old-test-password-123'
    new='New-test-password-456'
    assert client.post('/api/v1/auth/register',json={'email':email,'full_name':'Reset test','password':old,'role':'participant'}).status_code==201
    session=client.post('/api/v1/auth/login',json={'email_or_username':email,'password':old}).json()['access_token']
    def ask(address=email):return client.post('/api/v1/auth/forgot-password',json={'email':address})
    def reset(token):return client.post('/api/v1/auth/reset-password',json={'token':token,'password':new})
    a=ask();assert a.status_code==200
    assert ask('unknown-'+email).json()==a.json()
    first=sent[-1]
    assert reset('x'*64).status_code==400
    assert ask().status_code==200
    assert reset(first).status_code==400
    expired=sent[-1]
    with engine.begin() as conn:
        conn.execute(text("UPDATE hackloop.auth_tokens SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE token_hash=:hash"),{'hash':token_hash(expired)})
    assert reset(expired).status_code==400
    assert ask().status_code==200
    assert ask().status_code==429
    valid=sent[-1]
    assert reset(valid).status_code==200
    assert reset(valid).status_code==400
    assert client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+session}).status_code==401
    assert client.post('/api/v1/auth/login',json={'email_or_username':email,'password':old}).status_code==401
    assert client.post('/api/v1/auth/login',json={'email_or_username':email,'password':new}).status_code==200
    with engine.begin() as conn:conn.execute(text('DELETE FROM hackloop.password_reset_requests'))
    def fail(email,token):
        sent.append(token)
        raise RuntimeError('mock SMTP unavailable')
    monkeypatch.setattr(recovery,'send_reset_email',fail)
    assert ask().status_code==200
    assert reset(sent[-1]).status_code==400
    monkeypatch.setattr(recovery,'mail_ready',lambda:False)
    assert ask().status_code==503
