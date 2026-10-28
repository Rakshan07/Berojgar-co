from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

BASE_DIR = Path(__file__).resolve().parents[2]
class Settings(BaseSettings):
    APP_NAME: str = 'Skillfy API'
    API_V1_PREFIX: str = '/api/v1'
    ENVIRONMENT: str = 'development'
    DEBUG: bool = False
    DATABASE_URL: Optional[str] = None
    PGHOST: str = 'localhost'
    PGPORT: int = 5432
    PGDATABASE: str = 'hackloop'
    PGUSER: str = 'postgres'
    PGPASSWORD: str = ''
    DB_SCHEMA: str = 'hackloop'
    SECRET_KEY: str = ''  # Legacy JWT endpoints are not mounted; sessions use hashed random tokens.
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    SESSION_EXPIRE_HOURS: int = 24
    CORS_ORIGINS: str = 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'
    GOOGLE_CLIENT_ID: str = ''
    GOOGLE_CLIENT_SECRET: str = ''
    GITHUB_CLIENT_ID: str = ''
    GITHUB_CLIENT_SECRET: str = ''
    SMTP_HOST: str = ''
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ''
    SMTP_PASSWORD: str = ''
    SMTP_FROM: str = ''
    SMTP_USE_SSL: bool = False
    PUBLIC_APP_URL: str = 'http://localhost:5174'
    AI_PROVIDER: str = 'disabled'
    AI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    AI_MODEL: str = ''
    AI_REQUEST_TIMEOUT_SECONDS: int = 30
    @property
    def effective_gemini_api_key(self):
        return self.GEMINI_API_KEY or self.AI_API_KEY
    @property
    def database_url(self):
        if self.DATABASE_URL and not self.PGPASSWORD:
            return self.DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://', 1).replace('postgres://', 'postgresql+psycopg://', 1)
        return URL.create('postgresql+psycopg', username=self.PGUSER, password=self.PGPASSWORD, host=self.PGHOST, port=self.PGPORT, database=self.PGDATABASE)
    model_config = SettingsConfigDict(env_file=(BASE_DIR / '.env', BASE_DIR / '.env.local', BASE_DIR.parent / '.env'), extra='ignore')
settings = Settings()
