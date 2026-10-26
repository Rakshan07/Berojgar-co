-- Hackloop dashboard additions, based on the installed schema inspected 2026-10-25.
-- Run once in pgAdmin against hackloop. Back up first. No demo records are inserted.
-- This is storage support, not authentication, AI generation or XP award logic.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE IF NOT EXISTS hackloop.feature_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM hackloop.feature_migrations WHERE version = '20261025_dashboard_v1') THEN
    RAISE NOTICE 'Dashboard migration already applied; skipping.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='hackloop' AND table_name='users' AND column_name='display_name')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='hackloop' AND table_name='xp_ledger' AND column_name='outcome_id') THEN
    RAISE EXCEPTION 'Unexpected base schema. Do not use the repository bootstrap to replace this database.';
  END IF;

  -- College already exists as profiles.institution. Name/email are in users.
  ALTER TABLE hackloop.profiles
    ADD COLUMN course varchar(200),
    ADD COLUMN study_year smallint CHECK (study_year BETWEEN 1 AND 12);

  -- Separate private information so public profile responses cannot accidentally include it.
  CREATE TABLE hackloop.profile_private_details (
    user_id uuid PRIMARY KEY REFERENCES hackloop.users(id) ON DELETE CASCADE,
    phone_number varchar(32),
    address_line_1 varchar(250),
    address_line_2 varchar(250),
    city varchar(120),
    region varchar(120),
    postal_code varchar(32),
    country_code varchar(2) CHECK (country_code ~ '^[A-Z]{2}$'),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.profile_private_details
    FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();

  -- Preserve all old category values and permit the requested additional fields.
  ALTER TABLE hackloop.events DROP CONSTRAINT events_category_check;
  ALTER TABLE hackloop.events ADD CONSTRAINT events_category_check CHECK (
    category IN ('hackathon','technical_competition','research','music','creative','other',
      'coding_competition','ai_coding','ai_ml','robotics','iot','technical_quiz',
      'startup_pitch','debate','esports','web_development','mobile_development',
      'data_science','cybersecurity','project_exhibition','research_presentation')
  );

  -- One participant contribution record per event, independently of winning.
  CREATE TABLE hackloop.event_contributions (
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_description varchar(200),
    contribution_summary text NOT NULL CHECK (length(btrim(contribution_summary)) > 0),
    evidence_storage_key text,
    performance_score numeric(5,2) CHECK (performance_score BETWEEN 0 AND 100),
    review_status text NOT NULL DEFAULT 'pending'
      CHECK (review_status IN ('pending','approved','rejected')),
    reviewed_by uuid REFERENCES hackloop.users(id),
    reviewed_at timestamptz,
    review_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id,user_id),
    FOREIGN KEY (event_id,user_id) REFERENCES hackloop.event_registrations(event_id,user_id),
    CHECK (reviewed_by IS NULL OR reviewed_by <> user_id),
    CHECK ((review_status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL
        AND performance_score IS NULL)
      OR (review_status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
  );
  CREATE INDEX event_contributions_user_idx ON hackloop.event_contributions(user_id,event_id);
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.event_contributions
    FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();

  -- Feedback stays pending until reviewed. It does not award XP automatically.
  CREATE TABLE hackloop.event_peer_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL,
    team_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewee_id uuid NOT NULL,
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback_text text,
    review_status text NOT NULL DEFAULT 'pending'
      CHECK (review_status IN ('pending','approved','rejected')),
    moderated_by uuid REFERENCES hackloop.users(id),
    moderated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id,reviewer_id,reviewee_id),
    FOREIGN KEY (event_id,team_id) REFERENCES hackloop.teams(event_id,id),
    FOREIGN KEY (event_id,reviewer_id) REFERENCES hackloop.event_registrations(event_id,user_id),
    FOREIGN KEY (event_id,reviewee_id) REFERENCES hackloop.event_registrations(event_id,user_id),
    CHECK (reviewer_id <> reviewee_id),
    CHECK (moderated_by IS NULL OR (moderated_by <> reviewer_id AND moderated_by <> reviewee_id)),
    CHECK ((review_status='pending' AND moderated_by IS NULL AND moderated_at IS NULL)
      OR (review_status IN ('approved','rejected') AND moderated_by IS NOT NULL AND moderated_at IS NOT NULL))
  );
  CREATE INDEX event_peer_feedback_reviewee_idx ON hackloop.event_peer_feedback(reviewee_id,event_id);

  CREATE FUNCTION hackloop.check_feedback_team() RETURNS trigger
    LANGUAGE plpgsql SET search_path = pg_catalog, hackloop AS $function$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM hackloop.team_members
      WHERE event_id=NEW.event_id AND team_id=NEW.team_id AND user_id=NEW.reviewer_id)
      OR NOT EXISTS (SELECT 1 FROM hackloop.team_members
      WHERE event_id=NEW.event_id AND team_id=NEW.team_id AND user_id=NEW.reviewee_id) THEN
      RAISE EXCEPTION 'Both feedback participants must have belonged to this event team';
    END IF;
    RETURN NEW;
  END;
  $function$;
  CREATE TRIGGER check_feedback_team BEFORE INSERT OR UPDATE ON hackloop.event_peer_feedback
    FOR EACH ROW EXECUTE FUNCTION hackloop.check_feedback_team();

  -- Existing submissions identify the event, user and attempt.
  -- A frozen context records what the generator knew at assignment time.
  CREATE TABLE hackloop.personalized_assessment_contexts (
    submission_id uuid PRIMARY KEY REFERENCES hackloop.assessment_submissions(id),
    event_description_snapshot text NOT NULL,
    skills_snapshot jsonb NOT NULL CHECK (jsonb_typeof(skills_snapshot)='array'),
    experience_level text NOT NULL CHECK (experience_level IN ('beginner','intermediate','advanced')),
    generator_model text NOT NULL,
    prompt_version text NOT NULL,
    generated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE hackloop.personalized_assessment_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id uuid NOT NULL REFERENCES hackloop.personalized_assessment_contexts(submission_id),
    position integer NOT NULL CHECK (position > 0),
    prompt text NOT NULL CHECK (length(btrim(prompt)) > 0),
    response_type text NOT NULL CHECK (response_type IN ('text','url','file')),
    skill_id bigint REFERENCES hackloop.skills(id),
    difficulty text NOT NULL CHECK (difficulty IN ('beginner','intermediate','advanced')),
    rubric jsonb NOT NULL CHECK (jsonb_typeof(rubric)='object'),
    max_score numeric(8,2) NOT NULL CHECK (max_score > 0),
    UNIQUE (submission_id,position),
    UNIQUE (submission_id,id)
  );
  -- Separate from shared-template answers; never put personalized IDs into assessment_answers.
  CREATE TABLE hackloop.personalized_assessment_answers (
    submission_id uuid NOT NULL,
    question_id uuid NOT NULL,
    answer_text text,
    attachment_storage_key text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (submission_id,question_id),
    FOREIGN KEY (submission_id,question_id)
      REFERENCES hackloop.personalized_assessment_questions(submission_id,id),
    CHECK (nullif(btrim(answer_text),'') IS NOT NULL OR nullif(btrim(attachment_storage_key),'') IS NOT NULL)
  );
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.personalized_assessment_answers
    FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();

  -- Derive history from real verified outcomes; do not maintain a duplicate history table.
  CREATE VIEW hackloop.participant_event_history WITH (security_invoker=true) AS
    SELECT o.user_id,o.event_id,e.title,e.category,e.starts_at,e.ends_at,
      array_agg(DISTINCT o.outcome_type ORDER BY o.outcome_type) AS outcomes,
      max(o.verified_at) AS last_verified_at
    FROM hackloop.event_outcomes o JOIN hackloop.events e ON e.id=o.event_id
    WHERE o.status='verified' AND o.outcome_type IN ('completed','finalist','winner')
    GROUP BY o.user_id,o.event_id,e.title,e.category,e.starts_at,e.ends_at;

  INSERT INTO hackloop.feature_migrations(version) VALUES ('20261025_dashboard_v1');
END;
$migration$;
COMMIT;

-- Verification: expected version row and 7 new feature tables, plus the history view.
SELECT version,applied_at FROM hackloop.feature_migrations WHERE version='20261025_dashboard_v1';
SELECT table_name FROM information_schema.tables WHERE table_schema='hackloop'
  AND table_name IN ('profile_private_details','event_contributions','event_peer_feedback',
    'personalized_assessment_contexts','personalized_assessment_questions',
    'personalized_assessment_answers','feature_migrations','participant_event_history')
  ORDER BY table_name;
