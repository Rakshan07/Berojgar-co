"""Outgoing email. Free options only: any SMTP server (e.g. a Gmail account with an
app password). With SMTP_HOST unset (local dev) the message is logged to the console."""

import logging
import smtplib
from email.message import EmailMessage

from . import config

log = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    if not config.SMTP_HOST:
        log.warning("SMTP not configured; email to %s not sent.\nSubject: %s\n%s", to, subject, body)
        return
    msg = EmailMessage()
    msg["From"] = config.SMTP_FROM or config.SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            if config.SMTP_USER:
                smtp.login(config.SMTP_USER, config.SMTP_PASSWORD)
            smtp.send_message(msg)
    except Exception:
        # Never surface SMTP failures to the caller: it would reveal whether the account exists.
        log.exception("Failed to send email to %s", to)


def send_reset_otp(to: str, otp: str) -> None:
    send_email(
        to,
        "Your TeamWeave password reset code",
        f"Your TeamWeave verification code is {otp}.\n\n"
        f"It expires in {config.OTP_TTL_MINUTES} minutes. If you didn't request this, ignore this email.",
    )
