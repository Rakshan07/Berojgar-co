import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///./teamweave.db"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
TOKEN_TTL_DAYS = 14

# Password-reset OTP
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_SECONDS = 60

# SMTP for sending OTPs. Leave SMTP_HOST empty to log the code to the console instead.
# Gmail: smtp.gmail.com / 587, SMTP_USER = your address, SMTP_PASSWORD = a Google "App password".
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT") or 587)
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "").strip()
