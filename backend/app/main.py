"""API entry point for the installed hackloop schema. Never runs bootstrap or seed SQL."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from backend.app.core.config import settings
from backend.app.db.session import engine
from backend.app.live import auth, profiles, events, workspace, password_reset, documents, social_login, email_signup
from backend.app.api.routes import ai_features, ai_setup, matching, teams, challenges

@asynccontextmanager
async def lifespan(app):
    with engine.connect() as conn:
        # Fail startup clearly if the expected installed schema/migration is missing.
        conn.execute(text('SELECT display_name FROM hackloop.users LIMIT 0'))
        conn.execute(text('SELECT course, academic_year, onboarding_completed_at FROM hackloop.profiles LIMIT 0'))
        conn.execute(text('SELECT user_id FROM hackloop.profile_private_details LIMIT 0'))
        conn.execute(text('SELECT id FROM hackloop.event_profiles LIMIT 0'))
    yield

app=FastAPI(title='Skillfy API',version='1.1.0',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in settings.CORS_ORIGINS.split(',') if x.strip()],allow_methods=['GET','POST','PATCH','DELETE','OPTIONS'],allow_headers=['Authorization','Content-Type'])
@app.exception_handler(SQLAlchemyError)
async def database_error(request:Request,exc:SQLAlchemyError):
    return JSONResponse(status_code=503,content={'detail':'The database could not complete this request. Please try again.'})
for router in (
    auth.router, profiles.router, events.router, workspace.router, password_reset.router,
    documents.router, social_login.router, email_signup.router,
    ai_features.router, ai_setup.router, matching.router, teams.router, challenges.router
):
    app.include_router(router,prefix=settings.API_V1_PREFIX)

@app.get('/health')
@app.get('/api/v1/health')
def health():
    with engine.connect() as conn: conn.execute(text('SELECT 1'))
    return {'status':'healthy'}
