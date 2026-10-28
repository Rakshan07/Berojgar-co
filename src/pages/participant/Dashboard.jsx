// ─── Participant Dashboard ────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { Calendar, Users, BookOpen, ArrowRight, Plus, Star, Check } from 'lucide-react';
import { useApp, useCurrentUser } from '../../app/AppContext';
import { Card, SectionHeader, EmptyState, Avatar, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, SkillTag } from '../../components/ui/Badge';
import { EventCard } from '../../components/events/EventCard';
import { PROFICIENCY_LEVELS } from '../../data/demoData';

export default function ParticipantDashboard() {
  const { state } = useApp();
  const user = useCurrentUser();

  const myRegistrations = state.registrations.filter(r => r.participantId === user.id);
  const myEventIds = new Set(myRegistrations.map(r => r.eventId));
  const myEvents = state.events.filter(e => myEventIds.has(e.id));

  const myTeams = state.teams.filter(t => t.members.some(m => m.participantId === user.id));
  const openEvents = state.events.filter(e => e.status === 'open' && !myEventIds.has(e.id)).slice(0, 3);

  const skillCount = user.skills.length;
  const profileComplete = calcCompletion(user);

  const todayChallenge = state.dailyChallenges[0];
  const completedToday = todayChallenge && state.challengeHistory[todayChallenge.id];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar initials={user.initials || 'YOU'} size="lg" index={0} />
          <div>
            <h1 className="text-2xl font-heading font-bold text-ink">
              {user.name?.trim() ? `Welcome back, ${user.name.trim().split(' ')[0]}` : 'Welcome to Skillfy!'}
            </h1>
            <p className="text-sm text-ink-secondary">
              {user.tagline || 'Build your profile so teams and matching engines understand your unique strengths.'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/events"><Button variant="secondary" size="sm" icon={<Calendar size={14} />}>Browse events</Button></Link>
          <Link to="/profile"><Button size="sm" icon={<Plus size={14} />}>{user.skills?.length === 0 ? 'Create profile' : 'Edit profile'}</Button></Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Joined Events" value={myRegistrations.length} color="teal" />
        <StatCard label="Skills Listed" value={skillCount} color="cobalt" />
        <StatCard label="Teams" value={myTeams.length} color="gold" />
        <StatCard label="Daily Streak" value={state.streak} sub="days" color="coral" />
      </div>

      {/* Profile completion */}
      {profileComplete < 100 && (
        <Card className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">Complete your profile</p>
            <p className="text-xs text-ink-muted mt-0.5">A complete profile helps the matching engine find better team fits for you.</p>
            <div className="h-1.5 bg-paper rounded-full overflow-hidden mt-2 max-w-xs">
              <div className="h-full bg-teal rounded-full transition-all" style={{ width: `${profileComplete}%` }} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-heading font-bold text-ink">{profileComplete}%</p>
            <Link to="/profile"><Button size="xs" variant="outline" className="mt-1 gap-1">Complete <ArrowRight size={11} /></Button></Link>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* My Events */}
        <div>
          <SectionHeader
            title="My Events"
            action={<Link to="/events" className="text-xs text-teal hover:underline flex items-center gap-1">All events <ArrowRight size={12} /></Link>}
          />
          {myEvents.length === 0 ? (
            <EmptyState
              icon={<Calendar size={18} />}
              title="No events joined yet"
              description="Browse events and join one to get started."
              action={<Link to="/events"><Button size="sm">Browse events</Button></Link>}
            />
          ) : (
            <div className="space-y-3">
              {myEvents.map(event => (
                <Link key={event.id} to={`/events/${event.id}`} className="block group">
                  <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-card transition-all">
                    <div className="w-10 h-10 rounded-lg bg-teal-pale flex items-center justify-center shrink-0">
                      <Calendar size={16} className="text-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{event.title}</p>
                      <p className="text-xs text-ink-muted">{event.dates.start}</p>
                    </div>
                    <Badge color={event.status === 'open' ? 'teal' : 'ink'} size="xs">{event.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Teams */}
        <div>
          <SectionHeader
            title="My Teams"
            action={<Link to="/my-team" className="text-xs text-teal hover:underline flex items-center gap-1">View teams <ArrowRight size={12} /></Link>}
          />
          {myTeams.length === 0 ? (
            <EmptyState
              icon={<Users size={18} />}
              title="No team assigned yet"
              description="Teams are proposed after event registration closes. Check back soon."
            />
          ) : (
            <div className="space-y-3">
              {myTeams.map(team => {
                const event = state.events.find(e => e.id === team.eventId);
                const hasGap = team.missingRequirements?.some(r => r.required) || team.teamSizeGap;
                return (
                  <Link key={team.id} to="/my-team">
                    <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-card transition-all">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${hasGap ? 'bg-red-50' : 'bg-teal-pale'}`}>
                        <Users size={16} className={hasGap ? 'text-red-500' : 'text-teal'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">{team.name}</p>
                        <p className="text-xs text-ink-muted">{event?.title ?? 'Event'}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge color={team.status === 'published' ? 'teal' : 'cobalt'} size="xs">{team.status}</Badge>
                        {hasGap && <Badge color="red" size="xs">Gaps</Badge>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Skills snapshot */}
      <div>
        <SectionHeader
          title="My Skills"
          action={<Link to="/profile" className="text-xs text-teal hover:underline flex items-center gap-1">Edit skills <ArrowRight size={12} /></Link>}
        />
        {user.skills.length === 0 ? (
          <EmptyState
            icon={<Star size={18} />}
            title="No skills added"
            description="Add your skills to appear in team matching results."
            action={<Link to="/profile"><Button size="sm">Add skills</Button></Link>}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.skills.map(skill => {
              const profLabel = PROFICIENCY_LEVELS.find(l => l.value === skill.proficiency)?.label;
              return (
                <SkillTag key={skill.id} name={skill.name} category={skill.category} proficiency={profLabel} />
              );
            })}
            <Link to="/profile">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-teal border border-dashed border-teal/40 rounded hover:bg-teal-pale transition-colors">
                <Plus size={10} /> Add skill
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Daily Challenge teaser */}
      <Card className="flex items-center gap-4 bg-paper border-gold/30">
        <div className="w-10 h-10 rounded-lg bg-gold-light flex items-center justify-center shrink-0">
          <BookOpen size={16} className="text-gold" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink">Daily Challenge</p>
          <p className="text-xs text-ink-muted flex items-center gap-1">
            {completedToday ? (
              <>
                <Check size={13} className="text-teal" />
                <span>Completed today · streak: {state.streak} days</span>
              </>
            ) : (
              todayChallenge?.question?.slice(0, 60) + '…' ?? 'No challenge today'
            )}
          </p>
        </div>
        <Link to="/challenge">
          <Button variant={completedToday ? 'ghost' : 'primary'} size="sm">
            {completedToday ? 'Review' : 'Answer'}
          </Button>
        </Link>
      </Card>

      {/* Discover Events */}
      {openEvents.length > 0 && (
        <div>
          <SectionHeader
            title="Discover Events"
            subtitle="Open events matching your profile"
            action={<Link to="/events" className="text-xs text-teal hover:underline flex items-center gap-1">All events <ArrowRight size={12} /></Link>}
          />
          <div className="grid sm:grid-cols-3 gap-4">
            {openEvents.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function calcCompletion(user) {
  if (!user) return 0;
  let score = 0;
  const checks = [
    Boolean(user.name?.trim()),
    Boolean(user.bio?.trim()),
    Boolean(user.tagline?.trim()),
    (user.skills?.length ?? 0) >= 3,
    (user.interests?.length ?? 0) > 0,
    (user.preferredRoles?.length ?? 0) > 0,
    Boolean(user.links?.github || user.links?.portfolio || user.links?.linkedin),
  ];
  checks.forEach(c => { if (c) score += Math.round(100 / checks.length); });
  return Math.min(100, score);
}
