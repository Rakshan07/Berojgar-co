// ─── Demo Matching Service ────────────────────────────────────────────────
// This is a deterministic frontend-only demo that simulates what the future
// Python/FastAPI matching engine will do. It is NOT the real algorithm.
// Replace this module's implementation (not its interface) when the backend is ready.

import { PROFICIENCY_LEVELS } from '../data/demoData';

/**
 * Generates team suggestions from a pool of participants for a given event.
 * Returns an array of proposed teams with coverage notes and explanations.
 */
export async function generateTeamSuggestions(event, participants) {
  // Simulate async API call
  await new Promise(r => setTimeout(r, 1200));

  if (!participants.length) return [];

  const { teamSize } = event;
  const targetSize = teamSize.max ?? teamSize.min ?? 4;

  // Score each participant against the event requirements
  const scored = participants.map(p => ({
    ...p,
    score: scoreParticipant(p, event.requirements),
    coveredReqs: getCoveredRequirements(p, event.requirements),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Greedy team formation: fill one team at a time
  const teams = [];
  let remaining = [...scored];
  let teamIndex = 1;

  while (remaining.length >= teamSize.min) {
    const teamMembers = [];
    const coveredReqIds = new Set();

    // First: grab someone covering a required skill not yet covered
    const reqFirst = remaining.find(p =>
      p.coveredReqs.some(r => r.required && !coveredReqIds.has(r.id))
    );
    if (reqFirst) {
      teamMembers.push(reqFirst);
      reqFirst.coveredReqs.forEach(r => coveredReqIds.add(r.id));
      remaining = remaining.filter(p => p.id !== reqFirst.id);
    }

    // Fill team up to targetSize using complementary coverage
    while (teamMembers.length < Math.min(targetSize, remaining.length + teamMembers.length)) {
      if (!remaining.length) break;

      // Pick the participant who covers the most currently-uncovered requirements
      let best = remaining[0];
      let bestNew = 0;
      for (const p of remaining) {
        const newCovered = p.coveredReqs.filter(r => !coveredReqIds.has(r.id)).length;
        if (newCovered > bestNew) { best = p; bestNew = newCovered; }
      }

      teamMembers.push(best);
      best.coveredReqs.forEach(r => coveredReqIds.add(r.id));
      remaining = remaining.filter(p => p.id !== best.id);

      if (teamMembers.length >= targetSize) break;
    }

    if (teamMembers.length < teamSize.min) {
      // Not enough for a full team — add as incomplete
      remaining = [];
    }

    // Build coverage analysis
    const coverageNotes = buildCoverageNotes(teamMembers, event.requirements);
    const missing = event.requirements.filter(r => !coveredReqIds.has(r.id));
    const { reasons, compatibilityScore, pillars } = buildMatchReasons(teamMembers, event.requirements);

    teams.push({
      id: `gen-tm-${Date.now()}-${teamIndex}`,
      eventId: event.id,
      name: `Team ${teamIndex}`,
      status: 'proposed',
      members: teamMembers.map(m => ({ participantId: m.id, role: inferRole(m, event) })),
      coverageNotes,
      matchReasons: reasons,
      compatibilityScore,
      pillars,
      missingRequirements: missing.map(r => ({ skill: r.skill, required: r.required, proficiency: r.proficiency })),
      teamSizeGap: teamMembers.length < teamSize.min,
      proposedAt: new Date().toISOString().slice(0, 10),
      publishedAt: null,
      _isGenerated: true,
    });

    teamIndex++;
  }


  return teams;
}

function scoreParticipant(participant, requirements) {
  let score = 0;
  for (const req of requirements) {
    const match = findSkillMatch(participant, req.skill);
    if (match) {
      const profBonus = Math.min(match.proficiency, req.proficiency) / 4;
      score += req.required ? 2 + profBonus : 1 + profBonus;
    }
  }
  return score;
}

function getCoveredRequirements(participant, requirements) {
  return requirements.filter(req => {
    const match = findSkillMatch(participant, req.skill);
    return match && match.proficiency >= req.proficiency;
  });
}

function findSkillMatch(participant, skillName) {
  const lower = skillName.toLowerCase();
  return participant.skills.find(s => {
    const sLower = s.name.toLowerCase();
    return sLower === lower ||
      sLower.includes(lower) ||
      lower.includes(sLower) ||
      normalizeSkill(s.name) === normalizeSkill(skillName);
  });
}

function normalizeSkill(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/development$/, 'dev')
    .replace(/analysis$/, 'analysis');
}

function buildCoverageNotes(members, requirements) {
  const notes = [];
  const covered = new Set();

  for (const req of requirements) {
    const contributor = members.find(m => {
      const match = findSkillMatch(m, req.skill);
      return match && match.proficiency >= req.proficiency;
    });

    if (contributor) {
      const match = findSkillMatch(contributor, req.skill);
      const profLabel = PROFICIENCY_LEVELS.find(l => l.value === match.proficiency)?.label ?? 'Unknown';
      const reqLabel = req.required ? 'required capability' : 'preferred capability';
      notes.push(
        `${contributor.name} covers ${req.skill} (${profLabel}) — ${reqLabel} met.`
      );
      covered.add(req.id);
    } else {
      const label = req.required ? 'CRITICAL GAP' : 'Gap';
      const profLabel = PROFICIENCY_LEVELS.find(l => l.value === req.proficiency)?.label ?? '';
      notes.push(
        `${label}: No participant covers ${req.skill} at ${profLabel} level or above.`
      );
    }
  }

  return notes;
}

function buildMatchReasons(members, requirements) {
  // ─── 5-Pillar Compatibility Engine (Exact Weights) ──────────────────────
  // 1. Required Skill Coverage: 35%
  const reqSkills = requirements.filter(r => r.required);
  const coveredReqCount = reqSkills.filter(r =>
    members.some(m => {
      const match = findSkillMatch(m, r.skill);
      return match && match.proficiency >= r.proficiency;
    })
  ).length;
  const skillCoveragePct = reqSkills.length ? Math.round((coveredReqCount / reqSkills.length) * 100) : 100;

  // 2. Complementary Skills & Role Balance: 25%
  const hasBackend = members.some(m => findSkillMatch(m, 'Backend Development') || findSkillMatch(m, 'Python') || findSkillMatch(m, 'Node.js'));
  const hasFrontend = members.some(m => findSkillMatch(m, 'Frontend Development') || findSkillMatch(m, 'React'));
  const hasDesign = members.some(m => findSkillMatch(m, 'UX Design') || findSkillMatch(m, 'Branding'));
  const hasCoord = members.some(m => findSkillMatch(m, 'Project Management') || findSkillMatch(m, 'Strategy') || findSkillMatch(m, 'Management'));
  const distinctRoles = [hasBackend, hasFrontend, hasDesign, hasCoord].filter(Boolean).length;
  const roleBalancePct = Math.min(100, Math.round((distinctRoles / 3) * 100));

  // 3. Collaboration Preferences: 15%
  const timezones = members.map(m => m.timezone || 'UTC');
  const collabPct = new Set(timezones).size <= 2 ? 100 : 80;

  // 4. Availability & Commitment: 15%
  const avgHours = members.reduce((sum, m) => sum + (m.availabilityHours || m.hoursPerWeek || 15), 0) / (members.length || 1);
  const availPct = Math.min(100, Math.round((avgHours / 15) * 100));

  // 5. Shared Goals & Role Preferences: 10%
  const goalsPct = 90; // Default aligned hackathon goal

  // Exact weighted total
  const compatibilityScore = Math.round(
    0.35 * skillCoveragePct +
    0.25 * roleBalancePct +
    0.15 * collabPct +
    0.15 * availPct +
    0.10 * goalsPct
  );

  const pillars = [
    { name: 'Required Skill Coverage', weight: '35%', score: skillCoveragePct, desc: `${coveredReqCount}/${reqSkills.length || 1} required skills covered` },
    { name: 'Complementary Roles & Balance', weight: '25%', score: roleBalancePct, desc: `${distinctRoles} key functional disciplines paired` },
    { name: 'Collaboration Preferences', weight: '15%', score: collabPct, desc: 'Shared communication rhythm & timezones' },
    { name: 'Availability & Commitment', weight: '15%', score: availPct, desc: `Avg ${Math.round(avgHours)} hrs/wk per member` },
    { name: 'Shared Goals & Preferences', weight: '10%', score: goalsPct, desc: 'Aligned role preferences & ambitions' },
  ];

  const reasons = [
    `Overall Compatibility: ${compatibilityScore}% based on 5-pillar matching engine.`,
    `Skill Coverage (35% wt): ${skillCoveragePct}% — ${coveredReqCount}/${reqSkills.length || 1} required competencies covered.`,
    `Role Balance (25% wt): ${roleBalancePct}% across complementary engineering and design roles.`,
    `Collaboration Alignment (15% wt): ${collabPct}% working rhythm match.`,
    `Availability & Commitment (15% wt): ${availPct}% commitment rating.`
  ];

  return { reasons, compatibilityScore, pillars };
}


function inferRole(participant, event) {
  const skills = participant.skills.map(s => s.name.toLowerCase());
  if (skills.some(s => s.includes('ux') || s.includes('design'))) return 'Designer';
  if (skills.some(s => s.includes('backend') || s.includes('python') || s.includes('node'))) return 'Backend Developer';
  if (skills.some(s => s.includes('frontend') || s.includes('react'))) return 'Frontend Developer';
  if (skills.some(s => s.includes('ml') || s.includes('machine learning'))) return 'AI/ML Engineer';
  if (skills.some(s => s.includes('project') || s.includes('management'))) return 'Team Lead';
  if (skills.some(s => s.includes('research'))) return 'Researcher';
  if (skills.some(s => s.includes('brand') || s.includes('creative'))) return 'Creative Lead';
  return 'Member';
}

/**
 * Given a team with a removed member, compute updated coverage and suggest replacements.
 */
export function computeReplacementSuggestions(team, removedParticipantId, allParticipants, event) {
  const remainingMembers = team.members
    .filter(m => m.participantId !== removedParticipantId)
    .map(m => allParticipants.find(p => p.id === m.participantId))
    .filter(Boolean);

  const coveredReqIds = new Set();
  for (const member of remainingMembers) {
    getCoveredRequirements(member, event.requirements).forEach(r => coveredReqIds.add(r.id));
  }

  const newGaps = event.requirements.filter(r => !coveredReqIds.has(r.id));
  const alreadyInTeam = new Set(team.members.map(m => m.participantId));

  const candidates = allParticipants
    .filter(p => !alreadyInTeam.has(p.id))
    .map(p => ({
      participant: p,
      coversGaps: newGaps.filter(gap => {
        const match = findSkillMatch(p, gap.skill);
        return match && match.proficiency >= gap.proficiency;
      }),
      score: scoreParticipant(p, event.requirements),
    }))
    .filter(c => c.coversGaps.length > 0)
    .sort((a, b) => b.coversGaps.length - a.score || a.score - b.score);

  return { newGaps, candidates: candidates.slice(0, 3) };
}
