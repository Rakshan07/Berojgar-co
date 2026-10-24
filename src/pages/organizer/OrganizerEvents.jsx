// ─── Organizer Events List (simple view) ─────────────────────────────────
// Reuses the same event list concept focused on organizer-owned events.
import { Link } from 'react-router-dom';
import { Plus, Calendar, Users, ArrowRight, Edit2, Trash2, RotateCcw } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { Card, SectionHeader, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';

export default function OrganizerEventsPage() {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const defaultOrgEventIds = ['ev1', 'ev3', 'ev4'];
  const myEvents = state.events.filter(e =>
    defaultOrgEventIds.includes(e.id) ||
    e._isNew ||
    (typeof e.id === 'string' && e.id.startsWith('ev-')) ||
    e.organizerId === state.currentUserId ||
    e.organizer?.id === state.currentUserId ||
    e.organizer?.role === 'organizer'
  );

  async function handleDeleteEvent(eventId, title) {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    dispatch({ type: 'DELETE_EVENT', payload: eventId });
    try {
      const token = localStorage.getItem('teamweave_token');
      await fetch(`http://localhost:8000/api/v1/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-User-Id': state?.currentUserId || 'asel',
        },
      });
    } catch {}
    toast.success('Event deleted');
  }

  function handleClearCustomEvents() {
    if (!window.confirm('Clear all events you have added and reset to clean initial demo events?')) return;
    dispatch({ type: 'CLEAR_CUSTOM_EVENTS' });
    toast.success('All added events cleared');
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink">My Events</h1>
          <p className="text-sm text-ink-secondary mt-1">{myEvents.length} events</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={13} />}
            onClick={handleClearCustomEvents}
            title="Reset to clean initial events"
          >
            Clear added events
          </Button>
          <Link to="/organizer/create">
            <Button size="sm" icon={<Plus size={14} />}>New event</Button>
          </Link>
        </div>
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
                      {event.dates?.start || event.start_date || 'Upcoming'} · {regCount} participants · {teamCount} team{teamCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 items-center flex-wrap">
                    <Link to={`/organizer/create?edit=${event.id}`}>
                      <Button variant="ghost" size="xs" icon={<Edit2 size={12} />}>Edit</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                      icon={<Trash2 size={12} />}
                      onClick={() => handleDeleteEvent(event.id, event.title)}
                    >
                      Delete
                    </Button>
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
