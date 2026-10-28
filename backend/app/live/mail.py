"""TLS-only SMTP delivery. Never log reset links, tokens or SMTP credentials."""
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlsplit
from backend.app.core.config import settings

def mail_ready():
    url=urlsplit(settings.PUBLIC_APP_URL)
    safe_url=(url.scheme=='https' or (url.scheme=='http' and url.hostname in ('localhost','127.0.0.1'))) and not url.query and not url.fragment and not url.username
    return bool(settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD and settings.SMTP_FROM and safe_url)

def send_reset_email(recipient,token):
    message=EmailMessage()
    message['Subject']='Reset your Skillfy password'
    message['From']=settings.SMTP_FROM
    message['To']=recipient
    link=settings.PUBLIC_APP_URL.rstrip('/')+'/reset-password#token='+token
    message.set_content('We received a request to reset your Skillfy password.\n\n'
      'Open this link to choose a new password:\n'+link+'\n\n'
      'This link expires in 15 minutes and can be used only once. Only your most recent reset link will work.\n'
      'If you did not request this, ignore this email. Your password has not changed.\n\nSkillfy')
    deliver(message)

def deliver(message):
    context=ssl.create_default_context()
    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(settings.SMTP_HOST,settings.SMTP_PORT,timeout=10,context=context) as smtp:
            smtp.login(settings.SMTP_USERNAME,settings.SMTP_PASSWORD)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(settings.SMTP_HOST,settings.SMTP_PORT,timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            smtp.login(settings.SMTP_USERNAME,settings.SMTP_PASSWORD)
            smtp.send_message(message)


def send_signup_otp(recipient,code):
    message=EmailMessage()
    message['Subject']='Your Skillfy verification code'
    message['From']=settings.SMTP_FROM
    message['To']=recipient
    message.set_content('Your Skillfy email verification code is: '+code+'\n\nEnter this code on the signup page. It expires in 10 minutes and works once. Only the latest code is valid. Do not share it. If you did not request this, ignore this email. No account has been created.')
    deliver(message)
