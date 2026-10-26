BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE hackloop.profiles ADD COLUMN IF NOT EXISTS academic_year smallint CHECK (academic_year BETWEEN 1900 AND 2200);
ALTER TABLE hackloop.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
COMMENT ON COLUMN hackloop.profiles.academic_year IS 'Calendar academic year, e.g. 2026. Legacy study_year retains its original year-of-study meaning.';
COMMIT;
