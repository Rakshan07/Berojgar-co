-- ============================================================================
-- TEAMWEAVE DATABASE BOOTSTRAP SCRIPT
-- Schema: hackloop
-- Database: PostgreSQL 14+
-- Description: Core schema, tables, foreign keys, constraints, triggers, indexes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS hackloop;

SET search_path TO hackloop, public;

-- ----------------------------------------------------------------------------
-- Common Trigger Function: Update updated_at column
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hackloop.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. Roles & Permissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Users & Authentication
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON hackloop.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON hackloop.users
FOR EACH ROW EXECUTE FUNCTION hackloop.update_updated_at_column();

CREATE TABLE IF NOT EXISTS hackloop.auth_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'local', 'github', 'google'
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_provider UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS hackloop.user_roles (
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    role_id VARCHAR(50) NOT NULL REFERENCES hackloop.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS hackloop.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON hackloop.user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON hackloop.user_sessions(user_id);

-- ----------------------------------------------------------------------------
-- 3. Profiles & Availability
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES hackloop.users(id) ON DELETE CASCADE,
    tagline VARCHAR(255),
    bio TEXT,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    hours_per_week INTEGER NOT NULL DEFAULT 10 CHECK (hours_per_week >= 0 AND hours_per_week <= 168),
    availability_constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    interests JSONB NOT NULL DEFAULT '[]'::jsonb,
    github_url TEXT,
    portfolio_url TEXT,
    linkedin_url TEXT,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON hackloop.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON hackloop.profiles
FOR EACH ROW EXECUTE FUNCTION hackloop.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. Skills & Proficiencies
-- Proficiency levels:
-- 1 = Exploring (Aware of the concept, limited hands-on practice)
-- 2 = Developing (Can apply with guidance, building practical experience)
-- 3 = Independent (Can work confidently without supervision)
-- 4 = Advanced / Can mentor (Deep expertise, able to guide others)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.skill_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hackloop.skills (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    category_id VARCHAR(50) NOT NULL REFERENCES hackloop.skill_categories(id) ON DELETE RESTRICT,
    description TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hackloop.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL REFERENCES hackloop.skills(id) ON DELETE CASCADE,
    proficiency INTEGER NOT NULL CHECK (proficiency BETWEEN 1 AND 4),
    is_self_declared BOOLEAN NOT NULL DEFAULT TRUE,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    last_assessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON hackloop.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON hackloop.user_skills(skill_id);

CREATE TABLE IF NOT EXISTS hackloop.participant_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    event_id UUID, -- NULL = Global recurring schedule, or references specific event
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME,
    end_time TIME,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    is_busy BOOLEAN NOT NULL DEFAULT FALSE,
    note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. Organizations & Organizer Verification
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    website_url TEXT,
    logo_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hackloop.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES hackloop.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS hackloop.organizer_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES hackloop.organizations(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    documents_url TEXT,
    reviewer_notes TEXT,
    reviewed_by UUID REFERENCES hackloop.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. Events, Categories, Requirements & Roles
-- Extensible categories: pre-seeded + dynamic custom additions by organizers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.event_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL DEFAULT 'violet',
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hackloop.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category_id VARCHAR(50) NOT NULL REFERENCES hackloop.event_categories(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    organizer_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE RESTRICT,
    organization_id UUID REFERENCES hackloop.organizations(id) ON DELETE SET NULL,
    mode VARCHAR(50) NOT NULL DEFAULT 'hybrid' CHECK (mode IN ('in-person', 'remote', 'hybrid')),
    location VARCHAR(255),
    min_team_size INTEGER NOT NULL DEFAULT 3 CHECK (min_team_size >= 1),
    max_team_size INTEGER NOT NULL DEFAULT 5 CHECK (max_team_size >= min_team_size),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL CHECK (end_date >= start_date),
    registration_deadline TIMESTAMPTZ NOT NULL CHECK (registration_deadline <= end_date),
    max_participants INTEGER NOT NULL DEFAULT 100 CHECK (max_participants >= 1),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'published', 'active', 'completed', 'cancelled')),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_events_updated_at ON hackloop.events;
CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON hackloop.events
FOR EACH ROW EXECUTE FUNCTION hackloop.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_events_status ON hackloop.events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON hackloop.events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON hackloop.events(organizer_id);

CREATE TABLE IF NOT EXISTS hackloop.event_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hackloop.events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    suggested_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hackloop.event_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hackloop.events(id) ON DELETE CASCADE,
    skill_name VARCHAR(150) NOT NULL,
    skill_id VARCHAR(100) REFERENCES hackloop.skills(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Technical',
    required BOOLEAN NOT NULL DEFAULT TRUE,
    min_proficiency INTEGER NOT NULL DEFAULT 2 CHECK (min_proficiency BETWEEN 1 AND 4),
    target_count INTEGER NOT NULL DEFAULT 1 CHECK (target_count >= 1),
    priority INTEGER NOT NULL DEFAULT 1,
    role_association VARCHAR(100),
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_reqs_event ON hackloop.event_requirements(event_id);

-- ----------------------------------------------------------------------------
-- 7. Event Registrations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hackloop.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'waitlisted', 'withdrawn', 'checked_in')),
    preferred_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    withdrawn_at TIMESTAMPTZ,
    CONSTRAINT uq_event_registration UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON hackloop.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON hackloop.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON hackloop.event_registrations(status);

-- ----------------------------------------------------------------------------
-- 8. Assessments, Questions & Evaluations
-- Published versions are immutable.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hackloop.events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ,
    CONSTRAINT uq_event_assessment_version UNIQUE (event_id, version)
);

CREATE TABLE IF NOT EXISTS hackloop.assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES hackloop.assessments(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 1,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'open_text' CHECK (question_type IN ('open_text', 'multiple_choice', 'code_snippet', 'link')),
    skill_target VARCHAR(150),
    options JSONB, -- For multiple choice
    rubric JSONB,  -- Internal server-side grading guide
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hackloop.assessment_question_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hackloop.events(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL DEFAULT 'ai_generated' CHECK (source IN ('ai_generated', 'manual')),
    question_text TEXT NOT NULL,
    skill_target VARCHAR(150),
    suggested_rubric JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hackloop.assessment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES hackloop.assessments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'evaluated')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,
    CONSTRAINT uq_assessment_submission UNIQUE (assessment_id, user_id)
);

CREATE TABLE IF NOT EXISTS hackloop.assessment_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES hackloop.assessment_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES hackloop.assessment_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    file_reference TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_submission_question UNIQUE (submission_id, question_id)
);

CREATE TABLE IF NOT EXISTS hackloop.submission_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES hackloop.assessment_submissions(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES hackloop.users(id) ON DELETE SET NULL,
    evaluator_type VARCHAR(50) NOT NULL DEFAULT 'ai' CHECK (evaluator_type IN ('ai', 'peer', 'organizer')),
    model_id VARCHAR(100),
    score NUMERIC(5, 2) NOT NULL CHECK (score >= 0),
    rubric_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    feedback_notes TEXT,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 9. AI Event Setup Generations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.ai_event_setups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hackloop.events(id) ON DELETE CASCADE,
    organizer_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL, -- 'mock', 'openai', 'gemini', 'anthropic'
    model VARCHAR(100) NOT NULL,
    prompt_version VARCHAR(50) NOT NULL DEFAULT 'v1',
    request_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    suggested_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    explanation TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'approved', 'rejected', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_ai_event_setups_updated_at ON hackloop.ai_event_setups;
CREATE TRIGGER trg_ai_event_setups_updated_at
BEFORE UPDATE ON hackloop.ai_event_setups
FOR EACH ROW EXECUTE FUNCTION hackloop.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 10. Matching Runs & Proposed Assignments
-- Separated from active memberships until organizer approval
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.matching_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hackloop.events(id) ON DELETE CASCADE,
    initiated_by UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE RESTRICT,
    algorithm_version VARCHAR(100) NOT NULL DEFAULT 'teamweave-v1-greedy-complementary',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'approved', 'rejected', 'failed')),
    config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_matching_runs_event ON hackloop.matching_runs(event_id);

CREATE TABLE IF NOT EXISTS hackloop.proposed_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matching_run_id UUID NOT NULL REFERENCES hackloop.matching_runs(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES hackloop.events(id) ON DELETE CASCADE,
    team_name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'modified')),
    coverage_score NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hackloop.proposed_member_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposed_team_id UUID NOT NULL REFERENCES hackloop.proposed_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    suggested_role VARCHAR(100) NOT NULL DEFAULT 'Member',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_proposed_team_user UNIQUE (proposed_team_id, user_id)
);

CREATE TABLE IF NOT EXISTS hackloop.match_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposed_team_id UUID NOT NULL UNIQUE REFERENCES hackloop.proposed_teams(id) ON DELETE CASCADE,
    requirements_covered JSONB NOT NULL DEFAULT '[]'::jsonb,
    partial_covered JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    member_contributions JSONB NOT NULL DEFAULT '[]'::jsonb,
    coverage_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
    match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    unassigned_participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 11. Confirmed Teams & Active Memberships
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hackloop.events(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'forming' CHECK (status IN ('forming', 'locked', 'published', 'archived')),
    matching_run_id UUID REFERENCES hackloop.matching_runs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_teams_event ON hackloop.teams(event_id);

CREATE TABLE IF NOT EXISTS hackloop.team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES hackloop.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL DEFAULT 'Member',
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'departed', 'removed')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    departed_at TIMESTAMPTZ,
    departure_reason TEXT
);

-- Partial index ensuring only one active membership per user per team
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_user_active 
ON hackloop.team_memberships(team_id, user_id) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_memberships_user ON hackloop.team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_team ON hackloop.team_memberships(team_id);

CREATE TABLE IF NOT EXISTS hackloop.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES hackloop.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS hackloop.team_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES hackloop.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 12. Replacement Recommendations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.replacement_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES hackloop.teams(id) ON DELETE CASCADE,
    departed_user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    uncovered_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    candidate_user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    candidate_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    covered_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    impact_on_candidate_team TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    decided_by UUID REFERENCES hackloop.users(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 13. Team Collaboration: Messages & Meetings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.team_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES hackloop.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_messages_team ON hackloop.team_messages(team_id);

CREATE TABLE IF NOT EXISTS hackloop.team_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES hackloop.teams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    meeting_link TEXT,
    created_by UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 14. Gamification, XP Ledger & Feedback
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.daily_challenges (
    id VARCHAR(50) PRIMARY KEY,
    challenge_date DATE NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer VARCHAR(10) NOT NULL,
    explanation TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 10,
    skill_tag VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hackloop.user_challenge_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    challenge_id VARCHAR(50) NOT NULL REFERENCES hackloop.daily_challenges(id) ON DELETE CASCADE,
    selected_answer VARCHAR(10) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_challenge UNIQUE (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS hackloop.xp_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive for rewards, negative for audit reversals
    action_type VARCHAR(100) NOT NULL, -- 'daily_challenge', 'event_registration', 'team_formation', 'reversal'
    reference_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_xp_ledger_user ON hackloop.xp_ledger(user_id);

CREATE TABLE IF NOT EXISTS hackloop.achievements (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    icon_name VARCHAR(100),
    xp_reward INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hackloop.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL REFERENCES hackloop.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS hackloop.collaboration_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hackloop.events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES hackloop.teams(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES hackloop.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    communication_notes TEXT,
    strengths TEXT,
    growth_areas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 15. Notifications & Audit Logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hackloop.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hackloop.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'team_invite', 'match_proposed', 'replacement_available', 'event_update'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON hackloop.notifications(user_id) WHERE is_read = FALSE;

CREATE TABLE IF NOT EXISTS hackloop.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES hackloop.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON hackloop.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON hackloop.audit_logs(actor_id);

-- End of bootstrap.sql
