// ─── Living Weave Visualization ───────────────────────────────────────────
// Authentic constellation SVG showing team members, capability nodes, and connections.
// Eliminates raw graph grids and text truncation with polished modern layout.

import { useMemo } from 'react';
import { CheckCircle2, AlertCircle, Users } from 'lucide-react';

const AVATAR_COLORS = ['#C5ADE5', '#B69BD8', 'var(--sf-border)', 'var(--sf-border-strong)', 'var(--sf-accent-text)'];

function polarToCart(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Cleanly shorten standard industry labels without clipping
function formatSkillLabel(name) {
  if (!name) return '';
  return name
    .replace('Development', 'Dev')
    .replace('Management', 'Mgmt')
    .replace('Visualization', 'Vis')
    .replace('Engineering', 'Eng');
}

export function LivingWeaveViz({ team, participants, requirements, className = '' }) {
  const width = 640;
  const height = 430;
  const cx = width / 2;
  const cy = height / 2 - 12;
  const memberR = 152;
  const skillR = 82;

  const members = useMemo(
    () => (team?.members ?? []).map(m => participants.find(p => p.id === m.participantId)).filter(Boolean),
    [team, participants]
  );

  const reqSkills = useMemo(
    () => (requirements ?? []).map(r => ({ ...r, key: r.id })),
    [requirements]
  );

  // Check coverage
  const coveredReqIds = useMemo(() => {
    const covered = new Set();
    for (const member of members) {
      for (const req of reqSkills) {
        const match = member.skills.find(s =>
          s.name.toLowerCase().includes(req.skill.toLowerCase()) ||
          req.skill.toLowerCase().includes(s.name.toLowerCase())
        );
        if (match && match.proficiency >= req.proficiency) covered.add(req.id);
      }
    }
    return covered;
  }, [members, reqSkills]);

  // Member positions on the outer orbit
  const memberPositions = useMemo(() =>
    members.map((m, i) => ({
      ...polarToCart(cx, cy, memberR, (360 / Math.max(members.length, 1)) * i),
      member: m,
      color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    })),
    [members, cx, cy, memberR]
  );

  // Skill positions on the inner orbit
  const skillPositions = useMemo(() =>
    reqSkills.map((req, i) => ({
      ...polarToCart(cx, cy, skillR, (360 / Math.max(reqSkills.length, 1)) * i + 36),
      req,
      covered: coveredReqIds.has(req.id),
    })),
    [reqSkills, cx, cy, skillR, coveredReqIds]
  );

  // Connections: member → skill node if member covers it
  const connections = useMemo(() => {
    const lines = [];
    for (const mp of memberPositions) {
      for (const sp of skillPositions) {
        const match = mp.member.skills.find(s =>
          s.name.toLowerCase().includes(sp.req.skill.toLowerCase()) ||
          sp.req.skill.toLowerCase().includes(s.name.toLowerCase())
        );
        if (match && match.proficiency >= sp.req.proficiency) {
          lines.push({ from: mp, to: sp, color: mp.color });
        }
      }
    }
    return lines;
  }, [memberPositions, skillPositions]);

  if (!members.length) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 text-slate-400 text-sm ${className}`}>
        <Users size={28} className="text-slate-500 mb-2" />
        <p>No team members assigned yet.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Desktop & Tablet SVG Constellation */}
      <div className="w-full relative overflow-hidden rounded-2xl bg-[var(--sf-bg)] border border-[var(--sf-border)] p-2 shadow-[0_0_30px_rgba(182,38,77,0.12)]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="img"
          aria-label="Living Weave team constellation showing member connections to requirements"
          className="overflow-visible"
        >
          <defs>
            {/* Center ambient glow */}
            <radialGradient id="weaveCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#C5ADE5" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#C5ADE5" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#C5ADE5" stopOpacity="0" />
            </radialGradient>

            {/* Subtle Node Drop Shadow */}
            <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* Ambient Glow */}
          <circle cx={cx} cy={cy} r={skillR * 1.9} fill="url(#weaveCenterGlow)" />

          {/* Concentric Orbit Guide Rings */}
          <circle cx={cx} cy={cy} r={skillR} fill="none" stroke="rgba(182,38,77,0.2)" strokeDasharray="3 4" />
          <circle cx={cx} cy={cy} r={memberR} fill="none" stroke="rgba(244,167,187,0.15)" strokeDasharray="4 6" />

          {/* Connection Lines */}
          {connections.map((c, i) => (
            <line
              key={i}
              x1={c.from.x} y1={c.from.y}
              x2={c.to.x} y2={c.to.y}
              stroke={c.color}
              strokeWidth="1.75"
              strokeOpacity="0.55"
              strokeLinecap="round"
            />
          ))}

          {/* Center Hub */}
          <g transform={`translate(${cx},${cy})`}>
            <circle r={25} fill="var(--sf-bg)" stroke="#C5ADE5" strokeWidth="2" filter="url(#nodeShadow)" />
            <text
              textAnchor="middle"
              dy="0.35em"
              fontSize="9.5"
              fontFamily="'Space Grotesk', sans-serif"
              fill="var(--sf-accent-text)"
              fontWeight="800"
              letterSpacing="0.08em"
            >
              CORE
            </text>
          </g>

          {/* Skill Nodes (Clean Pill Badges — Luxury Purple & Obsidian) */}
          {skillPositions.map(({ x, y, req, covered }) => {
            const label = formatSkillLabel(req.skill);
            const pillW = 98;
            const pillH = 25;

            return (
              <g key={req.id} transform={`translate(${x},${y})`} filter="url(#nodeShadow)">
                <rect
                  x={-pillW / 2}
                  y={-pillH / 2}
                  width={pillW}
                  height={pillH}
                  rx={pillH / 2}
                  fill={covered ? 'rgba(166, 132, 203, 0.2)' : 'rgba(244, 182, 143, 0.15)'}
                  stroke={covered ? '#C5ADE5' : '#B69BD8'}
                  strokeWidth={req.required ? '1.8' : '1.3'}
                  strokeDasharray={!covered ? '4 2.5' : undefined}
                />
                {/* Status Dot */}
                <circle
                  cx={-pillW / 2 + 10}
                  cy={0}
                  r={3.5}
                  fill={covered ? '#C5ADE5' : '#B69BD8'}
                />
                {/* Skill Name */}
                <text
                  x={4}
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize="9.5"
                  fontFamily="'DM Mono', monospace"
                  fill="var(--sf-accent-text)"
                  fontWeight="700"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Member Avatar Nodes */}
          {memberPositions.map(({ x, y, member, color }, i) => (
            <g key={member.id} transform={`translate(${x},${y})`} filter="url(#nodeShadow)">
              {/* Outer halo ring */}
              <circle r={25} fill="var(--sf-panel)" stroke={color} strokeWidth="2.2" />

              {/* Initials */}
              <text
                textAnchor="middle"
                dy="0.35em"
                fontSize="12"
                fontFamily="'Space Grotesk', sans-serif"
                fill="var(--sf-text)"
                fontWeight="700"
              >
                {member.initials}
              </text>

              {/* Participant Name Badge */}
              <g transform="translate(0, 36)">
                <rect
                  x="-35"
                  y="-8"
                  width="70"
                  height="16"
                  rx="8"
                  fill="rgba(44, 16, 28, 0.9)"
                  stroke="var(--sf-border)"
                />
                <text
                  textAnchor="middle"
                  dy="0.3em"
                  fontSize="8.5"
                  fontFamily="'Inter', sans-serif"
                  fill="var(--sf-secondary)"
                  fontWeight="500"
                >
                  {member.name.split(' ')[0]}
                </text>
              </g>
            </g>
          ))}
        </svg>

        {/* Clean SVG Footer Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 px-3 text-xs border-t border-[var(--sf-border)]/60 bg-[var(--sf-panel)]/95">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-[var(--sf-secondary)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5ADE5] shadow-[0_0_8px_rgba(182,38,77,0.8)]" />
              <span className="font-mono text-[11px] uppercase tracking-wide">Covered Capability</span>
            </span>
            <span className="flex items-center gap-1.5 text-[var(--sf-secondary)]">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-rose-400 bg-rose-500/30" />
              <span className="font-mono text-[11px] uppercase tracking-wide">Uncovered Gap</span>
            </span>
            <span className="flex items-center gap-1.5 text-[var(--sf-secondary)]">
              <Users size={12} className="text-[var(--sf-accent-text)]" />
              <span className="font-mono text-[11px] uppercase tracking-wide">Outer Orbit: Member Nodes</span>
            </span>
          </div>

          <span className="text-[11px] font-mono text-[var(--sf-accent-text)] font-bold">
            {coveredReqIds.size} of {reqSkills.length} matched
          </span>
        </div>
      </div>

      {/* Mobile Roster List */}
      <div className="sm:hidden w-full space-y-3 mt-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Team Members</h4>
        {memberPositions.map(({ member, color }) => (
          <div key={member.id} className="flex items-center gap-3 p-3 bg-surface/80 rounded-xl border border-white/10">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: color + '22', color }}>
              {member.initials}
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{member.name}</p>
              <p className="text-xs text-slate-400">{member.skills.slice(0, 2).map(s => s.name).join(', ')}</p>
            </div>
          </div>
        ))}

        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4 mb-2">Skill Coverage</h4>
        {skillPositions.map(({ req, covered }) => (
          <div key={req.id} className="flex items-center justify-between p-3 bg-surface/80 rounded-xl border border-white/10">
            <span className="text-sm text-ink">{req.skill}</span>
            <span className={`text-xs font-medium ${covered ? 'text-teal' : 'text-rose-400'}`}>
              {covered ? 'Covered' : 'Gap'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
