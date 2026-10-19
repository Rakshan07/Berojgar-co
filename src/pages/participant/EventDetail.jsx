// ─── Event Detail & Join Page ─────────────────────────────────────────────
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useApp, useCurrentUser, useIsRegistered } from '../../app/AppContext';
import { Card, EmptyState, Avatar, ProficiencyPips, ConfirmDialog } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, SkillTag, categoryColor } from '../../components/ui/Badge';
import { PROFICIENCY_LEVELS, EVENT_CATEGORIES } from '../../data/demoData';
import { useToast } from '../../hooks/useToast';
import { Link } from 'react-router-dom';
import PeekRating from '../../components/ui/PeekRating';

const MODE_LABEL = { hybrid: 'Hybrid', 'in-person': 'In-person', remote: 'Remote' };

export default function EventDetailPage() {
  const { eventId } = useParams();
  const { state, dispatch } = useApp();
  const user = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [availNote, setAvailNote] = useState('');

  const event = state.events.find(e => e.id === eventId);
  const registered = useIsRegistered(user.id, eventId);
  const catMeta = event ? EVENT_CATEGORIES.find(c => c.id === event.category) : null;

  if (!event) {
    return (
      <EmptyState
        icon={<Calendar size={18} />}
        title="Event not found"
        description="This event may have been removed."
        action={<Link to="/events"><Button size="sm">Back to events</Button></Link>}
      />
    );
  }

  const isClosed = event.status === 'closed' || event.registeredCount >= event.maxParticipants;
  const mySkillNames = new Set(user.skills.map(s => s.name.toLowerCase()));

  function getSkillStatus(req) {
    const match = user.skills.find(s =>
      s.name.toLowerCase().includes(req.skill.toLowerCase()) ||
      req.skill.toLowerCase().includes(s.name.toLowerCase())
    );
    if (!match) return { status: 'missing', label: 'Not in your profile' };
    if (match.proficiency >= req.proficiency) return { status: 'met', label: `Your ${PROFICIENCY_LEVELS.find(l => l.value === match.proficiency)?.label} level meets this` };
    return { status: 'partial', label: `You have this skill but at ${PROFICIENCY_LEVELS.find(l => l.value === match.proficiency)?.label} level` };
  }

  function handleJoin() {
    dispatch({ type: 'REGISTER', payload: { participantId: user.id, eventId: event.id } });
    setJoinOpen(false);
    toast.success(`You've joined ${event.title}`);
  }

  function handleLeave() {
    dispatch({ type: 'UNREGISTER', payload: { participantId: user.id, eventId: event.id } });
    setLeaveOpen(false);
    toast.info(`You've left ${event.title}`);
  }

  const requiredReqs = event.requirements.filter(r => r.required);
  const preferredReqs = event.requirements.filter(r => !r.required);
  const missingRequired = requiredReqs.filter(r => getSkillStatus(r).status === 'missing');

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fadeIn">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink transition-colors">
        <ArrowLeft size={14} /> Back to events
      </Link>

      {/* Hero card */}
      <Card padding="lg">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div className="flex gap-2 flex-wrap">
            <Badge color={catMeta?.color ?? 'ink'}>{catMeta?.label ?? event.category}</Badge>
            {registered && <Badge color="teal" dot>Joined</Badge>}
            {isClosed && !registered && <Badge color="ink">Registration closed</Badge>}
          </div>
        </div>

        <h1 className="text-2xl font-heading font-bold text-ink mb-2">{event.title}</h1>
        <p className="text-ink-secondary leading-relaxed mb-4">{event.description}</p>

        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <InfoRow icon={<Calendar size={14} />} label="Dates" value={`${event.dates.start} – ${event.dates.end}`} />
          <InfoRow icon={<MapPin size={14} />} label="Mode" value={`${MODE_LABEL[event.mode]} · ${event.location}`} />
          <InfoRow icon={<Users size={14} />} label="Team size" value={`${event.teamSize.min}–${event.teamSize.max} people`} />
          {event.dates.registrationDeadline && (
            <InfoRow icon={<Clock size={14} />} label="Register by" value={event.dates.registrationDeadline} />
          )}
          <InfoRow icon={<Users size={14} />} label="Organizer" value={event.organizer.name} />
        </div>

        {/* Registration bar */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between text-xs text-ink-muted mb-1.5">
            <span>{event.registeredCount} registered</span>
            <span>{event.maxParticipants} total spots</span>
          </div>
          <div className="h-1.5 bg-paper rounded-full overflow-hidden">
            <div
              className="h-full bg-teal rounded-full transition-all"
              style={{ width: `${Math.min(100, (event.registeredCount / event.maxParticipants) * 100)}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5 flex gap-3 flex-wrap">
          {registered ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setLeaveOpen(true)}>Leave event</Button>
              <Link to="/my-team"><Button size="sm" className="gap-1.5">View my team <ArrowRight size={13} /></Button></Link>
            </>
          ) : isClosed ? (
            <Button disabled>Registration closed</Button>
          ) : (
            <Button size="md" onClick={() => setJoinOpen(true)}>Join this event</Button>
          )}
        </div>
      </Card>

      {/* Requirements vs your profile */}
      <Card>
        <h2 className="text-base font-heading font-semibold text-ink mb-1">Skills & requirements</h2>
        <p className="text-xs text-ink-muted mb-4">Compared against your current profile. Skills not listed here won't affect eligibility.</p>

        {requiredReqs.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Required</h3>
            <div className="space-y-2 mb-4">
              {requiredReqs.map(req => {
                const { status, label } = getSkillStatus(req);
                const profLabel = PROFICIENCY_LEVELS.find(l => l.value === req.proficiency)?.label ?? '';
                return (
                  <div key={req.id} className={`flex items-center gap-3 p-3 rounded-lg border ${status === 'met' ? 'bg-teal-pale border-teal/20' : status === 'partial' ? 'bg-gold-light border-gold/20' : 'bg-paper border-border'}`}>
                    {status === 'met' ? <CheckCircle size={14} className="text-teal shrink-0" />
                      : status === 'partial' ? <AlertCircle size={14} className="text-gold shrink-0" />
                        : <span className="w-3.5 h-3.5 rounded-full border-2 border-border-strong shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{req.skill}</span>
                        <Badge color="ink" size="xs">{req.category}</Badge>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">{profLabel} level needed · {label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {preferredReqs.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Preferred (not eliminatory)</h3>
            <div className="space-y-2">
              {preferredReqs.map(req => {
                const { status, label } = getSkillStatus(req);
                const profLabel = PROFICIENCY_LEVELS.find(l => l.value === req.proficiency)?.label ?? '';
                return (
                  <div key={req.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-paper">
                    {status === 'met' ? <CheckCircle size={13} className="text-teal shrink-0" /> : <span className="w-3 h-3 rounded-full border border-border-strong shrink-0" />}
                    <div>
                      <span className="text-sm text-ink">{req.skill}</span>
                      <span className="text-xs text-ink-muted ml-2">{profLabel} · {label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {missingRequired.length > 0 && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-paper border border-border rounded-lg text-xs text-ink-secondary">
            <AlertCircle size={13} className="text-gold shrink-0 mt-0.5" />
            You're missing {missingRequired.length} required skill{missingRequired.length > 1 ? 's' : ''}
            ({missingRequired.map(r => r.skill).join(', ')}), but this doesn't automatically prevent you from joining unless the event has an explicit eligibility restriction.
          </div>
        )}
      </Card>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {event.tags.map(tag => (
          <Badge key={tag} color="ink" size="xs">#{tag}</Badge>
        ))}
      </div>

      {/* Event Alignment Rating */}
      <Card padding="md" className="border border-border/80 bg-surface/70">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-heading font-semibold text-ink">Rate event requirement alignment</h4>
            <p className="text-xs text-ink-muted">How well do you feel this event's skill blueprint matches your background?</p>
          </div>
          <PeekRating
            defaultValue={4}
            count={5}
            shape="star"
            labels={['Poor', 'Fair', 'Good', 'Great', 'Superb']}
            activeColor="#f5b400"
            idleColor="#52525b"
            tipColor="#27272a"
            tipTextColor="#f5f5f5"
            size={32}
            lift={6}
            magnify={1.15}
            riseDuration={320}
            popScale={1.3}
            showTip
            allowClear
            onChange={value => toast.info(`Event feedback rating: ${value}/5`)}
            showLabels
            readOnly={false}
          />
        </div>
      </Card>

      {/* Join modal */}
      {joinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setJoinOpen(false)} />
          <div className="relative bg-surface border border-border rounded-2xl shadow-modal w-full max-w-md p-6 animate-scaleIn">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-heading font-semibold">Join {event.title}</h3>
              <button onClick={() => setJoinOpen(false)} className="text-ink-muted hover:text-ink"><X size={16} /></button>
            </div>

            <div className="space-y-3 mb-5">
              <p className="text-sm text-ink-secondary">Your profile will be shared with the organizer for team matching. Existing skills don't need to be re-entered.</p>

              {/* Only ask for event-specific availability */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-secondary uppercase tracking-wide">
                  Anything the organizer should know about your availability for this event? (optional)
                </label>
                <textarea
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-paper focus:outline-none focus:border-teal resize-none"
                  rows={3}
                  value={availNote}
                  onChange={e => setAvailNote(e.target.value)}
                  placeholder="e.g. unavailable on Nov 15 afternoon"
                />
              </div>

              {/* Profile preview */}
              <div className="bg-paper border border-border rounded-lg p-3 text-xs text-ink-secondary space-y-1">
                <p className="font-medium text-ink">What will be shared:</p>
                <p>Name: {user.name}</p>
                <p>Skills: {user.skills.map(s => s.name).join(', ')}</p>
                <p>Availability: {user.availability.hoursPerWeek}h/week, {user.availability.timezone}</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setJoinOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleJoin}>Confirm registration</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={leaveOpen}
        title="Leave event"
        description={`Are you sure you want to leave ${event.title}? Your registration will be removed.`}
        confirmLabel="Leave event"
        danger
        onConfirm={handleLeave}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-ink-muted mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="text-sm text-ink font-medium">{value}</p>
      </div>
    </div>
  );
}
