-- ============================================================================
-- TEAMWEAVE DEMO SEED DATA
-- Schema: hackloop
-- Database: PostgreSQL 14+
-- Description: Deterministic, idempotent test data matching demoData.js
-- Default Password for all demo accounts: password123
-- ============================================================================

SET search_path TO hackloop, public;

-- ----------------------------------------------------------------------------
-- 1. Roles
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.roles (id, name, description)
VALUES 
    ('participant', 'Participant', 'Can register for events, form teams, and submit assessments'),
    ('organizer', 'Organizer', 'Can create and publish events, configure requirements, and approve teams'),
    ('admin', 'Administrator', 'Full platform administrative oversight and moderation')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- ----------------------------------------------------------------------------
-- 2. Skill Categories
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.skill_categories (id, name, description)
VALUES 
    ('Frontend', 'Frontend Development', 'Web and mobile user interface development'),
    ('Backend', 'Backend Development', 'Server-side systems, APIs, and databases'),
    ('Design', 'Product & Visual Design', 'User experience, wireframing, and branding'),
    ('Data', 'Data & Analytics', 'Database systems, pipelines, and quantitative visualization'),
    ('AI/ML', 'Artificial Intelligence & Machine Learning', 'Model development, NLP, and applied machine learning'),
    ('Research', 'Academic & Applied Research', 'Literature review, rigorous methodology, and academic writing'),
    ('Debate', 'Competitive Debate', 'Parliamentary debate, structured argumentation, and rebuttal'),
    ('Soft Skills', 'Communication & Leadership', 'Presentation, collaboration, and stakeholder communication'),
    ('Management', 'Project & Product Management', 'Agile execution, team coordination, and strategic roadmapping'),
    ('Creative', 'Creative Production', 'Narrative writing, digital media, and video production')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- ----------------------------------------------------------------------------
-- 3. Skills Library
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.skills (id, name, category_id, description, is_verified)
VALUES
    -- Technical
    ('s-react', 'React', 'Frontend', 'Modern component-based client architecture', TRUE),
    ('s-node', 'Node.js', 'Backend', 'Event-driven JavaScript runtime', TRUE),
    ('s-python', 'Python', 'Backend', 'General purpose scripting and backend language', TRUE),
    ('s-fastapi', 'FastAPI', 'Backend', 'Modern, high-performance async Python API framework', TRUE),
    ('s-go', 'Go', 'Backend', 'Compiled concurrent systems programming language', TRUE),
    ('s-sql', 'SQL', 'Data', 'Relational database query language', TRUE),
    ('s-postgres', 'PostgreSQL', 'Data', 'Advanced open-source relational object database', TRUE),
    ('s-docker', 'Docker', 'Backend', 'Containerization and environment reproducibility', TRUE),
    ('s-data-viz', 'Data Visualization', 'Data', 'Interactive charts, dashboards, and storytelling with numbers', TRUE),
    ('s-ml', 'Machine Learning', 'AI/ML', 'Predictive modeling, deep learning, and classification', TRUE),
    ('s-nlp', 'NLP', 'AI/ML', 'Natural language processing and sequence models', TRUE),
    ('s-pytorch', 'PyTorch', 'AI/ML', 'Deep learning framework for tensor computation', TRUE),
    -- Design
    ('s-ux', 'UX Design', 'Design', 'User journey mapping, wireframing, and usability heuristics', TRUE),
    ('s-figma', 'Figma', 'Design', 'Collaborative interface design tool', TRUE),
    ('s-branding', 'Branding', 'Design', 'Visual identity systems, typography, and brand guides', TRUE),
    ('s-illustrator', 'Illustrator', 'Design', 'Vector graphic illustration tool', TRUE),
    ('s-motion', 'Motion Design', 'Design', 'Dynamic UI transitions and animations', TRUE),
    -- Research & Debate
    ('s-research', 'Research & Analysis', 'Research', 'Systematic investigation, evidence gathering, and analysis', TRUE),
    ('s-writing', 'Academic Writing', 'Research', 'Formal manuscript drafting and peer-reviewed style', TRUE),
    ('s-argumentation', 'Argumentation', 'Debate', 'Structured claims, warrants, and evidence construction', TRUE),
    ('s-rebuttal', 'Rebuttal', 'Debate', 'Systematic refutation and point-by-point counter-arguments', TRUE),
    ('s-presentation', 'Presentation', 'Soft Skills', 'High-impact verbal delivery and pitch decks', TRUE),
    ('s-comms', 'Communication', 'Soft Skills', 'Cross-functional clarity and transparent team alignment', TRUE),
    -- Management & Creative
    ('s-pm', 'Project Management', 'Management', 'Agile delivery, milestone tracking, and task ownership', TRUE),
    ('s-strategy', 'Strategy', 'Management', 'Competitive positioning and roadmap definition', TRUE),
    ('s-storytelling', 'Storytelling', 'Creative', 'Compelling narrative craft across media', TRUE),
    ('s-video', 'Video Production', 'Creative', 'Video editing, pacing, and visual storytelling', TRUE)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    description = EXCLUDED.description;

-- ----------------------------------------------------------------------------
-- 4. Users (Demo Personas)
-- Hash for 'password123':
-- $argon2id$v=19$m=65536,t=2,p=2$6YqBT5cdTy1CkTGfgDRhRw$toJmDYPu6CvPngthxnZYJF0Iq7QjT/zhhEqOxLMfLPc
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.users (id, email, username, password_hash, full_name, is_active, is_verified)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'asel@teamweave.demo', 'aseln', '$argon2id$v=19$m=65536,t=2,p=2$6YqBT5cdTy1CkTGfgDRhRw$toJmDYPu6CvPngthxnZYJF0Iq7QjT/zhhEqOxLMfLPc', 'Asel Nurlanovna', TRUE, TRUE),
    ('a0000000-0000-0000-0000-000000000002', 'marcus@teamweave.demo', 'marcosei', '$argon2id$v=19$m=65536,t=2,p=2$6YqBT5cdTy1CkTGfgDRhRw$toJmDYPu6CvPngthxnZYJF0Iq7QjT/zhhEqOxLMfLPc', 'Marcus Osei', TRUE, TRUE),
    ('a0000000-0000-0000-0000-000000000003', 'yuna@teamweave.demo', 'ytanaka', '$argon2id$v=19$m=65536,t=2,p=2$6YqBT5cdTy1CkTGfgDRhRw$toJmDYPu6CvPngthxnZYJF0Iq7QjT/zhhEqOxLMfLPc', 'Yuna Tanaka', TRUE, TRUE),
    ('a0000000-0000-0000-0000-000000000004', 'devraj@teamweave.demo', 'dpillai', '$argon2id$v=19$m=65536,t=2,p=2$6YqBT5cdTy1CkTGfgDRhRw$toJmDYPu6CvPngthxnZYJF0Iq7QjT/zhhEqOxLMfLPc', 'Devraj Pillai', TRUE, TRUE),
    ('a0000000-0000-0000-0000-000000000005', 'fatima@teamweave.demo', 'falrashidi', '$argon2id$v=19$m=65536,t=2,p=2$6YqBT5cdTy1CkTGfgDRhRw$toJmDYPu6CvPngthxnZYJF0Iq7QjT/zhhEqOxLMfLPc', 'Fatima Al-Rashidi', TRUE, TRUE),
    ('a0000000-0000-0000-0000-000000000006', 'leo@teamweave.demo', 'lbrandao', '$argon2id$v=19$m=65536,t=2,p=2$6YqBT5cdTy1CkTGfgDRhRw$toJmDYPu6CvPngthxnZYJF0Iq7QjT/zhhEqOxLMfLPc', 'Leo Brandão', TRUE, TRUE),
    ('b0000000-0000-0000-0000-000000000001', 'organizer@teamweave.demo', 'citylab_org', '$argon2id$v=19$m=65536,t=2,p=2$6YqBT5cdTy1CkTGfgDRhRw$toJmDYPu6CvPngthxnZYJF0Iq7QjT/zhhEqOxLMfLPc', 'City Lab Initiative', TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000001', 'admin@teamweave.demo', 'admin', '$argon2id$v=19$m=65536,t=2,p=2$6YqBT5cdTy1CkTGfgDRhRw$toJmDYPu6CvPngthxnZYJF0Iq7QjT/zhhEqOxLMfLPc', 'TeamWeave Admin', TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name;

-- ----------------------------------------------------------------------------
-- 5. User Roles
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.user_roles (user_id, role_id)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'participant'),
    ('a0000000-0000-0000-0000-000000000002', 'participant'),
    ('a0000000-0000-0000-0000-000000000003', 'participant'),
    ('a0000000-0000-0000-0000-000000000004', 'participant'),
    ('a0000000-0000-0000-0000-000000000005', 'participant'),
    ('a0000000-0000-0000-0000-000000000006', 'participant'),
    ('b0000000-0000-0000-0000-000000000001', 'organizer'),
    ('c0000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Profiles
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.profiles (user_id, tagline, bio, timezone, hours_per_week, availability_constraints, preferred_roles, interests, github_url, portfolio_url, evidence_count)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Full-stack engineer with a love for clean APIs and crisp UIs.', 'I enjoy building products from scratch and collaborating across the stack.', 'UTC+6', 20, '[]'::jsonb, '["Frontend Lead", "Full-stack Engineer"]'::jsonb, '["AI/ML", "Developer tools", "Open source"]'::jsonb, 'https://github.com/aseln', NULL, 2),
    ('a0000000-0000-0000-0000-000000000002', 'Backend engineer and data enthusiast. I like systems that scale.', 'Five years building distributed services in Python and Go.', 'UTC+0', 15, '[]'::jsonb, '["Backend Lead", "Data Engineer"]'::jsonb, '["Distributed systems", "Data engineering"]'::jsonb, 'https://github.com/marcosei', 'https://marcosei.dev', 3),
    ('a0000000-0000-0000-0000-000000000003', 'Product designer with a systems mindset. I make complexity feel simple.', 'UX and visual design across web and mobile.', 'UTC+9', 18, '["weekends only"]'::jsonb, '["Lead Designer", "UX Researcher"]'::jsonb, '["Accessibility", "Design systems"]'::jsonb, NULL, 'https://yunatanaka.design', 1),
    ('a0000000-0000-0000-0000-000000000004', 'ML researcher and data scientist. Turning data into decisions.', 'PhD student in computational linguistics. NLP and applied ML.', 'UTC+5.5', 10, '["no weekends"]'::jsonb, '["AI/ML Lead", "Research Lead"]'::jsonb, '["NLP", "AI ethics"]'::jsonb, 'https://github.com/devrajp', NULL, 4),
    ('a0000000-0000-0000-0000-000000000005', 'Organizer, communicator, and project strategist. I keep teams aligned.', 'Business and communications background with strong project management.', 'UTC+3', 25, '[]'::jsonb, '["Team Lead", "Project Manager"]'::jsonb, '["Entrepreneurship", "Social impact"]'::jsonb, NULL, NULL, 0),
    ('a0000000-0000-0000-0000-000000000006', 'Creative director and visual storyteller. Design meets narrative.', 'Brand identities, motion graphics, and narrative digital media.', 'UTC-3', 12, '["freelance schedule"]'::jsonb, '["Creative Director", "Visual Designer"]'::jsonb, '["Brand strategy", "Typography"]'::jsonb, NULL, 'https://leobrand.co', 2)
ON CONFLICT (user_id) DO UPDATE SET 
    tagline = EXCLUDED.tagline,
    bio = EXCLUDED.bio,
    timezone = EXCLUDED.timezone,
    hours_per_week = EXCLUDED.hours_per_week,
    preferred_roles = EXCLUDED.preferred_roles;

-- ----------------------------------------------------------------------------
-- 7. User Skills
-- Proficiency: 1=Exploring, 2=Developing, 3=Independent, 4=Advanced
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.user_skills (user_id, skill_id, proficiency, is_self_declared, evidence_count)
VALUES
    -- Asel (p1)
    ('a0000000-0000-0000-0000-000000000001', 's-react', 3, FALSE, 2),
    ('a0000000-0000-0000-0000-000000000001', 's-node', 3, TRUE, 1),
    ('a0000000-0000-0000-0000-000000000001', 's-python', 2, TRUE, 0),
    ('a0000000-0000-0000-0000-000000000001', 's-figma', 1, TRUE, 0),
    ('a0000000-0000-0000-0000-000000000001', 's-sql', 2, TRUE, 0),
    -- Marcus (p2)
    ('a0000000-0000-0000-0000-000000000002', 's-python', 4, FALSE, 3),
    ('a0000000-0000-0000-0000-000000000002', 's-go', 3, TRUE, 1),
    ('a0000000-0000-0000-0000-000000000002', 's-postgres', 3, FALSE, 2),
    ('a0000000-0000-0000-0000-000000000002', 's-docker', 3, TRUE, 1),
    ('a0000000-0000-0000-0000-000000000002', 's-fastapi', 4, FALSE, 3),
    ('a0000000-0000-0000-0000-000000000002', 's-data-viz', 2, TRUE, 0),
    -- Yuna (p3)
    ('a0000000-0000-0000-0000-000000000003', 's-ux', 4, FALSE, 2),
    ('a0000000-0000-0000-0000-000000000003', 's-figma', 4, FALSE, 3),
    ('a0000000-0000-0000-0000-000000000003', 's-research', 3, TRUE, 1),
    ('a0000000-0000-0000-0000-000000000003', 's-motion', 2, TRUE, 0),
    -- Devraj (p4)
    ('a0000000-0000-0000-0000-000000000004', 's-ml', 4, FALSE, 4),
    ('a0000000-0000-0000-0000-000000000004', 's-python', 4, FALSE, 4),
    ('a0000000-0000-0000-0000-000000000004', 's-nlp', 4, FALSE, 3),
    ('a0000000-0000-0000-0000-000000000004', 's-pytorch', 3, TRUE, 2),
    ('a0000000-0000-0000-0000-000000000004', 's-research', 4, FALSE, 3),
    ('a0000000-0000-0000-0000-000000000004', 's-writing', 3, TRUE, 1),
    -- Fatima (p5)
    ('a0000000-0000-0000-0000-000000000005', 's-pm', 3, TRUE, 1),
    ('a0000000-0000-0000-0000-000000000005', 's-comms', 4, TRUE, 0),
    ('a0000000-0000-0000-0000-000000000005', 's-strategy', 3, TRUE, 0),
    ('a0000000-0000-0000-0000-000000000005', 's-presentation', 4, TRUE, 0),
    ('a0000000-0000-0000-0000-000000000005', 's-research', 2, TRUE, 0),
    -- Leo (p6)
    ('a0000000-0000-0000-0000-000000000006', 's-branding', 4, FALSE, 2),
    ('a0000000-0000-0000-0000-000000000006', 's-video', 3, TRUE, 1),
    ('a0000000-0000-0000-0000-000000000006', 's-illustrator', 4, FALSE, 2),
    ('a0000000-0000-0000-0000-000000000006', 's-storytelling', 4, TRUE, 1),
    ('a0000000-0000-0000-0000-000000000006', 's-motion', 3, TRUE, 0)
ON CONFLICT (user_id, skill_id) DO UPDATE SET 
    proficiency = EXCLUDED.proficiency,
    is_self_declared = EXCLUDED.is_self_declared,
    evidence_count = EXCLUDED.evidence_count;

-- ----------------------------------------------------------------------------
-- 8. Organizations
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.organizations (id, name, slug, description, is_verified)
VALUES
    ('90000000-0000-0000-0000-000000000001', 'City Lab Initiative', 'city-lab-initiative', 'Civic technology accelerator bridging universities and municipal infrastructure.', TRUE),
    ('90000000-0000-0000-0000-000000000002', 'Green Futures Lab', 'green-futures-lab', 'Climate data consortium focused on predictive geospatial analytics.', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO hackloop.organization_members (organization_id, user_id, role)
VALUES
    ('90000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'owner')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. Event Categories
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.event_categories (id, name, color, is_custom)
VALUES
    ('hackathon', 'Hackathon', 'cobalt', FALSE),
    ('debate', 'Debate', 'coral', FALSE),
    ('research', 'Research', 'teal', FALSE),
    ('creative', 'Creative', 'gold', FALSE),
    ('academic', 'Academic', 'violet', FALSE),
    ('startup', 'Startup', 'coral', FALSE),
    ('design-sprint', 'Design Sprint', 'gold', FALSE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color;

-- ----------------------------------------------------------------------------
-- 10. Events
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.events (id, title, slug, category_id, description, organizer_id, organization_id, mode, location, min_team_size, max_team_size, start_date, end_date, registration_deadline, max_participants, status, tags)
VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        'City Innovation Hackathon 2026',
        'city-innovation-hackathon-2026',
        'hackathon',
        'A 48-hour challenge to build civic technology solutions that address real urban problems in transportation, housing, accessibility, and sustainability. Open to multidisciplinary teams.',
        'b0000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000001',
        'hybrid',
        'Central Library, Block C + Online',
        3, 5,
        '2026-11-14 09:00:00+00',
        '2026-11-16 18:00:00+00',
        '2026-11-07 23:59:59+00',
        120,
        'open',
        '["civic tech", "sustainability", "open data"]'::jsonb
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'National Debate Championship — Regional Heat',
        'national-debate-championship-regional',
        'debate',
        'Regional qualifying round for the National University Debate Championship. British parliamentary format. Teams of four debate motions in social policy, economics, and international affairs.',
        'b0000000-0000-0000-0000-000000000001',
        NULL,
        'in-person',
        'University Main Hall',
        4, 4,
        '2026-11-22 09:00:00+00',
        '2026-11-22 20:00:00+00',
        '2026-11-15 23:59:59+00',
        64,
        'open',
        '["parliamentary", "policy", "university"]'::jsonb
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        'AI for Climate — Research Sprint',
        'ai-for-climate-research-sprint',
        'research',
        'An eight-week collaborative research project applying machine learning techniques to climate modelling datasets. Teams will produce a technical report and a working prototype.',
        'b0000000-0000-0000-0000-000000000001',
        '90000000-0000-0000-0000-000000000002',
        'remote',
        'Online',
        3, 4,
        '2026-12-01 10:00:00+00',
        '2027-01-25 18:00:00+00',
        '2026-11-24 23:59:59+00',
        40,
        'open',
        '["climate", "machine learning", "research"]'::jsonb
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        'Brand Sprint — Campus Media Co-op',
        'brand-sprint-campus-media-co-op',
        'creative',
        'A five-day creative sprint to rebrand the Campus Media Co-op. Teams will produce a brand identity system, a short launch video, and a digital campaign proposal.',
        'b0000000-0000-0000-0000-000000000001',
        NULL,
        'in-person',
        'Arts Building Studio 4',
        3, 4,
        '2026-11-28 09:00:00+00',
        '2026-12-03 18:00:00+00',
        '2026-11-21 23:59:59+00',
        20,
        'open',
        '["branding", "media", "video"]'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- 11. Event Requirements
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.event_requirements (id, event_id, skill_name, skill_id, category, required, min_proficiency, target_count, priority)
VALUES
    -- City Innovation Hackathon (ev1)
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Frontend Development', 's-react', 'Technical', TRUE, 2, 1, 1),
    ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Backend Development', 's-python', 'Technical', TRUE, 2, 1, 1),
    ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'UX Design', 's-ux', 'Design', TRUE, 2, 1, 2),
    ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'Project Management', 's-pm', 'Management', FALSE, 1, 1, 3),
    ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'Data Visualization', 's-data-viz', 'Data', FALSE, 1, 1, 3),
    -- AI for Climate Sprint (ev3)
    ('f0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000003', 'Machine Learning', 's-ml', 'AI/ML', TRUE, 3, 1, 1),
    ('f0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000003', 'Research & Analysis', 's-research', 'Research', TRUE, 3, 1, 1),
    ('f0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000003', 'Python', 's-python', 'Backend', TRUE, 2, 2, 1),
    ('f0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000003', 'Academic Writing', 's-writing', 'Research', TRUE, 2, 1, 2),
    ('f0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000003', 'Data Visualization', 's-data-viz', 'Data', FALSE, 2, 1, 3)
ON CONFLICT (id) DO UPDATE SET 
    skill_name = EXCLUDED.skill_name,
    required = EXCLUDED.required,
    min_proficiency = EXCLUDED.min_proficiency;

-- ----------------------------------------------------------------------------
-- 12. Event Registrations
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.event_registrations (event_id, user_id, status, preferred_roles)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'registered', '["Frontend Lead"]'::jsonb),
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'registered', '["Backend Lead"]'::jsonb),
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'registered', '["Lead Designer"]'::jsonb),
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'registered', '["Team Lead"]'::jsonb),
    -- ev3 registrations
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'registered', '["AI/ML Lead"]'::jsonb),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'registered', '["Data Engineer"]'::jsonb),
    -- ev4 registrations
    ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 'registered', '["Creative Director"]'::jsonb)
ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- 13. Teams & Memberships (Team 1: Complete, Team 2: Gap Team)
-- ----------------------------------------------------------------------------
-- Team 1: CivicPulse (ev1) - High coverage team
INSERT INTO hackloop.teams (id, event_id, name, status, published_at)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'CivicPulse', 'published', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

INSERT INTO hackloop.team_memberships (team_id, user_id, role, status)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Frontend Lead', 'active'),
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Backend Lead', 'active'),
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'UX Designer', 'active'),
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'Team Lead', 'active')
ON CONFLICT DO NOTHING;

-- Team 2: ClimateML Alpha (ev3) - Intentionally has skill gap and team size gap!
-- Missing: Data Visualization, and has only 2 members (minimum is 3)
INSERT INTO hackloop.teams (id, event_id, name, status, published_at)
VALUES
    ('d0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'ClimateML Alpha', 'forming', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

INSERT INTO hackloop.team_memberships (team_id, user_id, role, status)
VALUES
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'AI/ML Lead', 'active')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 14. Daily Challenges
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.daily_challenges (id, challenge_date, category, question, options, correct_answer, explanation, points, skill_tag)
VALUES
    (
        'dc1',
        CURRENT_DATE,
        'Team Dynamics',
        'When forming a balanced project team, which factor is most often overlooked?',
        '[{"id": "a", "text": "Technical skill coverage"}, {"id": "b", "text": "Availability and time-zone alignment"}, {"id": "c", "text": "Complementary working styles and communication preferences"}, {"id": "d", "text": "Individual proficiency levels"}]'::jsonb,
        'c',
        'Technical skills are typically checked first. But communication style and working-style compatibility are frequently neglected, causing team friction and missed deadlines.',
        10,
        'Team Dynamics'
    ),
    (
        'dc2',
        CURRENT_DATE - INTERVAL '1 day',
        'Collaboration',
        'In a hackathon team with five members and a strict 24-hour timeline, which role is most critical if it is unassigned?',
        '[{"id": "a", "text": "Graphic designer"}, {"id": "b", "text": "Someone responsible for integration and final submission"}, {"id": "c", "text": "Social media manager"}, {"id": "d", "text": "A second backend developer"}]'::jsonb,
        'b',
        'Integration and submission are frequently underestimated. Without someone driving the unified build, disjoint components fail to merge under pressure.',
        10,
        'Collaboration'
    )
ON CONFLICT (id) DO UPDATE SET 
    question = EXCLUDED.question,
    options = EXCLUDED.options,
    explanation = EXCLUDED.explanation;

-- ----------------------------------------------------------------------------
-- 15. XP Ledger Entries
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.xp_ledger (user_id, amount, action_type, reference_id, description)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 50, 'event_registration', 'e0000000-0000-0000-0000-000000000001', 'Registered for City Innovation Hackathon 2026'),
    ('a0000000-0000-0000-0000-000000000001', 10, 'daily_challenge', 'dc1', 'Completed daily challenge: Team Dynamics'),
    ('a0000000-0000-0000-0000-000000000002', 100, 'team_formation', 'd0000000-0000-0000-0000-000000000001', 'Formed CivicPulse team'),
    ('a0000000-0000-0000-0000-000000000004', 50, 'event_registration', 'e0000000-0000-0000-0000-000000000003', 'Registered for AI for Climate Sprint');

-- ----------------------------------------------------------------------------
-- 16. Notifications
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.notifications (user_id, type, title, content, is_read)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'team_invite', 'Welcome to CivicPulse!', 'You have been assigned as Frontend Lead on CivicPulse for the City Innovation Hackathon.', FALSE),
    ('a0000000-0000-0000-0000-000000000001', 'achievement', 'Daily Streak: Day 1', 'You answered todays collaboration challenge correctly!', TRUE);

-- ----------------------------------------------------------------------------
-- 17. Audit Logs
-- ----------------------------------------------------------------------------
INSERT INTO hackloop.audit_logs (actor_id, action, entity_type, entity_id, details)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'EVENT_PUBLISHED', 'event', 'e0000000-0000-0000-0000-000000000001', '{"title": "City Innovation Hackathon 2026", "capacity": 120}'::jsonb),
    ('b0000000-0000-0000-0000-000000000001', 'TEAM_PUBLISHED', 'team', 'd0000000-0000-0000-0000-000000000001', '{"team_name": "CivicPulse", "members_count": 4}'::jsonb);

-- End of seed_demo.sql
