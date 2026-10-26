--
-- PostgreSQL database dump
--

\restrict smrtCectae4064ZPRm4oOOLw6PxiIxMUhWOKOnxiYKPRKJA1wybkAr1wOqWGLdd

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: hackloop; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA hackloop;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: hackloop; Owner: -
--

CREATE FUNCTION hackloop.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(80) NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    icon_url text,
    criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT achievements_criteria_check CHECK ((jsonb_typeof(criteria) = 'object'::text))
);


--
-- Name: assessment_answers; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.assessment_answers (
    assessment_id uuid NOT NULL,
    submission_id uuid NOT NULL,
    question_id uuid NOT NULL,
    answer_text text,
    attachment_storage_key text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessment_answers_check CHECK (((NULLIF(btrim(answer_text), ''::text) IS NOT NULL) OR (NULLIF(btrim(attachment_storage_key), ''::text) IS NOT NULL)))
);


--
-- Name: assessment_evaluations; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.assessment_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    evaluator_type text NOT NULL,
    reviewer_id uuid,
    model_identifier text,
    rubric_version text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    summary text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessment_evaluations_check CHECK ((((evaluator_type = 'human'::text) AND (reviewer_id IS NOT NULL)) OR ((evaluator_type = 'ai'::text) AND (model_identifier IS NOT NULL)))),
    CONSTRAINT assessment_evaluations_check1 CHECK (((status <> 'completed'::text) OR (completed_at IS NOT NULL))),
    CONSTRAINT assessment_evaluations_evaluator_type_check CHECK ((evaluator_type = ANY (ARRAY['ai'::text, 'human'::text]))),
    CONSTRAINT assessment_evaluations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: assessment_questions; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.assessment_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    prompt text NOT NULL,
    "position" integer NOT NULL,
    response_type text DEFAULT 'text'::text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    rubric jsonb DEFAULT '{}'::jsonb NOT NULL,
    max_score numeric(7,2) DEFAULT 100 NOT NULL,
    CONSTRAINT assessment_questions_max_score_check CHECK ((max_score > (0)::numeric)),
    CONSTRAINT assessment_questions_position_check CHECK (("position" >= 1)),
    CONSTRAINT assessment_questions_response_type_check CHECK ((response_type = ANY (ARRAY['text'::text, 'url'::text, 'file'::text]))),
    CONSTRAINT assessment_questions_rubric_check CHECK ((jsonb_typeof(rubric) = 'object'::text))
);


--
-- Name: assessment_submissions; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.assessment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    assessment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessment_submissions_attempt_number_check CHECK ((attempt_number >= 1)),
    CONSTRAINT assessment_submissions_check CHECK (((status <> 'submitted'::text) OR (submitted_at IS NOT NULL))),
    CONSTRAINT assessment_submissions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'withdrawn'::text])))
);


--
-- Name: assessments; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    version integer NOT NULL,
    title character varying(200) NOT NULL,
    instructions text,
    status text DEFAULT 'draft'::text NOT NULL,
    opens_at timestamp with time zone,
    closes_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessments_check CHECK (((opens_at IS NULL) OR (closes_at IS NULL) OR (opens_at < closes_at))),
    CONSTRAINT assessments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'closed'::text]))),
    CONSTRAINT assessments_version_check CHECK ((version >= 1))
);


--
-- Name: audit_logs; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.audit_logs (
    id bigint NOT NULL,
    actor_user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text))
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: hackloop; Owner: -
--

ALTER TABLE hackloop.audit_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME hackloop.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_identities; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.auth_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    provider_subject text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_tokens; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.auth_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    purpose text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auth_tokens_check CHECK ((expires_at > created_at)),
    CONSTRAINT auth_tokens_purpose_check CHECK ((purpose = ANY (ARRAY['session'::text, 'email_verification'::text, 'password_reset'::text])))
);


--
-- Name: evaluation_skill_scores; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.evaluation_skill_scores (
    evaluation_id uuid NOT NULL,
    skill_id bigint NOT NULL,
    score numeric(5,2) NOT NULL,
    confidence numeric(4,3),
    explanation text NOT NULL,
    CONSTRAINT evaluation_skill_scores_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT evaluation_skill_scores_score_check CHECK (((score >= (0)::numeric) AND (score <= (100)::numeric)))
);


--
-- Name: event_outcomes; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.event_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    outcome_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    evidence_storage_key text,
    recorded_by uuid NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_outcomes_check CHECK (((status <> 'verified'::text) OR ((verified_by IS NOT NULL) AND (verified_at IS NOT NULL)))),
    CONSTRAINT event_outcomes_outcome_type_check CHECK ((outcome_type = ANY (ARRAY['participated'::text, 'completed'::text, 'finalist'::text, 'winner'::text]))),
    CONSTRAINT event_outcomes_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'revoked'::text])))
);


--
-- Name: event_registrations; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.event_registrations (
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    preferred_role_id uuid,
    status text DEFAULT 'registered'::text NOT NULL,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_registrations_status_check CHECK ((status = ANY (ARRAY['registered'::text, 'waitlisted'::text, 'withdrawn'::text, 'disqualified'::text])))
);


--
-- Name: event_role_skills; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.event_role_skills (
    event_role_id uuid NOT NULL,
    skill_id bigint NOT NULL,
    importance smallint DEFAULT 3 NOT NULL,
    CONSTRAINT event_role_skills_importance_check CHECK (((importance >= 1) AND (importance <= 5)))
);


--
-- Name: event_roles; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.event_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    minimum_per_team smallint DEFAULT 0 NOT NULL,
    maximum_per_team smallint DEFAULT 1 NOT NULL,
    CONSTRAINT event_roles_check CHECK ((maximum_per_team >= minimum_per_team)),
    CONSTRAINT event_roles_maximum_per_team_check CHECK ((maximum_per_team >= 1)),
    CONSTRAINT event_roles_minimum_per_team_check CHECK ((minimum_per_team >= 0))
);


--
-- Name: events; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    created_by uuid NOT NULL,
    title character varying(200) NOT NULL,
    slug character varying(180) NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    event_mode text NOT NULL,
    venue text,
    timezone character varying(100) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    cover_image_url text,
    registration_opens_at timestamp with time zone NOT NULL,
    registration_closes_at timestamp with time zone NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    min_team_size smallint DEFAULT 2 NOT NULL,
    max_team_size smallint DEFAULT 5 NOT NULL,
    participant_capacity integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT events_category_check CHECK ((category = ANY (ARRAY['hackathon'::text, 'technical_competition'::text, 'research'::text, 'music'::text, 'creative'::text, 'other'::text]))),
    CONSTRAINT events_check CHECK ((registration_opens_at < registration_closes_at)),
    CONSTRAINT events_check1 CHECK ((registration_closes_at <= starts_at)),
    CONSTRAINT events_check2 CHECK ((starts_at < ends_at)),
    CONSTRAINT events_check3 CHECK ((max_team_size >= min_team_size)),
    CONSTRAINT events_event_mode_check CHECK ((event_mode = ANY (ARRAY['online'::text, 'onsite'::text, 'hybrid'::text]))),
    CONSTRAINT events_min_team_size_check CHECK ((min_team_size >= 1)),
    CONSTRAINT events_participant_capacity_check CHECK (((participant_capacity IS NULL) OR (participant_capacity > 0))),
    CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'completed'::text, 'cancelled'::text, 'archived'::text])))
);


--
-- Name: levels; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.levels (
    level integer NOT NULL,
    minimum_xp bigint NOT NULL,
    title character varying(100) NOT NULL,
    CONSTRAINT levels_level_check CHECK ((level >= 1)),
    CONSTRAINT levels_minimum_xp_check CHECK ((minimum_xp >= 0))
);


--
-- Name: match_suggestions; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.match_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    team_id uuid NOT NULL,
    candidate_user_id uuid NOT NULL,
    match_score numeric(5,2) NOT NULL,
    explanation text NOT NULL,
    algorithm_version text NOT NULL,
    status text DEFAULT 'suggested'::text NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT match_suggestions_check CHECK ((expires_at > generated_at)),
    CONSTRAINT match_suggestions_match_score_check CHECK (((match_score >= (0)::numeric) AND (match_score <= (100)::numeric))),
    CONSTRAINT match_suggestions_status_check CHECK ((status = ANY (ARRAY['suggested'::text, 'dismissed'::text, 'contacted'::text])))
);


--
-- Name: meeting_attendees; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.meeting_attendees (
    team_id uuid NOT NULL,
    meeting_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    response text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT meeting_attendees_response_check CHECK ((response = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'tentative'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(80) NOT NULL,
    title character varying(200) NOT NULL,
    body text,
    target_path text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organization_members; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.organization_members (
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'reviewer'::text])))
);


--
-- Name: organizations; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    slug character varying(160) NOT NULL,
    description text,
    website_url text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizer_verification_requests; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.organizer_verification_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    applicant_id uuid NOT NULL,
    evidence_storage_key text,
    applicant_notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    review_notes text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organizer_verification_requests_check CHECK ((((status = 'pending'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL)) OR ((status <> 'pending'::text) AND (reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL)))),
    CONSTRAINT organizer_verification_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'revoked'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.profiles (
    user_id uuid NOT NULL,
    bio text,
    avatar_url text,
    institution character varying(200),
    location character varying(200),
    timezone character varying(100) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    github_url text,
    portfolio_url text,
    linkedin_url text,
    visibility text DEFAULT 'members'::text NOT NULL,
    looking_for_team boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'members'::text, 'public'::text])))
);


--
-- Name: skills; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.skills (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(100),
    CONSTRAINT skills_name_check CHECK ((length(btrim((name)::text)) > 0))
);


--
-- Name: skills_id_seq; Type: SEQUENCE; Schema: hackloop; Owner: -
--

ALTER TABLE hackloop.skills ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME hackloop.skills_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: team_meetings; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.team_meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    created_by_membership_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    meeting_url text,
    location text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_meetings_check CHECK ((ends_at > starts_at)),
    CONSTRAINT team_meetings_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: team_members; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    event_role_id uuid,
    membership_role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    left_at timestamp with time zone,
    CONSTRAINT team_members_check CHECK (((left_at IS NULL) OR (left_at >= joined_at))),
    CONSTRAINT team_members_membership_role_check CHECK ((membership_role = ANY (ARRAY['captain'::text, 'member'::text])))
);


--
-- Name: team_messages; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.team_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    sender_membership_id uuid NOT NULL,
    body text NOT NULL,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_messages_body_check CHECK (((length(btrim(body)) >= 1) AND (length(btrim(body)) <= 10000)))
);


--
-- Name: team_requests; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.team_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    initiated_by uuid NOT NULL,
    request_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    message text,
    expires_at timestamp with time zone NOT NULL,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_requests_check CHECK ((expires_at > created_at)),
    CONSTRAINT team_requests_request_type_check CHECK ((request_type = ANY (ARRAY['invitation'::text, 'join_request'::text]))),
    CONSTRAINT team_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'cancelled'::text, 'expired'::text])))
);


--
-- Name: teams; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    status text DEFAULT 'forming'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT teams_status_check CHECK ((status = ANY (ARRAY['forming'::text, 'confirmed'::text, 'disbanded'::text])))
);


--
-- Name: user_achievements; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.user_achievements (
    user_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    outcome_id uuid NOT NULL,
    awarded_by uuid NOT NULL,
    awarded_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    display_name character varying(100) NOT NULL,
    password_hash text,
    email_verified_at timestamp with time zone,
    account_status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_account_status_check CHECK ((account_status = ANY (ARRAY['active'::text, 'suspended'::text, 'deleted'::text]))),
    CONSTRAINT users_display_name_check CHECK ((length(btrim((display_name)::text)) > 0)),
    CONSTRAINT users_email_check CHECK ((email = btrim(email))),
    CONSTRAINT users_email_check1 CHECK (((length(email) >= 3) AND (length(email) <= 254)))
);


--
-- Name: xp_ledger; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.xp_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    outcome_id uuid NOT NULL,
    rule_id uuid NOT NULL,
    entry_type text NOT NULL,
    points integer NOT NULL,
    reversal_of uuid,
    reason text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT xp_ledger_check CHECK ((((entry_type = 'award'::text) AND (points > 0) AND (reversal_of IS NULL)) OR ((entry_type = 'reversal'::text) AND (points < 0) AND (reversal_of IS NOT NULL)))),
    CONSTRAINT xp_ledger_entry_type_check CHECK ((entry_type = ANY (ARRAY['award'::text, 'reversal'::text])))
);


--
-- Name: user_xp_totals; Type: VIEW; Schema: hackloop; Owner: -
--

CREATE VIEW hackloop.user_xp_totals AS
 SELECT u.id AS user_id,
    COALESCE(sum(x.points), (0)::bigint) AS total_xp
   FROM (hackloop.users u
     LEFT JOIN hackloop.xp_ledger x ON ((x.user_id = u.id)))
  GROUP BY u.id;


--
-- Name: user_progress; Type: VIEW; Schema: hackloop; Owner: -
--

CREATE VIEW hackloop.user_progress AS
 SELECT totals.user_id,
    totals.total_xp,
    current_level.level,
    current_level.title AS level_title
   FROM (hackloop.user_xp_totals totals
     LEFT JOIN LATERAL ( SELECT levels.level,
            levels.title
           FROM hackloop.levels
          WHERE (levels.minimum_xp <= totals.total_xp)
          ORDER BY levels.minimum_xp DESC
         LIMIT 1) current_level ON (true));


--
-- Name: user_roles; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.user_roles (
    user_id uuid NOT NULL,
    role text NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['participant'::text, 'organizer'::text, 'admin'::text])))
);


--
-- Name: user_skills; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.user_skills (
    user_id uuid NOT NULL,
    skill_id bigint NOT NULL,
    proficiency smallint NOT NULL,
    evidence_url text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_skills_proficiency_check CHECK (((proficiency >= 1) AND (proficiency <= 5)))
);


--
-- Name: xp_rules; Type: TABLE; Schema: hackloop; Owner: -
--

CREATE TABLE hackloop.xp_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(80) NOT NULL,
    version integer NOT NULL,
    description text NOT NULL,
    points integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT xp_rules_points_check CHECK ((points > 0)),
    CONSTRAINT xp_rules_version_check CHECK ((version >= 1))
);


--
-- Name: achievements achievements_code_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.achievements
    ADD CONSTRAINT achievements_code_key UNIQUE (code);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: assessment_answers assessment_answers_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_answers
    ADD CONSTRAINT assessment_answers_pkey PRIMARY KEY (submission_id, question_id);


--
-- Name: assessment_evaluations assessment_evaluations_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_evaluations
    ADD CONSTRAINT assessment_evaluations_pkey PRIMARY KEY (id);


--
-- Name: assessment_questions assessment_questions_assessment_id_id_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_questions
    ADD CONSTRAINT assessment_questions_assessment_id_id_key UNIQUE (assessment_id, id);


--
-- Name: assessment_questions assessment_questions_assessment_id_position_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_questions
    ADD CONSTRAINT assessment_questions_assessment_id_position_key UNIQUE (assessment_id, "position");


--
-- Name: assessment_questions assessment_questions_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_questions
    ADD CONSTRAINT assessment_questions_pkey PRIMARY KEY (id);


--
-- Name: assessment_submissions assessment_submissions_assessment_id_id_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_submissions
    ADD CONSTRAINT assessment_submissions_assessment_id_id_key UNIQUE (assessment_id, id);


--
-- Name: assessment_submissions assessment_submissions_assessment_id_user_id_attempt_number_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_submissions
    ADD CONSTRAINT assessment_submissions_assessment_id_user_id_attempt_number_key UNIQUE (assessment_id, user_id, attempt_number);


--
-- Name: assessment_submissions assessment_submissions_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_submissions
    ADD CONSTRAINT assessment_submissions_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_event_id_id_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessments
    ADD CONSTRAINT assessments_event_id_id_key UNIQUE (event_id, id);


--
-- Name: assessments assessments_event_id_version_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessments
    ADD CONSTRAINT assessments_event_id_version_key UNIQUE (event_id, version);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_identities auth_identities_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.auth_identities
    ADD CONSTRAINT auth_identities_pkey PRIMARY KEY (id);


--
-- Name: auth_identities auth_identities_provider_provider_subject_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.auth_identities
    ADD CONSTRAINT auth_identities_provider_provider_subject_key UNIQUE (provider, provider_subject);


--
-- Name: auth_tokens auth_tokens_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.auth_tokens
    ADD CONSTRAINT auth_tokens_pkey PRIMARY KEY (id);


--
-- Name: auth_tokens auth_tokens_token_hash_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.auth_tokens
    ADD CONSTRAINT auth_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: evaluation_skill_scores evaluation_skill_scores_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.evaluation_skill_scores
    ADD CONSTRAINT evaluation_skill_scores_pkey PRIMARY KEY (evaluation_id, skill_id);


--
-- Name: event_outcomes event_outcomes_event_id_user_id_outcome_type_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_outcomes
    ADD CONSTRAINT event_outcomes_event_id_user_id_outcome_type_key UNIQUE (event_id, user_id, outcome_type);


--
-- Name: event_outcomes event_outcomes_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_outcomes
    ADD CONSTRAINT event_outcomes_pkey PRIMARY KEY (id);


--
-- Name: event_outcomes event_outcomes_user_id_id_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_outcomes
    ADD CONSTRAINT event_outcomes_user_id_id_key UNIQUE (user_id, id);


--
-- Name: event_registrations event_registrations_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (event_id, user_id);


--
-- Name: event_role_skills event_role_skills_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_role_skills
    ADD CONSTRAINT event_role_skills_pkey PRIMARY KEY (event_role_id, skill_id);


--
-- Name: event_roles event_roles_event_id_id_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_roles
    ADD CONSTRAINT event_roles_event_id_id_key UNIQUE (event_id, id);


--
-- Name: event_roles event_roles_event_id_name_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_roles
    ADD CONSTRAINT event_roles_event_id_name_key UNIQUE (event_id, name);


--
-- Name: event_roles event_roles_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_roles
    ADD CONSTRAINT event_roles_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: events events_slug_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.events
    ADD CONSTRAINT events_slug_key UNIQUE (slug);


--
-- Name: levels levels_minimum_xp_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.levels
    ADD CONSTRAINT levels_minimum_xp_key UNIQUE (minimum_xp);


--
-- Name: levels levels_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.levels
    ADD CONSTRAINT levels_pkey PRIMARY KEY (level);


--
-- Name: match_suggestions match_suggestions_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.match_suggestions
    ADD CONSTRAINT match_suggestions_pkey PRIMARY KEY (id);


--
-- Name: meeting_attendees meeting_attendees_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.meeting_attendees
    ADD CONSTRAINT meeting_attendees_pkey PRIMARY KEY (meeting_id, membership_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (organization_id, user_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: organizer_verification_requests organizer_verification_requests_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.organizer_verification_requests
    ADD CONSTRAINT organizer_verification_requests_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: team_meetings team_meetings_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_meetings
    ADD CONSTRAINT team_meetings_pkey PRIMARY KEY (id);


--
-- Name: team_meetings team_meetings_team_id_id_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_meetings
    ADD CONSTRAINT team_meetings_team_id_id_key UNIQUE (team_id, id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_id_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_members
    ADD CONSTRAINT team_members_team_id_id_key UNIQUE (team_id, id);


--
-- Name: team_messages team_messages_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_messages
    ADD CONSTRAINT team_messages_pkey PRIMARY KEY (id);


--
-- Name: team_requests team_requests_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_requests
    ADD CONSTRAINT team_requests_pkey PRIMARY KEY (id);


--
-- Name: teams teams_event_id_id_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.teams
    ADD CONSTRAINT teams_event_id_id_key UNIQUE (event_id, id);


--
-- Name: teams teams_event_id_name_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.teams
    ADD CONSTRAINT teams_event_id_name_key UNIQUE (event_id, name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, achievement_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role);


--
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (user_id, skill_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: xp_ledger xp_ledger_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.xp_ledger
    ADD CONSTRAINT xp_ledger_pkey PRIMARY KEY (id);


--
-- Name: xp_ledger xp_ledger_user_id_id_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.xp_ledger
    ADD CONSTRAINT xp_ledger_user_id_id_key UNIQUE (user_id, id);


--
-- Name: xp_rules xp_rules_code_version_key; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.xp_rules
    ADD CONSTRAINT xp_rules_code_version_key UNIQUE (code, version);


--
-- Name: xp_rules xp_rules_pkey; Type: CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.xp_rules
    ADD CONSTRAINT xp_rules_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_actor_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX audit_logs_actor_idx ON hackloop.audit_logs USING btree (actor_user_id, created_at DESC);


--
-- Name: audit_logs_entity_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX audit_logs_entity_idx ON hackloop.audit_logs USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: auth_identities_user_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX auth_identities_user_idx ON hackloop.auth_identities USING btree (user_id);


--
-- Name: auth_tokens_expiry_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX auth_tokens_expiry_idx ON hackloop.auth_tokens USING btree (expires_at);


--
-- Name: auth_tokens_user_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX auth_tokens_user_idx ON hackloop.auth_tokens USING btree (user_id, purpose);


--
-- Name: evaluations_submission_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX evaluations_submission_idx ON hackloop.assessment_evaluations USING btree (submission_id, created_at DESC);


--
-- Name: events_discovery_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX events_discovery_idx ON hackloop.events USING btree (status, category, starts_at);


--
-- Name: events_organization_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX events_organization_idx ON hackloop.events USING btree (organization_id);


--
-- Name: match_suggestions_team_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX match_suggestions_team_idx ON hackloop.match_suggestions USING btree (team_id, generated_at DESC);


--
-- Name: notifications_inbox_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX notifications_inbox_idx ON hackloop.notifications USING btree (user_id, created_at DESC);


--
-- Name: notifications_unread_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX notifications_unread_idx ON hackloop.notifications USING btree (user_id, created_at DESC) WHERE (read_at IS NULL);


--
-- Name: one_active_captain_per_team; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE UNIQUE INDEX one_active_captain_per_team ON hackloop.team_members USING btree (team_id) WHERE ((left_at IS NULL) AND (membership_role = 'captain'::text));


--
-- Name: one_active_team_per_event; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE UNIQUE INDEX one_active_team_per_event ON hackloop.team_members USING btree (event_id, user_id) WHERE (left_at IS NULL);


--
-- Name: one_pending_team_request; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE UNIQUE INDEX one_pending_team_request ON hackloop.team_requests USING btree (team_id, user_id) WHERE (status = 'pending'::text);


--
-- Name: one_reversal_per_xp_entry; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE UNIQUE INDEX one_reversal_per_xp_entry ON hackloop.xp_ledger USING btree (reversal_of) WHERE (reversal_of IS NOT NULL);


--
-- Name: one_xp_award_per_rule_outcome; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE UNIQUE INDEX one_xp_award_per_rule_outcome ON hackloop.xp_ledger USING btree (outcome_id, rule_id) WHERE (entry_type = 'award'::text);


--
-- Name: organization_active_verification_unique; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE UNIQUE INDEX organization_active_verification_unique ON hackloop.organizer_verification_requests USING btree (organization_id) WHERE (status = ANY (ARRAY['pending'::text, 'approved'::text]));


--
-- Name: organization_members_user_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX organization_members_user_idx ON hackloop.organization_members USING btree (user_id);


--
-- Name: registrations_user_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX registrations_user_idx ON hackloop.event_registrations USING btree (user_id, status);


--
-- Name: skills_name_unique; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE UNIQUE INDEX skills_name_unique ON hackloop.skills USING btree (lower((name)::text));


--
-- Name: submissions_user_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX submissions_user_idx ON hackloop.assessment_submissions USING btree (user_id, event_id);


--
-- Name: team_meetings_schedule_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX team_meetings_schedule_idx ON hackloop.team_meetings USING btree (team_id, starts_at);


--
-- Name: team_members_team_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX team_members_team_idx ON hackloop.team_members USING btree (team_id, left_at);


--
-- Name: team_members_user_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX team_members_user_idx ON hackloop.team_members USING btree (user_id);


--
-- Name: team_messages_timeline_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX team_messages_timeline_idx ON hackloop.team_messages USING btree (team_id, created_at, id);


--
-- Name: team_requests_user_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX team_requests_user_idx ON hackloop.team_requests USING btree (user_id, status);


--
-- Name: user_skills_skill_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX user_skills_skill_idx ON hackloop.user_skills USING btree (skill_id, proficiency);


--
-- Name: users_email_unique; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE UNIQUE INDEX users_email_unique ON hackloop.users USING btree (lower(email));


--
-- Name: xp_ledger_user_idx; Type: INDEX; Schema: hackloop; Owner: -
--

CREATE INDEX xp_ledger_user_idx ON hackloop.xp_ledger USING btree (user_id, created_at DESC);


--
-- Name: assessment_answers set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.assessment_answers FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: assessment_submissions set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.assessment_submissions FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: event_outcomes set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.event_outcomes FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: event_registrations set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.event_registrations FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: events set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.events FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: organizations set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.organizations FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: organizer_verification_requests set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.organizer_verification_requests FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: profiles set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.profiles FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: team_meetings set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.team_meetings FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: teams set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.teams FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: users set_updated_at; Type: TRIGGER; Schema: hackloop; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hackloop.users FOR EACH ROW EXECUTE FUNCTION hackloop.set_updated_at();


--
-- Name: assessment_answers assessment_answers_assessment_id_question_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_answers
    ADD CONSTRAINT assessment_answers_assessment_id_question_id_fkey FOREIGN KEY (assessment_id, question_id) REFERENCES hackloop.assessment_questions(assessment_id, id);


--
-- Name: assessment_answers assessment_answers_assessment_id_submission_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_answers
    ADD CONSTRAINT assessment_answers_assessment_id_submission_id_fkey FOREIGN KEY (assessment_id, submission_id) REFERENCES hackloop.assessment_submissions(assessment_id, id) ON DELETE CASCADE;


--
-- Name: assessment_evaluations assessment_evaluations_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_evaluations
    ADD CONSTRAINT assessment_evaluations_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES hackloop.users(id);


--
-- Name: assessment_evaluations assessment_evaluations_submission_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_evaluations
    ADD CONSTRAINT assessment_evaluations_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES hackloop.assessment_submissions(id);


--
-- Name: assessment_questions assessment_questions_assessment_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_questions
    ADD CONSTRAINT assessment_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES hackloop.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_submissions assessment_submissions_event_id_assessment_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_submissions
    ADD CONSTRAINT assessment_submissions_event_id_assessment_id_fkey FOREIGN KEY (event_id, assessment_id) REFERENCES hackloop.assessments(event_id, id);


--
-- Name: assessment_submissions assessment_submissions_event_id_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessment_submissions
    ADD CONSTRAINT assessment_submissions_event_id_user_id_fkey FOREIGN KEY (event_id, user_id) REFERENCES hackloop.event_registrations(event_id, user_id);


--
-- Name: assessments assessments_created_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessments
    ADD CONSTRAINT assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES hackloop.users(id);


--
-- Name: assessments assessments_event_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.assessments
    ADD CONSTRAINT assessments_event_id_fkey FOREIGN KEY (event_id) REFERENCES hackloop.events(id);


--
-- Name: audit_logs audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES hackloop.users(id);


--
-- Name: auth_identities auth_identities_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.auth_identities
    ADD CONSTRAINT auth_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES hackloop.users(id) ON DELETE CASCADE;


--
-- Name: auth_tokens auth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.auth_tokens
    ADD CONSTRAINT auth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES hackloop.users(id) ON DELETE CASCADE;


--
-- Name: evaluation_skill_scores evaluation_skill_scores_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.evaluation_skill_scores
    ADD CONSTRAINT evaluation_skill_scores_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES hackloop.assessment_evaluations(id) ON DELETE CASCADE;


--
-- Name: evaluation_skill_scores evaluation_skill_scores_skill_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.evaluation_skill_scores
    ADD CONSTRAINT evaluation_skill_scores_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES hackloop.skills(id);


--
-- Name: event_outcomes event_outcomes_event_id_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_outcomes
    ADD CONSTRAINT event_outcomes_event_id_user_id_fkey FOREIGN KEY (event_id, user_id) REFERENCES hackloop.event_registrations(event_id, user_id);


--
-- Name: event_outcomes event_outcomes_recorded_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_outcomes
    ADD CONSTRAINT event_outcomes_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES hackloop.users(id);


--
-- Name: event_outcomes event_outcomes_verified_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_outcomes
    ADD CONSTRAINT event_outcomes_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES hackloop.users(id);


--
-- Name: event_registrations event_registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_registrations
    ADD CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES hackloop.events(id);


--
-- Name: event_registrations event_registrations_event_id_preferred_role_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_registrations
    ADD CONSTRAINT event_registrations_event_id_preferred_role_id_fkey FOREIGN KEY (event_id, preferred_role_id) REFERENCES hackloop.event_roles(event_id, id);


--
-- Name: event_registrations event_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES hackloop.users(id);


--
-- Name: event_role_skills event_role_skills_event_role_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_role_skills
    ADD CONSTRAINT event_role_skills_event_role_id_fkey FOREIGN KEY (event_role_id) REFERENCES hackloop.event_roles(id) ON DELETE CASCADE;


--
-- Name: event_role_skills event_role_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_role_skills
    ADD CONSTRAINT event_role_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES hackloop.skills(id);


--
-- Name: event_roles event_roles_event_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.event_roles
    ADD CONSTRAINT event_roles_event_id_fkey FOREIGN KEY (event_id) REFERENCES hackloop.events(id) ON DELETE CASCADE;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES hackloop.users(id);


--
-- Name: events events_organization_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.events
    ADD CONSTRAINT events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES hackloop.organizations(id);


--
-- Name: match_suggestions match_suggestions_event_id_candidate_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.match_suggestions
    ADD CONSTRAINT match_suggestions_event_id_candidate_user_id_fkey FOREIGN KEY (event_id, candidate_user_id) REFERENCES hackloop.event_registrations(event_id, user_id);


--
-- Name: match_suggestions match_suggestions_event_id_team_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.match_suggestions
    ADD CONSTRAINT match_suggestions_event_id_team_id_fkey FOREIGN KEY (event_id, team_id) REFERENCES hackloop.teams(event_id, id);


--
-- Name: meeting_attendees meeting_attendees_team_id_meeting_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.meeting_attendees
    ADD CONSTRAINT meeting_attendees_team_id_meeting_id_fkey FOREIGN KEY (team_id, meeting_id) REFERENCES hackloop.team_meetings(team_id, id) ON DELETE CASCADE;


--
-- Name: meeting_attendees meeting_attendees_team_id_membership_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.meeting_attendees
    ADD CONSTRAINT meeting_attendees_team_id_membership_id_fkey FOREIGN KEY (team_id, membership_id) REFERENCES hackloop.team_members(team_id, id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES hackloop.users(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES hackloop.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES hackloop.users(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_created_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.organizations
    ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES hackloop.users(id);


--
-- Name: organizer_verification_requests organizer_verification_requests_applicant_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.organizer_verification_requests
    ADD CONSTRAINT organizer_verification_requests_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES hackloop.users(id);


--
-- Name: organizer_verification_requests organizer_verification_requests_organization_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.organizer_verification_requests
    ADD CONSTRAINT organizer_verification_requests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES hackloop.organizations(id);


--
-- Name: organizer_verification_requests organizer_verification_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.organizer_verification_requests
    ADD CONSTRAINT organizer_verification_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES hackloop.users(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES hackloop.users(id) ON DELETE CASCADE;


--
-- Name: team_meetings team_meetings_team_id_created_by_membership_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_meetings
    ADD CONSTRAINT team_meetings_team_id_created_by_membership_id_fkey FOREIGN KEY (team_id, created_by_membership_id) REFERENCES hackloop.team_members(team_id, id);


--
-- Name: team_meetings team_meetings_team_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_meetings
    ADD CONSTRAINT team_meetings_team_id_fkey FOREIGN KEY (team_id) REFERENCES hackloop.teams(id);


--
-- Name: team_members team_members_event_id_event_role_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_members
    ADD CONSTRAINT team_members_event_id_event_role_id_fkey FOREIGN KEY (event_id, event_role_id) REFERENCES hackloop.event_roles(event_id, id);


--
-- Name: team_members team_members_event_id_team_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_members
    ADD CONSTRAINT team_members_event_id_team_id_fkey FOREIGN KEY (event_id, team_id) REFERENCES hackloop.teams(event_id, id);


--
-- Name: team_members team_members_event_id_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_members
    ADD CONSTRAINT team_members_event_id_user_id_fkey FOREIGN KEY (event_id, user_id) REFERENCES hackloop.event_registrations(event_id, user_id);


--
-- Name: team_messages team_messages_team_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_messages
    ADD CONSTRAINT team_messages_team_id_fkey FOREIGN KEY (team_id) REFERENCES hackloop.teams(id);


--
-- Name: team_messages team_messages_team_id_sender_membership_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_messages
    ADD CONSTRAINT team_messages_team_id_sender_membership_id_fkey FOREIGN KEY (team_id, sender_membership_id) REFERENCES hackloop.team_members(team_id, id);


--
-- Name: team_requests team_requests_event_id_team_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_requests
    ADD CONSTRAINT team_requests_event_id_team_id_fkey FOREIGN KEY (event_id, team_id) REFERENCES hackloop.teams(event_id, id);


--
-- Name: team_requests team_requests_event_id_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_requests
    ADD CONSTRAINT team_requests_event_id_user_id_fkey FOREIGN KEY (event_id, user_id) REFERENCES hackloop.event_registrations(event_id, user_id);


--
-- Name: team_requests team_requests_initiated_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.team_requests
    ADD CONSTRAINT team_requests_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES hackloop.users(id);


--
-- Name: teams teams_created_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.teams
    ADD CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES hackloop.users(id);


--
-- Name: teams teams_event_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.teams
    ADD CONSTRAINT teams_event_id_fkey FOREIGN KEY (event_id) REFERENCES hackloop.events(id);


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES hackloop.achievements(id);


--
-- Name: user_achievements user_achievements_awarded_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_achievements
    ADD CONSTRAINT user_achievements_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES hackloop.users(id);


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES hackloop.users(id);


--
-- Name: user_achievements user_achievements_user_id_outcome_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_achievements
    ADD CONSTRAINT user_achievements_user_id_outcome_id_fkey FOREIGN KEY (user_id, outcome_id) REFERENCES hackloop.event_outcomes(user_id, id);


--
-- Name: user_roles user_roles_granted_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_roles
    ADD CONSTRAINT user_roles_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES hackloop.users(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES hackloop.users(id) ON DELETE CASCADE;


--
-- Name: user_skills user_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_skills
    ADD CONSTRAINT user_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES hackloop.skills(id);


--
-- Name: user_skills user_skills_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.user_skills
    ADD CONSTRAINT user_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES hackloop.users(id) ON DELETE CASCADE;


--
-- Name: xp_ledger xp_ledger_created_by_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.xp_ledger
    ADD CONSTRAINT xp_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES hackloop.users(id);


--
-- Name: xp_ledger xp_ledger_rule_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.xp_ledger
    ADD CONSTRAINT xp_ledger_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES hackloop.xp_rules(id);


--
-- Name: xp_ledger xp_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.xp_ledger
    ADD CONSTRAINT xp_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES hackloop.users(id);


--
-- Name: xp_ledger xp_ledger_user_id_outcome_id_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.xp_ledger
    ADD CONSTRAINT xp_ledger_user_id_outcome_id_fkey FOREIGN KEY (user_id, outcome_id) REFERENCES hackloop.event_outcomes(user_id, id);


--
-- Name: xp_ledger xp_ledger_user_id_reversal_of_fkey; Type: FK CONSTRAINT; Schema: hackloop; Owner: -
--

ALTER TABLE ONLY hackloop.xp_ledger
    ADD CONSTRAINT xp_ledger_user_id_reversal_of_fkey FOREIGN KEY (user_id, reversal_of) REFERENCES hackloop.xp_ledger(user_id, id);


--
-- PostgreSQL database dump complete
--

\unrestrict smrtCectae4064ZPRm4oOOLw6PxiIxMUhWOKOnxiYKPRKJA1wybkAr1wOqWGLdd
