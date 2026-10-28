BEGIN;
CREATE TABLE IF NOT EXISTS hackloop.email_signup_codes (
 challenge_hash text PRIMARY KEY,
 code_hash text NOT NULL,
 email text NOT NULL UNIQUE,
 role text NOT NULL CHECK(role IN ('participant','organizer')),
 attempts integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL
);
COMMIT;
