// ─── Organizer Events List (simple view) ─────────────────────────────────
// Reuses the same event list concept focused on organizer-owned events.
import { Link } from 'react-router-dom';
import { Plus, Calendar, Users, ArrowRight } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { Card, SectionHeader, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export default function OrganizerEventsPage() {
  const { state, dispatch } = useApp();
  const defaultOrgEventIds = ['ev1', 'ev3', 'ev4'];
  const myEvents = state.events.filter(e =>
    defaultOrgEventIds.includes(e.id) ||
    e._isNew ||
    (typeof e.id === 'string' && e.id.startsWith('ev-')) ||
    e.organizerId === state.currentUserId ||
    e.organizer?.id === state.currentUserId ||
    e.organizer?.role === 'organizer'
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink">My Events</h1>
          <p className="text-sm text-ink-secondary mt-1">{myEvents.length} events</p>
        </div>
        <Link to="/organizer/create">
          <Button size="sm" icon={<Plus size={14} />}>New event</Button>
        </Link>
      </div>

      {myEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar size={18} />}
          title="No events yet"
          description="Create your first event to start forming teams."
          action={<Link to="/organizer/create"><Button size="sm">Create event</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {myEvents.map(event => {
            const regCount = state.registrations.filter(r => r.eventId === event.id).length;
            const teamCount = state.teams.filter(t => t.eventId === event.id).length;
            return (
              <Card key={event.id} padding="sm">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-10 h-10 bg-cobalt-light rounded-lg flex items-center justify-center shrink-0">
                    <Calendar size={16} className="text-cobalt" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-ink">{event.title}</p>
                      <Badge color={event.status === 'open' ? 'teal' : 'ink'}>{event.status}</Badge>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {event.dates.start} · {regCount} participants · {teamCount} team{teamCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link to="/organizer/roster">
                      <Button variant="ghost" size="xs" icon={<Users size={12} />}>Roster</Button>
                    </Link>
                    <Link to="/organizer/teams" onClick={() => dispatch({ type: 'SET_ORGANIZER_EVENT', payload: event.id })}>
                      <Button variant="secondary" size="xs" className="gap-1">Manage teams <ArrowRight size={11} /></Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
