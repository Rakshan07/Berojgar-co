// ─── Team Blueprint Component ─────────────────────────────────────────────
// The canonical team detail view used across participant and organizer pages.

import { CheckCircle, AlertCircle, Clock, Users, Info, ArrowRight } from 'lucide-react';
import { Card, Avatar, CoverageBar, ProficiencyPips } from '../ui/Card';
import { Badge, SkillTag } from '../ui/Badge';
import { PROFICIENCY_LEVELS } from '../../data/demoData';

const STATUS_CONFIG = {
  proposed:  { label: 'Proposed', color: 'cobalt', dot: true },
  published: { label: 'Published', color: 'teal', dot: true },
  draft:     { label: 'Draft', color: 'ink', dot: true },
};

export function TeamBlueprint({ team, participants, event, showReasons = true, className = '' }) {
  if (!team) return null;

  const members = team.members
    .map(m => ({ ...m, participant: participants.find(p => p.id === m.participantId) }))
    .filter(m => m.participant);

  const requirements = event?.requirements ?? [];
  const requiredReqs = requirements.filter(r => r.required);
  const preferredReqs = requirements.filter(r => !r.required);

  // Coverage calculation
  const covered = (reqList) => reqList.filter(req => {
    return members.some(({ participant }) => {
      const skill = participant.skills.find(s =>
        s.name.toLowerCase().includes(req.skill.toLowerCase()) ||
        req.skill.toLowerCase().includes(s.name.toLowerCase())
      );
      return skill && skill.proficiency >= req.proficiency;
    });
  }).length;

  const reqCovered = covered(requiredReqs);
  const prefCovered = covered(preferredReqs);

  const status = STATUS_CONFIG[team.status] ?? STATUS_CONFIG.draft;
  const hasGaps = team.missingRequirements?.some(r => r.required) || team.teamSizeGap;

  return (
    <Card className={`space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-heading font-semibold text-ink">{team.name}</h3>
            <Badge color={status.color} dot>{status.label}</Badge>
            {hasGaps && <Badge color="red" dot>Gaps</Badge>}
          </div>
          <p className="text-sm text-ink-secondary">{event?.title ?? 'Event'}</p>
          {team._isGenerated && (
            <p className="text-xs text-ink-muted mt-1 italic">
              ⚡ Demo suggestion — generated from sample data, not a real AI recommendation
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-ink-muted">Team size</p>
          <p className="text-lg font-heading font-bold text-ink">{members.length}</p>
          {event && <p className="text-xs text-ink-muted">{event.teamSize.min}–{event.teamSize.max} needed</p>}
        </div>
      </div>

      {/* Coverage summary */}
      <div className="grid grid-cols-2 gap-3">
        <CoverageBar label="Required skills" covered={reqCovered} total={requiredReqs.length} required />
        <CoverageBar label="Preferred skills" covered={prefCovered} total={preferredReqs.length} />
      </div>

      {/* Members */}
      <div>
        <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Team Members</h4>
        <div className="space-y-2.5">
          {members.map(({ participant, role }, i) => (
            <MemberRow key={participant.id} participant={participant} role={role} requirements={requirements} index={i} />
          ))}
        </div>
        {team.teamSizeGap && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle size={13} />
            Team has {members.length} member{members.length !== 1 ? 's' : ''}; minimum is {event?.teamSize?.min ?? '?'}. Additional participant required.
          </div>
        )}
      </div>

      {/* Missing requirements */}
      {team.missingRequirements?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Capability Gaps</h4>
          <div className="space-y-1.5">
            {team.missingRequirements.map((gap, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${gap.required ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-gold-light border border-gold/20 text-gold'}`}>
                {gap.required ? <AlertCircle size={13} /> : <Info size={13} />}
                <span>{gap.skill}</span>
                <span className="text-xs opacity-70">
                  — {PROFICIENCY_LEVELS.find(l => l.value === gap.proficiency)?.label ?? ''} level needed
                  {gap.required ? ' (required)' : ' (preferred)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coverage notes */}
      {team.coverageNotes?.length > 0 && (
        <details className="group">
          <summary className="text-xs font-semibold text-ink-muted uppercase tracking-wider cursor-pointer hover:text-ink transition-colors list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">›</span>
            Coverage details ({team.coverageNotes.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {team.coverageNotes.map((note, i) => {
              const isGap = note.startsWith('CRITICAL') || note.startsWith('Gap');
              return (
                <li key={i} className={`text-xs flex items-start gap-1.5 ${isGap ? 'text-red-600' : 'text-ink-secondary'}`}>
                  <span className="mt-0.5 shrink-0">{isGap ? '⚠' : '✓'}</span>
                  {note}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {/* Match reasons */}
      {showReasons && team.matchReasons?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Why this team</h4>
          <ul className="space-y-1.5">
            {team.matchReasons.map((reason, i) => (
              <li key={i} className="text-xs text-ink-secondary flex items-start gap-1.5">
                <ArrowRight size={12} className="text-teal mt-0.5 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Proposed date */}
      {team.proposedAt && (
        <p className="text-xs text-ink-muted flex items-center gap-1 border-t border-border pt-3">
          <Clock size={11} />
          {team.status === 'published' && team.publishedAt
            ? `Published ${team.publishedAt}`
            : `Proposed ${team.proposedAt}`}
        </p>
      )}
    </Card>
  );
}

function MemberRow({ participant, role, requirements, index }) {
  // Which requirements does this member cover?
  const covers = requirements.filter(req => {
    const match = participant.skills.find(s =>
      s.name.toLowerCase().includes(req.skill.toLowerCase()) ||
      req.skill.toLowerCase().includes(s.name.toLowerCase())
    );
    return match && match.proficiency >= req.proficiency;
  });

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-paper border border-border">
      <Avatar initials={participant.initials} size="sm" index={index} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-ink">{participant.name}</span>
          <span className="text-xs text-ink-muted">{role}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {participant.skills.slice(0, 4).map(s => (
            <span key={s.id} className="text-xs px-1.5 py-0.5 bg-surface border border-border rounded text-ink-secondary">
              {s.name}
              <span className="text-ink-muted ml-1">
                <ProficiencyPips level={s.proficiency} max={4} />
              </span>
            </span>
          ))}
          {participant.skills.length > 4 && (
            <span className="text-xs text-ink-muted">+{participant.skills.length - 4}</span>
          )}
        </div>
        {covers.length > 0 && (
          <p className="text-xs text-teal mt-1.5 flex items-center gap-1">
            <CheckCircle size={11} />
            Covers: {covers.map(r => r.skill).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
