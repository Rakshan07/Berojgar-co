// ─── Organizer Participant Roster ─────────────────────────────────────────
import { useState, useMemo } from 'react';
import { Search, X, Users } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { Card, Avatar, ProficiencyPips, EmptyState } from '../../components/ui/Card';
import { Badge, SkillTag, categoryColor } from '../../components/ui/Badge';
import { PROFICIENCY_LEVELS } from '../../data/demoData';

export default function ParticipantRosterPage() {
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('all');

  const defaultOrgEventIds = ['ev1', 'ev3', 'ev4'];
  const orgEvents = state.events.filter(e =>
    defaultOrgEventIds.includes(e.id) ||
    e._isNew ||
    (typeof e.id === 'string' && e.id.startsWith('ev-')) ||
    e.organizerId === state.currentUserId ||
    e.organizer?.id === state.currentUserId ||
    e.organizer?.role === 'organizer'
  );
  const orgEventIds = orgEvents.map(e => e.id);

  const registeredParticipants = useMemo(() => {
    const regsByEvent = state.registrations.filter(r =>
      selectedEvent === 'all' ? orgEventIds.includes(r.eventId) : r.eventId === selectedEvent
    );
    const pIds = new Set(regsByEvent.map(r => r.participantId));
    return state.participants
      .filter(p => pIds.has(p.id))
      .map(p => ({
        ...p,
        registrations: state.registrations.filter(r => r.participantId === p.id && orgEventIds.includes(r.eventId)),
      }));
  }, [state.participants, state.registrations, selectedEvent]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return registeredParticipants;
    return registeredParticipants.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.skills || []).some(s => (s.name || '').toLowerCase().includes(q)) ||
      (p.preferredRoles || []).some(r => (r || '').toLowerCase().includes(q))
    );
  }, [registeredParticipants, query]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-heading font-bold text-ink">Participant Roster</h1>
        <p className="text-sm text-ink-secondary mt-1">{filtered.length} participants across your events</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-surface text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-teal transition-colors"
            placeholder="Search by name, skill, or role…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"><X size={14} /></button>}
        </div>
        <select
          className="border border-border rounded-xl px-3 py-2 bg-surface text-sm text-ink focus:outline-none focus:border-teal"
          value={selectedEvent}
          onChange={e => setSelectedEvent(e.target.value)}
        >
          <option value="all">All events</option>
          {orgEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={18} />}
          title="No participants found"
          description="Try adjusting your search."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => (
            <Card key={p.id} padding="sm" className="flex items-start gap-4 flex-wrap">
              <Avatar initials={p.initials} size="md" index={i} />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-ink text-sm">{p.name || 'New Participant'}</span>
                  {p.id === state.currentUserId && (
                    <Badge color="teal" size="xs">You (Active Profile)</Badge>
                  )}
                  {p.evidenceCount > 0 && (
                    <Badge color="cobalt" size="xs">{p.evidenceCount} evidence</Badge>
                  )}
                  {p.registrations.map(r => {
                    const event = state.events.find(e => e.id === r.eventId);
                    return <Badge key={r.eventId} color="ink" size="xs">{event?.title?.slice(0, 20) ?? r.eventId}</Badge>;
                  })}
                </div>
                <p className="text-xs text-ink-secondary">{p.tagline || 'Collaborator in setup'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(p.skills || []).map(s => {
                    const prof = PROFICIENCY_LEVELS.find(l => l.value === s.proficiency);
                    return (
                      <div key={s.id} className="flex items-center gap-1 px-2 py-0.5 bg-paper border border-border rounded text-xs text-ink-secondary">
                        <span>{s.name}</span>
                        <ProficiencyPips level={s.proficiency} max={4} />
                        <span className="text-ink-muted">({prof?.label})</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-muted">
                  <span>⏱ {p.availability.hoursPerWeek}h/wk</span>
                  <span>🌍 {p.availability.timezone}</span>
                  {p.preferredRoles.length > 0 && (
                    <span>Prefers: {p.preferredRoles.slice(0, 2).join(', ')}</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
