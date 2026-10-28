BEGIN;
CREATE TABLE IF NOT EXISTS hackloop.email_signup_links (
 token_hash text PRIMARY KEY,
 email text NOT NULL,
 role text NOT NULL CHECK(role IN ('participant','organizer')),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz
);
CREATE TABLE IF NOT EXISTS hackloop.email_signup_attempts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 email_digest text NOT NULL,
 client_digest text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_signup_attempts_email_idx ON hackloop.email_signup_attempts(email_digest,created_at);
CREATE INDEX IF NOT EXISTS email_signup_attempts_client_idx ON hackloop.email_signup_attempts(client_digest,created_at);
CREATE TABLE IF NOT EXISTS hackloop.email_signup_codes (
 challenge_hash text PRIMARY KEY,
 code_hash text NOT NULL,
 email text NOT NULL UNIQUE,
 role text NOT NULL CHECK(role IN ('participant','organizer')),
 attempts integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL
);
COMMIT;
