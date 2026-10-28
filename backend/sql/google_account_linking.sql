BEGIN;
ALTER TABLE hackloop.oauth_flows ADD COLUMN IF NOT EXISTS link_user_id uuid REFERENCES hackloop.users(id) ON DELETE CASCADE;
ALTER TABLE hackloop.oauth_flows ADD COLUMN IF NOT EXISTS link_session_hash text;
COMMIT;
