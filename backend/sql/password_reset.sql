BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS hackloop.password_reset_requests (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email_digest text NOT NULL,
    client_digest text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_email_time_idx ON hackloop.password_reset_requests(email_digest,created_at);
CREATE INDEX IF NOT EXISTS password_reset_client_time_idx ON hackloop.password_reset_requests(client_digest,created_at);
COMMIT;
