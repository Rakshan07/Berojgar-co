from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.session import engine
from backend.app.api.routes import (
    auth,
    profiles,
    events,
    ai_setup,
    assessments,
    matching,
    teams,
    challenges,
    health,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TeamWeave Backend...")
    # Verify database connection
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
        logger.info(f"Database connection verified successfully on schema '{settings.DB_SCHEMA}'.")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL database on startup: {e}")
    yield
    logger.info("Shutting down TeamWeave Backend...")

app = FastAPI(
    title="TeamWeave API",
    description="Skill-based team formation, explainable matching matrix, and event collaboration platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [o.strip() for o in origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# Include Routers under API_V1_PREFIX (/api/v1)
api_prefix = settings.API_V1_PREFIX
app.include_router(health.router, prefix=api_prefix)
app.include_router(auth.router, prefix=api_prefix)
app.include_router(profiles.router, prefix=api_prefix)
app.include_router(events.router, prefix=api_prefix)
app.include_router(ai_setup.router, prefix=api_prefix)
app.include_router(assessments.router, prefix=api_prefix)
app.include_router(matching.router, prefix=api_prefix)
app.include_router(teams.router, prefix=api_prefix)
app.include_router(challenges.router, prefix=api_prefix)

# Root convenience redirect / health
@app.get("/")
def root():
    return {
        "app": "TeamWeave Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "api_v1": api_prefix
    }

@app.get("/health")
def health_root():
    return {"status": "healthy", "app": "TeamWeave API"}
