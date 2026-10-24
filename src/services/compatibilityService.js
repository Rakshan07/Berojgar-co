// ─── Team Compatibility & Intake Service ────────────────────────────────────
// Generates non-technical contribution questions based on participant skills,
// 1 to 3 personality/collaboration questions, and calculates need-based 4-factor
// compatibility with intelligent full-stack management and redundancy prevention.

import { PROFICIENCY_LEVELS } from '../data/demoData';

// ─── 1. Skill-Based Practical Contribution Questions ───────────────────────
// Strictly non-technical: questions focus on what the participant actually builds,
// their workflow focus, and how they like to contribute — NOT code quizzes or syntax trivia.

export function generateSkillIntakeQuestions(userSkills = []) {
  const skillNames = (userSkills || []).map(s => s.name?.toLowerCase() || '');
  const categories = new Set((userSkills || []).map(s => s.category?.toLowerCase() || ''));

  const questions = [];

  // Frontend / UI focus
  if (skillNames.some(s => s.includes('react') || s.includes('vue') || s.includes('front') || s.includes('css') || s.includes('web'))) {
    questions.push({
      id: 'q_skill_frontend',
      type: 'skill_focus',
      skillArea: 'Frontend / UI',
      title: 'In frontend and UI development, what part of the build do you enjoy driving most?',
      options: [
        { id: 'rapid_ui', label: 'Rapid UI layout & styling', desc: 'Translating designs into responsive, polished components quickly' },
        { id: 'state_data', label: 'State & API integration', desc: 'Wiring complex data flows, caching, client state, and backend endpoints' },
        { id: 'design_sys', label: 'Design systems & micro-interactions', desc: 'Component libraries, accessible tokens, smooth animations, and UX polish' },
      ],
    });
  }

  // Backend / Database focus
  if (skillNames.some(s => s.includes('python') || s.includes('node') || s.includes('back') || s.includes('fastapi') || s.includes('sql') || s.includes('postgre'))) {
    questions.push({
      id: 'q_skill_backend',
      type: 'skill_focus',
      skillArea: 'Backend & Architecture',
      title: 'When working on backend deliverables, where do you spend most of your energy?',
      options: [
        { id: 'core_api', label: 'REST/GraphQL API endpoints', desc: 'Designing clean contracts, input validation, and business logic' },
        { id: 'db_modeling', label: 'Data modeling & query design', desc: 'PostgreSQL schemas, relations, migrations, and performance tuning' },
        { id: 'integrations', label: 'Third-party integrations & pipelines', desc: 'Auth, background workers, webhooks, and cloud infrastructure' },
      ],
    });
  }

  // Design / UX focus
  if (skillNames.some(s => s.includes('figma') || s.includes('ux') || s.includes('design') || s.includes('brand') || categories.has('design'))) {
    questions.push({
      id: 'q_skill_design',
      type: 'skill_focus',
      skillArea: 'Product & Design',
      title: 'In product design sprints, how do you best support your engineering peers?',
      options: [
        { id: 'user_flows', label: 'User journey mapping & rapid wireframes', desc: 'Defining clear user stories, information architecture, and core screen flows' },
        { id: 'hifi_prototype', label: 'High-fidelity Figma prototypes', desc: 'Interactive prototypes, component states, and pixel-precise design specs' },
        { id: 'design_tokens', label: 'Design tokens & dev handoff', desc: 'Color palettes, spacing scales, asset exports, and developer walkthroughs' },
      ],
    });
  }

  // AI / ML / Data focus
  if (skillNames.some(s => s.includes('ai') || s.includes('ml') || s.includes('pytorch') || s.includes('data') || s.includes('machine') || categories.has('ai/ml') || categories.has('data'))) {
    questions.push({
      id: 'q_skill_aiml',
      type: 'skill_focus',
      skillArea: 'AI & Data Insights',
      title: 'How do you prefer applying data or AI capabilities during an event sprint?',
      options: [
        { id: 'llm_prompts', label: 'LLM agents & structured outputs', desc: 'Crafting prompt pipelines, tool calling, and generative experiences' },
        { id: 'data_viz', label: 'Data visualization & interactive dashboards', desc: 'Transforming complex data into charts, maps, and visual narratives' },
        { id: 'data_prep', label: 'Data ingestion & preprocessing', desc: 'Web scraping, dataset cleaning, vector indexing, and pipeline reliability' },
      ],
    });
  }

  // Fallback if none matched or fewer than 2
  if (questions.length < 2) {
    questions.push({
      id: 'q_skill_general',
      type: 'skill_focus',
      skillArea: 'Project Delivery',
      title: 'What type of hands-on contribution energizes you most during a team sprint?',
      options: [
        { id: 'feature_ship', label: 'Shipping core user features', desc: 'Focusing on delivering functional, testable milestones from start to finish' },
        { id: 'architecture', label: 'Systems connection & glue logic', desc: 'Connecting frontend to backend, setting up configs, and debugging blockers' },
        { id: 'product_polish', label: 'User experience & presentation polish', desc: 'Sharpening the pitch, user onboarding, demo flow, and final aesthetics' },
      ],
    });
  }

  return questions.slice(0, 2);
}

// ─── 2. Personality & Collaboration Questions (1 to 3 Questions) ───────────
export const PERSONALITY_QUESTIONS = [
  {
    id: 'p_comm',
    title: 'Communication & Working Rhythm',
    subtitle: 'How do you naturally collaborate best with your teammates during active hours?',
    options: [
      { id: 'async', label: 'Async-First Builder', desc: 'Deep solo focus blocks with frequent written updates (Discord/Slack/Notion)' },
      { id: 'cadence', label: 'Structured Syncs', desc: 'Quick morning & afternoon standups, then autonomous execution' },
      { id: 'pairing', label: 'Live Pairing & Huddles', desc: 'Continuous voice/video room open, active screensharing, and bouncing ideas in real-time' },
    ],
  },
  {
    id: 'p_crunch',
    title: 'Blocker & Crunch Handling',
    subtitle: 'When facing an unexpected roadblock or a tight deadline, what is your instinct?',
    options: [
      { id: 'scope_down', label: 'Pragmatic Scope-Down', desc: 'Aggressively trim secondary features to guarantee a stable, polished core MVP' },
      { id: 'swarm', label: 'Team Swarm', desc: 'Rally the whole team into a quick huddle to brainstorm and crack the blocker together' },
      { id: 'workaround', label: 'Fast Pivot / Workaround', desc: 'Immediately substitute with a proven library or simplified alternative approach' },
    ],
  },
  {
    id: 'p_ambition',
    title: 'Event Ambition & Mindset',
    subtitle: 'What is your primary personal motivation for joining this event?',
    options: [
      { id: 'podium', label: 'Competitive Podium Finish', desc: 'Aiming to build a standout winner, polish the presentation, and compete hard' },
      { id: 'learning', label: 'Skill Expansion & Tech Experimentation', desc: 'Trying new frameworks, expanding capabilities, and taking creative technical risks' },
      { id: 'community', label: 'Peer Connection & Collaborative Fun', desc: 'Meeting great builders, having fun collaborating, and shipping a cool project together' },
    ],
  },
];

// ─── 3. Compatibility Calculation Engine ──────────────────────────────────
// Transparent 4-factor scoring:
// 1. Need-Based Complementarity (40%): Does the team need what you bring, or would you duplicate an existing role?
// 2. Collaboration Harmony (30%): Communication cadence & blocker resolution alignment
// 3. Ambition Synergy (20%): Shared project goals (podium vs learning vs fun)
// 4. Team Capacity & Balance (10%): Has open spots within min/max bounds

export function calculateTeamCompatibility({
  user,
  userSkills = [],
  intakeAnswers = {},
  team,
  event,
  allParticipants = [],
}) {
  const teamMembers = team.members || [];
  const maxTeamSize = event?.teamSize?.max || 5;
  const minTeamSize = event?.teamSize?.min || 3;
  const currentCount = teamMembers.length;

  const spotsLeft = Math.max(0, maxTeamSize - currentCount);
  const isFull = spotsLeft === 0;

  // Extract existing team member profiles
  const memberProfiles = teamMembers
    .map(m => allParticipants.find(p => p.id === m.participantId))
    .filter(Boolean);

  const existingTeamSkills = new Set();
  memberProfiles.forEach(p => {
    (p.skills || []).forEach(s => existingTeamSkills.add(s.name.toLowerCase()));
  });

  // 1. Analyze existing team role coverage
  const existingMemberRoles = teamMembers.map(m => (m.role || '').toLowerCase());

  const teamHasFrontend = existingMemberRoles.some(r => r.includes('front') || r.includes('ui lead') || r.includes('react')) ||
    memberProfiles.some(p => (p.skills || []).some(s => s.name.toLowerCase().includes('react') || s.name.toLowerCase().includes('frontend')));
  
  const frontendLeadMember = memberProfiles.find(p =>
    (p.skills || []).some(s => s.name.toLowerCase().includes('react') || s.name.toLowerCase().includes('frontend')) ||
    teamMembers.some(m => m.participantId === p.id && m.role.toLowerCase().includes('front'))
  );

  const teamHasBackend = existingMemberRoles.some(r => r.includes('back') || r.includes('api') || r.includes('backend lead')) ||
    memberProfiles.some(p => (p.skills || []).some(s => s.name.toLowerCase().includes('python') || s.name.toLowerCase().includes('backend') || s.name.toLowerCase().includes('node') || s.name.toLowerCase().includes('sql') || s.name.toLowerCase().includes('fastapi')));

  const backendLeadMember = memberProfiles.find(p =>
    (p.skills || []).some(s => s.name.toLowerCase().includes('python') || s.name.toLowerCase().includes('backend')) ||
    teamMembers.some(m => m.participantId === p.id && m.role.toLowerCase().includes('back'))
  );

  const teamHasDesign = existingMemberRoles.some(r => r.includes('design') || r.includes('ux')) ||
    memberProfiles.some(p => (p.skills || []).some(s => s.name.toLowerCase().includes('figma') || s.name.toLowerCase().includes('ux')));

  const teamHasDataViz = existingTeamSkills.has('data visualization') || existingTeamSkills.has('data viz');

  // 2. Identify candidate skills & full-stack status
  const userSkillNames = (userSkills || []).map(s => s.name?.toLowerCase() || '');
  const userCategories = (userSkills || []).map(s => s.category?.toLowerCase() || '');
  const preferredRoles = (user?.preferredRoles || []).map(r => r.toLowerCase());

  const userHasFrontend = userSkillNames.some(s => s.includes('front') || s.includes('react') || s.includes('vue') || s.includes('css') || s.includes('html') || s.includes('ui') || s.includes('next')) || userCategories.includes('frontend');
  const userHasBackend = userSkillNames.some(s => s.includes('back') || s.includes('python') || s.includes('node') || s.includes('fastapi') || s.includes('sql') || s.includes('postgre') || s.includes('django') || s.includes('go')) || userCategories.includes('backend');
  const userHasDesign = userSkillNames.some(s => s.includes('figma') || s.includes('design') || s.includes('ux') || s.includes('ui/ux')) || userCategories.includes('design');
  const userHasDataViz = userSkillNames.some(s => s.includes('visualization') || s.includes('data viz') || s.includes('d3') || s.includes('charts'));

  const isFullStack = (userHasFrontend && userHasBackend) ||
    preferredRoles.some(r => r.includes('full-stack') || r.includes('fullstack') || r.includes('generalist'));

  // 3. Need-based role assignment & redundancy penalty
  let proposedRole = 'Contributor';
  let roleType = 'standard'; // 'gap_fill' | 'fullstack_flex' | 'redundant'
  let roleOverlapWarning = null;
  let needBonus = 0;
  let redundancyPenalty = 0;

  if (isFullStack) {
    // ─── MANAGING FULL-STACK DEVELOPER ───
    // An elastic generalist that dynamically slots into whichever side the team lacks
    if (!teamHasFrontend && teamHasBackend) {
      proposedRole = 'Frontend Lead / UI Architect (Full-Stack Flex)';
      roleType = 'fullstack_flex';
      needBonus += 36;
    } else if (!teamHasBackend && teamHasFrontend) {
      proposedRole = 'Backend Lead / API Architect (Full-Stack Flex)';
      roleType = 'fullstack_flex';
      needBonus += 36;
    } else if (!teamHasFrontend && !teamHasBackend) {
      proposedRole = 'Lead Full-Stack Architect';
      roleType = 'fullstack_flex';
      needBonus += 40;
    } else {
      // Both core engineering chairs already occupied (e.g. CivicPulse)
      if (!teamHasDataViz && userHasDataViz) {
        proposedRole = 'Full-Stack Integrator & Data Viz';
        roleType = 'standard';
        needBonus += 12;
      } else {
        proposedRole = 'Systems Integrator & DevOps';
        roleType = 'redundant';
        redundancyPenalty += 16;
        roleOverlapWarning = `Team already has dedicated Frontend (${frontendLeadMember?.name || 'Asel'}) and Backend (${backendLeadMember?.name || 'Marcus'}) leads.`;
      }
    }
  } else if (userHasFrontend && !userHasBackend) {
    // ─── PURE FRONTEND SPECIALIST ───
    if (!teamHasFrontend) {
      proposedRole = 'Frontend Lead';
      roleType = 'gap_fill';
      needBonus += 38;
    } else {
      // REDUNDANCY: Team already has a Frontend Lead!
      proposedRole = 'Secondary Frontend Support';
      roleType = 'redundant';
      redundancyPenalty += 32;
      roleOverlapWarning = `Role Overlap: Team already has a Frontend Lead (${frontendLeadMember?.name || 'Asel'}). Joining creates duplicate UI ownership without filling an unfilled gap.`;
    }
  } else if (userHasBackend && !userHasFrontend) {
    // ─── PURE BACKEND SPECIALIST ───
    if (!teamHasBackend) {
      proposedRole = 'Backend Lead';
      roleType = 'gap_fill';
      needBonus += 38;
    } else {
      // REDUNDANCY: Team already has a Backend Lead!
      proposedRole = 'Secondary Backend Support';
      roleType = 'redundant';
      redundancyPenalty += 32;
      roleOverlapWarning = `Role Overlap: Team already has a Backend Lead (${backendLeadMember?.name || 'Marcus'}). Joining creates duplicate backend ownership.`;
    }
  } else if (userHasDesign) {
    if (!teamHasDesign) {
      proposedRole = 'Product & UX Designer';
      roleType = 'gap_fill';
      needBonus += 38;
    } else {
      proposedRole = 'Visual Design Support';
      roleType = 'redundant';
      redundancyPenalty += 28;
      roleOverlapWarning = `Role Overlap: Team already has a dedicated UX Designer.`;
    }
  }

  // 1. Skill Score (0 to 40)
  let skillScore = 15 + needBonus - redundancyPenalty;
  skillScore = Math.max(5, Math.min(40, skillScore));

  // 2. Collaboration Harmony (0 to 30)
  let commScore = 20;
  const userComm = intakeAnswers.p_comm || 'cadence';
  const userCrunch = intakeAnswers.p_crunch || 'scope_down';
  if (userComm === 'async') commScore += 5;
  if (userComm === 'cadence') commScore += 6;
  if (userComm === 'pairing') commScore += 4;
  if (userCrunch === 'scope_down') commScore += 2;
  commScore = Math.min(30, Math.max(15, commScore));

  // 3. Ambition Synergy (0 to 20)
  let ambitionScore = 15;
  const userAmbition = intakeAnswers.p_ambition || 'podium';
  if (userAmbition === 'podium') ambitionScore += 4;
  if (userAmbition === 'learning') ambitionScore += 3;
  if (userAmbition === 'community') ambitionScore += 2;
  ambitionScore = Math.min(20, Math.max(10, ambitionScore));

  // 4. Capacity (0 to 10)
  let capacityScore = 0;
  if (spotsLeft >= 1) {
    capacityScore = currentCount < minTeamSize ? 10 : 8;
  }

  // Overall Compatibility
  let overallScore = skillScore + commScore + ambitionScore + capacityScore;
  if (isFull) overallScore = Math.min(40, overallScore);
  if (roleType === 'redundant') overallScore = Math.min(60, overallScore);
  overallScore = Math.max(25, Math.min(98, overallScore));

  // Synergy Tier and Badges
  let synergyTier = 'Good Match';
  let tierBadgeColor = 'ink';
  if (overallScore >= 90) {
    synergyTier = 'Top Synergy · Critical Need';
    tierBadgeColor = 'teal';
  } else if (overallScore >= 78) {
    synergyTier = 'High Compatibility';
    tierBadgeColor = 'cobalt';
  } else if (overallScore >= 65) {
    synergyTier = 'Moderate Match';
    tierBadgeColor = 'purple';
  } else {
    synergyTier = 'Role Overlap / Low Need';
    tierBadgeColor = 'coral';
  }

  // Highlights
  const highlights = [];
  if (roleOverlapWarning) {
    highlights.push(roleOverlapWarning);
  } else if (roleType === 'gap_fill') {
    highlights.push(`Direct Need Match: Fills this team's empty ${proposedRole} requirement`);
  } else if (roleType === 'fullstack_flex') {
    highlights.push(`Full-Stack Flexibility: Adaptively slots into ${proposedRole} to cover this team's deficit`);
  }

  if (isFullStack && !roleOverlapWarning) {
    highlights.push(`Bridges technical communication across UI, REST APIs, and database layers`);
  }

  if (spotsLeft > 0) {
    highlights.push(`${spotsLeft} open roster spot${spotsLeft > 1 ? 's' : ''} available on this team`);
  }

  return {
    overallScore,
    synergyTier,
    tierBadgeColor,
    proposedRole,
    roleType,
    isFullStack,
    roleOverlapWarning,
    spotsLeft,
    isFull,
    breakdown: {
      skills: { score: skillScore, max: 40, label: 'Skill Need / Complementarity' },
      collaboration: { score: commScore, max: 30, label: 'Collaboration Harmony' },
      ambition: { score: ambitionScore, max: 20, label: 'Ambition Synergy' },
      capacity: { score: capacityScore, max: 10, label: 'Roster Availability' },
    },
    highlights,
  };
}
