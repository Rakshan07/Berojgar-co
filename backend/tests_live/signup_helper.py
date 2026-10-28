import secrets
from sqlalchemy import text
from backend.app.db.session import engine
from backend.app.live.auth import token_hash

def signup_token(email,role='participant'):
    assert engine.url.database.startswith('codex_reset_test_') or engine.url.port==55439
    token=secrets.token_urlsafe(48)
    with engine.begin() as c:
        c.execute(text("INSERT INTO hackloop.email_signup_links(token_hash,email,role,expires_at) VALUES(:token,:email,:role,now()+interval '15 minutes')"),{'token':token_hash(token),'email':email.lower(),'role':role})
    return token
