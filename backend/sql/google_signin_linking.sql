BEGIN;
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
