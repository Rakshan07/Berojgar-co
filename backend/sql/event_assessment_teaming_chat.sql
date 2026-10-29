-- Migration: Event Assessment, Team Matching, and Private Team Chat
-- Schema additions for hackloop

BEGIN;

-- 1. Events: Event brief, rules, deliverables, constraints, judging criteria, versioning
ALTER TABLE hackloop.events ADD COLUMN IF NOT EXISTS rules text;
ALTER TABLE hackloop.events ADD COLUMN IF NOT EXISTS eligibility text;
ALTER TABLE hackloop.events ADD COLUMN IF NOT EXISTS expected_deliverables text;
ALTER TABLE hackloop.events ADD COLUMN IF NOT EXISTS constraints_and_tools text;
ALTER TABLE hackloop.events ADD COLUMN IF NOT EXISTS judging_criteria text;
ALTER TABLE hackloop.events ADD COLUMN IF NOT EXISTS event_brief jsonb;
ALTER TABLE hackloop.events ADD COLUMN IF NOT EXISTS version integer DEFAULT 1 NOT NULL;
ALTER TABLE hackloop.events ADD COLUMN IF NOT EXISTS brief_version integer DEFAULT 1 NOT NULL;

-- 2. Event Registrations: Event-specific profile & intake data
ALTER TABLE hackloop.event_registrations ADD COLUMN IF NOT EXISTS selected_skills jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE hackloop.event_registrations ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'intermediate'::text NOT NULL;
ALTER TABLE hackloop.event_registrations ADD COLUMN IF NOT EXISTS preferred_roles jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE hackloop.event_registrations ADD COLUMN IF NOT EXISTS relevant_experience text;
ALTER TABLE hackloop.event_registrations ADD COLUMN IF NOT EXISTS availability_hours_per_week integer DEFAULT 10;
ALTER TABLE hackloop.event_registrations ADD COLUMN IF NOT EXISTS contribution_intent text;

-- 3. Assessment Submissions: Real workflow states & evaluation summaries
ALTER TABLE hackloop.assessment_submissions DROP CONSTRAINT IF EXISTS assessment_submissions_status_check;
ALTER TABLE hackloop.assessment_submissions ADD CONSTRAINT assessment_submissions_status_check 
  CHECK (status = ANY (ARRAY['draft'::text, 'generating'::text, 'ready'::text, 'submitted'::text, 'evaluating'::text, 'completed'::text, 'failed'::text, 'withdrawn'::text]));

ALTER TABLE hackloop.assessment_submissions ADD COLUMN IF NOT EXISTS selected_role text;
ALTER TABLE hackloop.assessment_submissions ADD COLUMN IF NOT EXISTS evaluation_summary text;
ALTER TABLE hackloop.assessment_submissions ADD COLUMN IF NOT EXISTS evaluation_details jsonb;
ALTER TABLE hackloop.assessment_submissions ADD COLUMN IF NOT EXISTS evaluation_score numeric(5,2);
ALTER TABLE hackloop.assessment_submissions ADD COLUMN IF NOT EXISTS error_message text;

-- Ensure single active assessment submission attempt per user per event
CREATE UNIQUE INDEX IF NOT EXISTS uq_assessment_submissions_active_attempt 
  ON hackloop.assessment_submissions (event_id, user_id, attempt_number);

-- 4. Personalized Assessment Contexts: Role and event version snapshots
ALTER TABLE hackloop.personalized_assessment_contexts ADD COLUMN IF NOT EXISTS selected_role text;
ALTER TABLE hackloop.personalized_assessment_contexts ADD COLUMN IF NOT EXISTS event_version integer DEFAULT 1 NOT NULL;

-- 5. Personalized Assessment Answers: Draft indicator
ALTER TABLE hackloop.personalized_assessment_answers ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT true NOT NULL;

-- 6. Assessment Evaluations: Structured evaluation details
ALTER TABLE hackloop.assessment_evaluations ADD COLUMN IF NOT EXISTS evaluation_details jsonb;

-- 7. Teams: Creator role, seeking roles, recruiting state
ALTER TABLE hackloop.teams ADD COLUMN IF NOT EXISTS creator_role text;
ALTER TABLE hackloop.teams ADD COLUMN IF NOT EXISTS seeking_roles jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE hackloop.teams ADD COLUMN IF NOT EXISTS is_recruiting boolean DEFAULT true NOT NULL;

-- 8. Team Members: Assigned role & single active team constraint
ALTER TABLE hackloop.team_members ADD COLUMN IF NOT EXISTS assigned_role text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_members_active_event_user 
  ON hackloop.team_members (event_id, user_id) WHERE (left_at IS NULL);

-- 9. Team Requests: Target role & unique pending request
ALTER TABLE hackloop.team_requests ADD COLUMN IF NOT EXISTS target_role text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_requests_pending 
  ON hackloop.team_requests (team_id, user_id, request_type) WHERE (status = 'pending');

-- 10. Team Messages: Client message ID idempotency & sender user ID
ALTER TABLE hackloop.team_messages ADD COLUMN IF NOT EXISTS client_message_id text;
ALTER TABLE hackloop.team_messages ADD COLUMN IF NOT EXISTS sender_user_id uuid REFERENCES hackloop.users(id);

CREATE INDEX IF NOT EXISTS idx_team_messages_team_created 
  ON hackloop.team_messages (team_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_messages_client_id 
  ON hackloop.team_messages (team_id, client_message_id) WHERE (client_message_id IS NOT NULL);

-- 11. Record migration
INSERT INTO hackloop.feature_migrations(version) 
  VALUES ('20261029_assessment_teaming_chat_v1') 
  ON CONFLICT (version) DO NOTHING;

COMMIT;

