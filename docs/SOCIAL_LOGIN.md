# Google and GitHub sign-in setup

The signup and sign-in pages provide Google, GitHub, and an email/password option.
New provider accounts continue to /complete-profile. Organizers submit the required
verification details and documents; social login does not grant admin approval.
Existing completed accounts go to their workspace. For a first-time social account,
choose the Sign Up tab. Sign In requires a previously linked provider identity.

## Local setup

Use one consistent frontend origin: currently http://localhost:5174. The frontend
must proxy /api to the backend (already configured in Vite). PUBLIC_APP_URL in the
root ignored .env must match that origin exactly, including the port. In production,
use the real HTTPS origin and route /api to the backend on the same origin.

1. Google: create a Web application OAuth client in Google Cloud / Google Auth Platform.
   Configure the consent screen and, while in testing, add your test users.
   Set the authorized redirect URI exactly to:
   http://localhost:5174/api/v1/auth/oauth/google/callback
   Add its client ID and client secret privately to root .env:
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

2. GitHub: Settings > Developer settings > OAuth Apps > New OAuth App.
   Homepage URL: http://localhost:5174
   Authorization callback URL:
   http://localhost:5174/api/v1/auth/oauth/github/callback
   Generate a client secret and configure privately in root .env:
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=

These are OAuth credentials, not the Gmail SMTP App Password. Never commit them or
put secrets in VITE_ variables. Each development origin must be registered with the
provider; separate development OAuth apps are simplest for different callback URLs.

Install backend/requirements-live.txt in the virtual environment (PyJWT now needs
its crypto extra). Apply backend/sql/social_login.sql to each existing database.
The migration has already been applied to the local hackloop database. Restart the
backend after credentials are configured, then refresh the frontend.

## Behavior and limitations

Provider login uses authorization code exchange, PKCE, browser-bound state with
10-minute expiry, Google signature/audience/issuer/nonce validation, and verified
provider emails. GitHub scopes are read:user and user:email, with no repository access.
Provider access tokens are not retained. The frontend receives an opaque app session
through a one-time 60-second HTTP-only cookie handoff, not via URL parameters.
Account chooser behavior is controlled by Google/GitHub and the browser session;
this website cannot list accounts logged into the operating system.

Accounts with matching emails are not silently merged. If an email already belongs
to another login method, use that existing method. Explicit account linking is not
implemented. Password reset remains for accounts with a local password. Provider-only
accounts recover their login through Google/GitHub.

Verification: 20 backend tests pass, including mocked provider flows, callback replay,
wrong-browser and expired-state rejection, duplicate-email protection, role checks,
and Google signed-ID-token validation. Frontend build and changed-file lint pass.
Live provider consent/login cannot be tested until OAuth credentials are configured.

Official references:
https://developers.google.com/identity/openid-connect/openid-connect
https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps


## Connect Google to an existing email/password account
Run `backend/sql/google_account_linking.sql` against the existing Hackloop database, then restart the backend. New installations using `social_login.sql` already include these columns.
Sign in with the website password, open My Profile, and use Sign-in methods → Connect Google. Confirm the current website password and choose the same email in Google. This preserves the user ID, profile, teams, and history. The original session must remain active through the callback. Google identities owned by another account cannot be linked. No automatic email-based account merging or unlinking is performed.

## Google sign-in for an existing password account
Apply `backend/sql/google_signin_linking.sql` once on existing installations (included in `social_login.sql` for new installations). Selecting Google with an existing password-account email now prompts for the website password directly on the return page. Confirmation expires after five minutes and allows five password attempts. A successful confirmation links the Google identity to the existing user ID and signs in; future Google sign-ins need no website password.

New provider accounts must create and confirm a website password on the account-setup page before completing participant or organizer details. The authenticated setup endpoint only sets a missing password; it cannot overwrite one. Users can subsequently sign in with either the provider or that same email and website password.

## Email signup verification (OTP)
Apply `backend/sql/email_verified_signup.sql` on new installations. Existing installations that already have verified email signup only need `backend/sql/email_signup_otp.sql`. Restart the backend.

Use email instead asks for an email, sends a six-digit code through the existing TLS SMTP configuration, and displays a code entry form. Codes expire in ten minutes, have five attempts, and are replaced on resend. `/auth/signup/email/verify` consumes the code and returns a short-lived signup proof for the create-password screen. `/auth/register` requires that proof and matching email and role. The signup proof is not emailed. Code hashes are bound to random challenges, and raw codes are not stored or logged.

Email/password sign-in, Google/GitHub, and password-reset links are unchanged. Tests mock email delivery; perform a real inbox signup test before deployment. No SMS integration was added.
