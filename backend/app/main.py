import re
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import config, mailer, suggestions
from .database import Base, engine, get_db
from .models import AuthToken, ChallengeAnswer, Draft, Event, PasswordReset, User
from .security import (
    DUMMY_HASH,
    bearer,
    current_user,
    hash_password,
    issue_token,
    require_organizer,
    token_digest,
    verify_password,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="TeamWeave API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
DB = Annotated[Session, Depends(get_db)]
Me = Annotated[User, Depends(current_user)]
Organizer = Annotated[User, Depends(require_organizer)]


# ── schemas ──────────────────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    email: str = Field(max_length=320)
    name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=200)
    role: str = Field(default="participant", pattern="^(participant|organizer)$")


class LoginIn(BaseModel):
    email: str
    password: str


class ForgotIn(BaseModel):
    email: str


class ResetIn(BaseModel):
    email: str
    otp: str = Field(pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=200)


class ProfilePatch(BaseModel):
    # The display name is fixed after registration; sending `name` is a 422.
    model_config = ConfigDict(extra="forbid")

    headline: str | None = Field(default=None, max_length=200)
    bio: str | None = None
    skills: list[dict] | None = None


class DraftIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = ""


class AnswerIn(BaseModel):
    answer: str
    correct: bool = False


class EventIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: str = "hackathon"
    description: str = ""


class SuggestIn(BaseModel):
    category: str = "hackathon"


def user_out(u: User) -> dict:
    return {
        "id": u.id, "email": u.email, "name": u.name, "role": u.role,
        "headline": u.headline, "bio": u.bio, "skills": u.skills,
    }


def draft_out(d: Draft) -> dict:
    return {"id": d.id, "title": d.title, "body": d.body, "updated_at": d.updated_at}


def answer_out(a: ChallengeAnswer) -> dict:
    return {"challenge_id": a.challenge_id, "answer": a.answer, "correct": a.correct}


# ── auth ─────────────────────────────────────────────────────────────────────
@app.post("/auth/register", status_code=201)
def register(body: RegisterIn, db: DB):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(422, "Invalid email")
    user = User(email=email, name=body.name.strip(), role=body.role,
                password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    return {"token": issue_token(db, user), "user": user_out(user)}


@app.post("/auth/login")
def login(body: LoginIn, db: DB):
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    # Always run one scrypt verify so unknown email and wrong password look identical.
    ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return {"token": issue_token(db, user), "user": user_out(user)}


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@app.post("/auth/forgot-password")
def forgot_password(body: ForgotIn, bg: BackgroundTasks, db: DB):
    # Same response whether or not the account exists (no email enumeration).
    generic = {"detail": "If that email is registered, a verification code has been sent."}
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if user is None:
        return generic
    now = datetime.now(timezone.utc)
    latest = db.scalar(select(PasswordReset).where(PasswordReset.user_id == user.id)
                       .order_by(PasswordReset.id.desc()))
    if latest and (now - _aware(latest.created_at)).total_seconds() < config.OTP_RESEND_SECONDS:
        return generic  # throttle resends silently
    db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.id))  # one live code
    otp = f"{secrets.randbelow(10**6):06d}"
    db.add(PasswordReset(user_id=user.id, otp_hash=hash_password(otp),
                         expires_at=now + timedelta(minutes=config.OTP_TTL_MINUTES)))
    db.commit()
    bg.add_task(mailer.send_reset_otp, user.email, otp)
    return generic


@app.post("/auth/reset-password")
def reset_password(body: ResetIn, db: DB):
    invalid = HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired code")
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if user is None:
        verify_password(body.otp, DUMMY_HASH)
        raise invalid
    pr = db.scalar(select(PasswordReset).where(PasswordReset.user_id == user.id)
                   .order_by(PasswordReset.id.desc()))
    if (pr is None or pr.used or pr.attempts >= config.OTP_MAX_ATTEMPTS
            or _aware(pr.expires_at) < datetime.now(timezone.utc)):
        raise invalid
    if not verify_password(body.otp, pr.otp_hash):
        pr.attempts += 1
        db.commit()
        raise invalid
    user.password_hash = hash_password(body.new_password)
    pr.used = True
    db.execute(delete(AuthToken).where(AuthToken.user_id == user.id))  # sign out every session
    db.commit()
    return {"detail": "Password updated. Please sign in."}


@app.post("/auth/logout", status_code=204)
def logout(creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)], user: Me, db: DB):
    db.execute(delete(AuthToken).where(AuthToken.token_hash == token_digest(creds.credentials)))
    db.commit()


@app.get("/auth/me")
def me(user: Me):
    return user_out(user)


# ── profiles ─────────────────────────────────────────────────────────────────
@app.patch("/users/{user_id}/profile")
def edit_profile(user_id: int, patch: ProfilePatch, user: Me, db: DB):
    if user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only edit your own profile")
    for field, value in patch.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(user, field, value)
    db.commit()
    return user_out(user)


# ── drafts (owner-only; other users' ids look like they don't exist) ─────────
@app.post("/drafts", status_code=201)
def create_draft(body: DraftIn, user: Me, db: DB):
    d = Draft(owner_id=user.id, title=body.title, body=body.body)
    db.add(d)
    db.commit()
    return draft_out(d)


@app.get("/drafts")
def list_drafts(user: Me, db: DB):
    rows = db.scalars(select(Draft).where(Draft.owner_id == user.id).order_by(Draft.id))
    return [draft_out(d) for d in rows]


def _own_draft(db: Session, user: User, draft_id: int) -> Draft:
    d = db.get(Draft, draft_id)
    if d is None or d.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Draft not found")
    return d


@app.get("/drafts/{draft_id}")
def get_draft(draft_id: int, user: Me, db: DB):
    return draft_out(_own_draft(db, user, draft_id))


@app.put("/drafts/{draft_id}")
def update_draft(draft_id: int, body: DraftIn, user: Me, db: DB):
    d = _own_draft(db, user, draft_id)
    d.title, d.body = body.title, body.body
    db.commit()
    return draft_out(d)


@app.delete("/drafts/{draft_id}", status_code=204)
def delete_draft(draft_id: int, user: Me, db: DB):
    db.delete(_own_draft(db, user, draft_id))
    db.commit()


# ── challenge answers ────────────────────────────────────────────────────────
@app.put("/challenges/{challenge_id}/answer")
def submit_answer(challenge_id: str, body: AnswerIn, user: Me, db: DB):
    row = db.scalar(select(ChallengeAnswer).where(
        ChallengeAnswer.user_id == user.id, ChallengeAnswer.challenge_id == challenge_id))
    if row is None:
        row = ChallengeAnswer(user_id=user.id, challenge_id=challenge_id)
        db.add(row)
    row.answer, row.correct = body.answer, body.correct
    db.commit()
    return answer_out(row)


@app.get("/users/{user_id}/challenge-answers")
def challenge_answers(user_id: int, user: Me, db: DB):
    if user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your answers")
    rows = db.scalars(select(ChallengeAnswer).where(ChallengeAnswer.user_id == user.id))
    return [answer_out(a) for a in rows]


# ── organizer ────────────────────────────────────────────────────────────────
@app.post("/organizer/events", status_code=201)
def create_event(body: EventIn, org: Organizer, db: DB):
    ev = Event(organizer_id=org.id, **body.model_dump())
    db.add(ev)
    db.commit()
    return {"id": ev.id, **body.model_dump()}


@app.get("/organizer/events")
def my_events(org: Organizer, db: DB):
    rows = db.scalars(select(Event).where(Event.organizer_id == org.id))
    return [{"id": e.id, "title": e.title, "category": e.category, "description": e.description} for e in rows]


@app.get("/organizer/roster")
def roster(org: Organizer, db: DB):
    # Public profile fields only: no email, drafts or answers.
    rows = db.scalars(select(User).where(User.role == "participant"))
    return [{"id": u.id, "name": u.name, "headline": u.headline, "skills": u.skills} for u in rows]


# ── AI suggestions (static unless ANTHROPIC_API_KEY is set) ──────────────────
@app.post("/ai/suggestions")
def ai_suggestions(body: SuggestIn, user: Me):
    return suggestions.get_suggestions(body.category)
