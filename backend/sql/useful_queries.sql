-- ============================================================================
-- TEAMWEAVE USEFUL QUERIES
-- Database: PostgreSQL 14+
-- Schema: hackloop
-- Description: 14 tested, parameterized queries using PostgreSQL placeholders ($1, $2, ...)
-- ============================================================================

SET search_path TO hackloop, public;

-- ----------------------------------------------------------------------------
-- 1. Find published events with pagination
-- Params: $1 = Category ID (or NULL for all), $2 = Limit, $3 = Offset
-- ----------------------------------------------------------------------------
SELECT 
    e.id,
    e.title,
    e.slug,
    e.category_id,
    c.name AS category_name,
    c.color AS category_color,
    e.mode,
    e.location,
    e.min_team_size,
    e.max_team_size,
    e.start_date,
    e.end_date,
    e.registration_deadline,
    e.max_participants,
    COUNT(r.id) FILTER (WHERE r.status = 'registered') AS registered_count,
    e.status
FROM hackloop.events e
JOIN hackloop.event_categories c ON c.id = e.category_id
LEFT JOIN hackloop.event_registrations r ON r.event_id = e.id
WHERE e.status = 'open'
  AND ($1::text IS NULL OR e.category_id = $1::text)
GROUP BY e.id, c.name, c.color
ORDER BY e.start_date ASC
LIMIT COALESCE($2, 20) OFFSET COALESCE($3, 0);


-- ----------------------------------------------------------------------------
-- 2. Find a user's profile and skills
-- Params: $1 = User UUID
-- ----------------------------------------------------------------------------
SELECT 
    u.id AS user_id,
    u.full_name,
    u.username,
    u.email,
    p.tagline,
    p.bio,
    p.timezone,
    p.hours_per_week,
    p.availability_constraints,
    p.preferred_roles,
    s.id AS skill_id,
    s.name AS skill_name,
    sc.name AS skill_category,
    us.proficiency,
    CASE us.proficiency
        WHEN 1 THEN 'Exploring'
        WHEN 2 THEN 'Developing'
        WHEN 3 THEN 'Independent'
        WHEN 4 THEN 'Advanced / Can mentor'
        ELSE 'Unknown'
    END AS proficiency_label,
    us.is_self_declared,
    us.evidence_count
FROM hackloop.users u
LEFT JOIN hackloop.profiles p ON p.user_id = u.id
LEFT JOIN hackloop.user_skills us ON us.user_id = u.id
LEFT JOIN hackloop.skills s ON s.id = us.skill_id
LEFT JOIN hackloop.skill_categories sc ON sc.id = s.category_id
WHERE u.id = $1
ORDER BY us.proficiency DESC, s.name ASC;


-- ----------------------------------------------------------------------------
-- 3. List event registrations
-- Params: $1 = Event UUID
-- ----------------------------------------------------------------------------
SELECT 
    r.id AS registration_id,
    r.event_id,
    u.id AS user_id,
    u.full_name,
    u.username,
    u.email,
    r.status AS registration_status,
    r.preferred_roles,
    r.registered_at,
    r.withdrawn_at
FROM hackloop.event_registrations r
JOIN hackloop.users u ON u.id = r.user_id
WHERE r.event_id = $1
ORDER BY r.registered_at ASC;


-- ----------------------------------------------------------------------------
-- 4. Find active team members
-- Params: $1 = Team UUID
-- ----------------------------------------------------------------------------
SELECT 
    tm.id AS membership_id,
    tm.team_id,
    t.name AS team_name,
    u.id AS user_id,
    u.full_name,
    u.username,
    tm.role,
    tm.status,
    tm.joined_at,
    p.timezone,
    p.hours_per_week
FROM hackloop.team_memberships tm
JOIN hackloop.teams t ON t.id = tm.team_id
JOIN hackloop.users u ON u.id = tm.user_id
LEFT JOIN hackloop.profiles p ON p.user_id = u.id
WHERE tm.team_id = $1
  AND tm.status = 'active'
ORDER BY tm.joined_at ASC;


-- ----------------------------------------------------------------------------
-- 5. Calculate a team's skill coverage
-- Params: $1 = Team UUID
-- Evaluates which event requirements are covered by at least one active team member
-- ----------------------------------------------------------------------------
SELECT 
    er.id AS requirement_id,
    er.skill_name AS required_skill,
    er.category AS skill_category,
    er.required,
    er.min_proficiency,
    CASE er.min_proficiency
        WHEN 1 THEN 'Exploring'
        WHEN 2 THEN 'Developing'
        WHEN 3 THEN 'Independent'
        WHEN 4 THEN 'Advanced / Can mentor'
    END AS required_proficiency_label,
    MAX(us.proficiency) AS team_max_proficiency,
    BOOL_OR(us.proficiency >= er.min_proficiency) AS is_satisfied,
    STRING_AGG(DISTINCT u.full_name, ', ') FILTER (WHERE us.proficiency >= er.min_proficiency) AS covered_by_members
FROM hackloop.teams t
JOIN hackloop.events e ON e.id = t.event_id
JOIN hackloop.event_requirements er ON er.event_id = e.id
LEFT JOIN hackloop.team_memberships tm ON tm.team_id = t.id AND tm.status = 'active'
LEFT JOIN hackloop.user_skills us ON us.user_id = tm.user_id
LEFT JOIN hackloop.skills s ON s.id = us.skill_id 
    AND (LOWER(s.name) = LOWER(er.skill_name) OR LOWER(er.skill_name) LIKE '%' || LOWER(s.name) || '%')
LEFT JOIN hackloop.users u ON u.id = tm.user_id
WHERE t.id = $1
GROUP BY er.id, er.skill_name, er.category, er.required, er.min_proficiency
ORDER BY er.required DESC, er.priority ASC;


-- ----------------------------------------------------------------------------
-- 6. Find required skills that no active member currently covers (Gaps)
-- Params: $1 = Team UUID
-- ----------------------------------------------------------------------------
WITH team_skill_coverage AS (
    SELECT 
        er.id AS requirement_id,
        er.skill_name,
        er.category,
        er.required,
        er.min_proficiency,
        BOOL_OR(us.proficiency >= er.min_proficiency) AS is_covered
    FROM hackloop.teams t
    JOIN hackloop.events e ON e.id = t.event_id
    JOIN hackloop.event_requirements er ON er.event_id = e.id
    LEFT JOIN hackloop.team_memberships tm ON tm.team_id = t.id AND tm.status = 'active'
    LEFT JOIN hackloop.user_skills us ON us.user_id = tm.user_id
    LEFT JOIN hackloop.skills s ON s.id = us.skill_id 
        AND (LOWER(s.name) = LOWER(er.skill_name) OR LOWER(er.skill_name) LIKE '%' || LOWER(s.name) || '%')
    WHERE t.id = $1
    GROUP BY er.id, er.skill_name, er.category, er.required, er.min_proficiency
)
SELECT 
    requirement_id,
    skill_name,
    category,
    required,
    min_proficiency,
    CASE 
        WHEN required THEN 'CRITICAL GAP'
        ELSE 'Preferred Gap'
    END AS gap_severity
FROM team_skill_coverage
WHERE is_covered IS NOT TRUE
ORDER BY required DESC;


-- ----------------------------------------------------------------------------
-- 7. Calculate XP totals
-- Params: $1 = User UUID (or NULL for top leaderboard)
-- ----------------------------------------------------------------------------
SELECT 
    u.id AS user_id,
    u.full_name,
    u.username,
    COALESCE(SUM(x.amount), 0) AS total_xp,
    COUNT(x.id) AS total_actions
FROM hackloop.users u
LEFT JOIN hackloop.xp_ledger x ON x.user_id = u.id
WHERE ($1::uuid IS NULL OR u.id = $1)
GROUP BY u.id, u.full_name, u.username
ORDER BY total_xp DESC;


-- ----------------------------------------------------------------------------
-- 8. List unread notifications
-- Params: $1 = User UUID
-- ----------------------------------------------------------------------------
SELECT 
    id AS notification_id,
    type,
    title,
    content,
    link_url,
    created_at
FROM hackloop.notifications
WHERE user_id = $1
  AND is_read = FALSE
ORDER BY created_at DESC;


-- ----------------------------------------------------------------------------
-- 9. Retrieve matching-run history
-- Params: $1 = Event UUID
-- ----------------------------------------------------------------------------
SELECT 
    mr.id AS matching_run_id,
    mr.event_id,
    mr.algorithm_version,
    mr.status,
    u.full_name AS initiated_by_name,
    mr.summary,
    COUNT(pt.id) AS proposed_teams_count,
    mr.created_at,
    mr.completed_at
FROM hackloop.matching_runs mr
JOIN hackloop.users u ON u.id = mr.initiated_by
LEFT JOIN hackloop.proposed_teams pt ON pt.matching_run_id = mr.id
WHERE mr.event_id = $1
GROUP BY mr.id, u.full_name
ORDER BY mr.created_at DESC;


-- ----------------------------------------------------------------------------
-- 10. Find eligible replacement candidates
-- Params: $1 = Team UUID
-- Eligible = registered for the event, status='registered', and not in ANY active team for this event
-- ----------------------------------------------------------------------------
SELECT 
    u.id AS candidate_id,
    u.full_name,
    u.username,
    u.email,
    p.timezone,
    p.hours_per_week,
    er.preferred_roles,
    COUNT(us.id) AS skills_count,
    AVG(us.proficiency)::numeric(3, 2) AS avg_proficiency
FROM hackloop.teams t
JOIN hackloop.event_registrations er ON er.event_id = t.event_id AND er.status = 'registered'
JOIN hackloop.users u ON u.id = er.user_id
LEFT JOIN hackloop.profiles p ON p.user_id = u.id
LEFT JOIN hackloop.user_skills us ON us.user_id = u.id
WHERE t.id = $1
  -- Exclude participants who are currently active in ANY team for this event
  AND u.id NOT IN (
      SELECT tm.user_id 
      FROM hackloop.team_memberships tm
      JOIN hackloop.teams t2 ON t2.id = tm.team_id
      WHERE t2.event_id = t.event_id 
        AND tm.status = 'active'
  )
GROUP BY u.id, u.full_name, u.username, u.email, p.timezone, p.hours_per_week, er.preferred_roles
ORDER BY avg_proficiency DESC NULLS LAST;


-- ----------------------------------------------------------------------------
-- 11. Retrieve an assessment and its questions
-- Params: $1 = Assessment UUID
-- ----------------------------------------------------------------------------
SELECT 
    a.id AS assessment_id,
    a.title AS assessment_title,
    a.description,
    a.version,
    a.status,
    a.created_at,
    q.id AS question_id,
    q.order_index,
    q.question_text,
    q.question_type,
    q.skill_target,
    q.options
FROM hackloop.assessments a
LEFT JOIN hackloop.assessment_questions q ON q.assessment_id = a.id
WHERE a.id = $1
ORDER BY q.order_index ASC;


-- ----------------------------------------------------------------------------
-- 12. Find outstanding assessment submissions
-- Params: $1 = Event UUID
-- ----------------------------------------------------------------------------
SELECT 
    s.id AS submission_id,
    a.id AS assessment_id,
    a.title AS assessment_title,
    u.id AS user_id,
    u.full_name AS participant_name,
    u.email AS participant_email,
    s.status AS submission_status,
    s.submitted_at,
    COUNT(ans.id) AS answered_questions_count
FROM hackloop.assessment_submissions s
JOIN hackloop.assessments a ON a.id = s.assessment_id
JOIN hackloop.users u ON u.id = s.user_id
LEFT JOIN hackloop.assessment_answers ans ON ans.submission_id = s.id
WHERE a.event_id = $1
  AND s.status = 'submitted'
GROUP BY s.id, a.id, a.title, u.id, u.full_name, u.email, s.status, s.submitted_at
ORDER BY s.submitted_at ASC;


-- ----------------------------------------------------------------------------
-- 13. List organization members and their roles
-- Params: $1 = Organization UUID
-- ----------------------------------------------------------------------------
SELECT 
    o.id AS organization_id,
    o.name AS organization_name,
    u.id AS user_id,
    u.full_name,
    u.email,
    om.role AS organization_role,
    om.joined_at
FROM hackloop.organization_members om
JOIN hackloop.organizations o ON o.id = om.organization_id
JOIN hackloop.users u ON u.id = om.user_id
WHERE o.id = $1
ORDER BY CASE om.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END, om.joined_at ASC;


-- ----------------------------------------------------------------------------
-- 14. Review relevant audit records
-- Params: $1 = Entity Type (e.g. 'event', 'team'), $2 = Entity ID (or NULL for all)
-- ----------------------------------------------------------------------------
SELECT 
    al.id AS log_id,
    al.action,
    al.entity_type,
    al.entity_id,
    u.full_name AS actor_name,
    al.details,
    al.created_at
FROM hackloop.audit_logs al
LEFT JOIN hackloop.users u ON u.id = al.actor_id
WHERE ($1::text IS NULL OR al.entity_type = $1::text)
  AND ($2::text IS NULL OR al.entity_id = $2::text)
ORDER BY al.created_at DESC
LIMIT 50;
