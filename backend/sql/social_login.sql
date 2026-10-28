BEGIN;
CREATE TABLE IF NOT EXISTS hackloop.oauth_flows (
 state_hash text PRIMARY KEY,
 browser_hash text NOT NULL,
 provider text NOT NULL CHECK(provider IN ('google','github')),
 role text NOT NULL CHECK(role IN ('participant','organizer')),
 mode text NOT NULL CHECK(mode IN ('signup','signin')),
 verifier text NOT NULL,
 nonce text NOT NULL,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hackloop.oauth_handoffs (
 code_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
ALTER TABLE hackloop.oauth_flows ADD COLUMN IF NOT EXISTS link_user_id uuid REFERENCES hackloop.users(id) ON DELETE CASCADE;
ALTER TABLE hackloop.oauth_flows ADD COLUMN IF NOT EXISTS link_session_hash text;
CREATE TABLE IF NOT EXISTS hackloop.oauth_link_confirmations (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
 subject text NOT NULL,
 email text NOT NULL,
 role text NOT NULL CHECK(role IN ('participant','organizer')),
 attempts integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL
);
COMMIT;
