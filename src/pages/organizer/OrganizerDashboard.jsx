import { Link } from 'react-router-dom';
import { Calendar, Users, AlertCircle, Plus, ArrowRight, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { Card, SectionHeader, StatCard, EmptyState } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { BrandWordmark } from '../../components/ui/BrandMark';
import { useToast } from '../../hooks/useToast';

export default function OrganizerDashboard() {
  const { state, dispatch } = useApp();
  const toast = useToast();

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

  // In demo mode, the organizer owns default events + any newly created events
  const defaultOrgEventIds = ['ev1', 'ev3', 'ev4'];
  const myEvents = state.events.filter(e =>
    defaultOrgEventIds.includes(e.id) ||
    e._isNew ||
    (typeof e.id === 'string' && e.id.startsWith('ev-')) ||
    e.organizerId === state.currentUserId ||
    e.organizer?.id === state.currentUserId ||
    e.organizer?.role === 'organizer'
  );
  const myEventIds = myEvents.map(e => e.id);

  const totalParticipants = myEvents.reduce((acc, e) => {
    const count = state.registrations.filter(r => r.eventId === e.id).length;
    return acc + count;
  }, 0);

  const openEvents = myEvents.filter(e => e.status === 'open').length;
  const teamsProposed = state.teams.filter(t => myEventIds.includes(t.eventId) && t.status === 'proposed').length;
  const teamsPublished = state.teams.filter(t => myEventIds.includes(t.eventId) && t.status === 'published').length;

  // Events needing attention
  const needAttention = myEvents.filter(e => {
    const hasGapTeam = state.teams.some(t => t.eventId === e.id && (t.teamSizeGap || t.missingRequirements?.some(r => r.required)));
    const noTeams = !state.teams.some(t => t.eventId === e.id) && e.status === 'open';
    return hasGapTeam || noTeams;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cobalt" />
            <span className="text-xs font-medium text-cobalt uppercase tracking-wider">Organizer workspace</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-ink">Organizer Dashboard</h1>
          <p className="text-sm text-ink-secondary">Demo organizer account — managing {myEvents.length} events</p>
        </div>
        <Link to="/organizer/create">
          <Button icon={<Plus size={15} />}>Create event</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="My Events" value={myEvents.length} color="cobalt" />
        <StatCard label="Participants" value={totalParticipants} color="teal" />
        <StatCard label="Teams Proposed" value={teamsProposed} color="gold" />
        <StatCard label="Teams Published" value={teamsPublished} color="teal" />
      </div>

      {/* Needs attention */}
      {needAttention.length > 0 && (
        <Card className="border-gold/30 bg-gold-light/40">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={15} className="text-gold" />
            <h2 className="text-sm font-semibold text-ink">Needs attention</h2>
          </div>
          <div className="space-y-2">
            {needAttention.map(event => (
              <Link key={event.id} to="/organizer/teams">
                <div className="flex items-center gap-3 p-3 bg-surface border border-gold/20 rounded-lg hover:border-gold/40 transition-colors">
                  <AlertCircle size={14} className="text-gold shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{event.title}</p>
                    <p className="text-xs text-ink-muted">
                      {state.teams.some(t => t.eventId === event.id)
                        ? 'Team has capability gaps'
                        : 'No teams generated yet'}
                    </p>
                  </div>
                  <ArrowRight size={13} className="text-ink-muted shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Events */}
      <div>
        <SectionHeader
          title="My Events"
          action={<Link to="/organizer/events" className="text-xs text-teal hover:underline flex items-center gap-1">All events <ArrowRight size={12} /></Link>}
        />
        {myEvents.length === 0 ? (
          <EmptyState
            icon={<Calendar size={18} />}
            title="No events yet"
            description="Create your first event to get started."
            action={<Link to="/organizer/create"><Button size="sm" icon={<Plus size={13} />}>Create event</Button></Link>}
          />
        ) : (
          <div className="space-y-3">
            {myEvents.map(event => {
              const regCount = state.registrations.filter(r => r.eventId === event.id).length;
              const eventTeams = state.teams.filter(t => t.eventId === event.id);
              const publishedTeams = eventTeams.filter(t => t.status === 'published');
              return (
                <div key={event.id} className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-card transition-all">
                  <div className="w-10 h-10 rounded-lg bg-cobalt-light flex items-center justify-center shrink-0">
                    <Calendar size={16} className="text-cobalt" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{event.title}</p>
                    <p className="text-xs text-ink-muted">{regCount} participants · {event.dates.start}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge color={event.status === 'open' ? 'teal' : 'ink'}>{event.status}</Badge>
                    {eventTeams.length > 0 && (
                      <span className="text-xs text-ink-muted">
                        {publishedTeams.length}/{eventTeams.length} teams published
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <Link to={`/organizer/create?edit=${event.id}`}>
                      <Button variant="ghost" size="xs" icon={<Edit2 size={11} />}>Edit</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                      icon={<Trash2 size={11} />}
                      onClick={() => handleDeleteEvent(event.id, event.title)}
                    >
                      Delete
                    </Button>
                    <Link to="/organizer/teams" onClick={() => dispatch({ type: 'SET_ORGANIZER_EVENT', payload: event.id })}>
                      <Button variant="ghost" size="xs" className="gap-1">Manage <ArrowRight size={11} /></Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-3">
        <QuickAction to="/organizer/create" icon={<Plus size={16} />} title="Create event" desc="Set up a new event with requirements" color="cobalt" />
        <QuickAction to="/organizer/roster" icon={<Users size={16} />} title="View roster" desc="Browse all registered participants" color="teal" />
        <QuickAction to="/organizer/teams" icon={<Users size={16} />} title="Form teams" desc="Generate and review team suggestions" color="gold" />
      </div>
    </div>
  );
}

function QuickAction({ to, icon, title, desc, color }) {
  const colors = { cobalt: 'bg-cobalt-light text-cobalt', teal: 'bg-teal-light text-teal-dark', gold: 'bg-gold-light text-gold' };
  return (
    <Link to={to} className="block group">
      <div className="p-4 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-card transition-all">
        <div className={`w-9 h-9 rounded-lg ${colors[color] ?? 'bg-paper text-ink-muted'} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <p className="text-sm font-semibold text-ink group-hover:text-teal-dark transition-colors">{title}</p>
        <p className="text-xs text-ink-muted mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}
