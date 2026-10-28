// ─── Event Detail & Join Page with AI Teaming Intake ───────────────────────
import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar, MapPin, Users, Clock, CheckCircle, AlertCircle, ArrowLeft,
  ArrowRight, X, Edit2, Trash2, Sparkles, Check, ChevronRight, RefreshCw, UserCheck
} from 'lucide-react';
import { useApp, useCurrentUser, useIsRegistered } from '../../app/AppContext';
import { Card, EmptyState, Avatar, ProficiencyPips, ConfirmDialog } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, SkillTag, categoryColor } from '../../components/ui/Badge';
import { PROFICIENCY_LEVELS, EVENT_CATEGORIES } from '../../data/demoData';
import { useToast } from '../../hooks/useToast';
import PeekRating from '../../components/ui/PeekRating';
import {
  generateSkillIntakeQuestions,
  PERSONALITY_QUESTIONS,
  calculateTeamCompatibility
} from '../../services/compatibilityService';

const MODE_LABEL = { hybrid: 'Hybrid', 'in-person': 'In-person', remote: 'Remote' };

export default function EventDetailPage() {
  const { eventId } = useParams();
  const { state, dispatch } = useApp();
  const user = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();

  // Modals & Navigation state
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [availNote, setAvailNote] = useState('');

  // AI Intake & Team Matching modal state
  const [showTeamingModal, setShowTeamingModal] = useState(false);
  const [intakeStep, setIntakeStep] = useState('skills'); // 'skills' | 'personality' | 'calculating' | 'teams'
  const [intakeAnswers, setIntakeAnswers] = useState({
    p_comm: 'cadence',
    p_crunch: 'scope_down',
    p_ambition: 'podium',
  });

  const event = state.events.find(e => e.id === eventId);
  const registered = useIsRegistered(user.id, eventId);
  const catMeta = event ? EVENT_CATEGORIES.find(c => c.id === event.category) : null;

  // Find user's active team for this event if any
  const myTeam = useMemo(() => {
    if (!event) return null;
    return state.teams.find(t => t.eventId === event.id && t.members.some(m => m.participantId === user.id));
  }, [state.teams, event, user.id]);

  // Skill-based questions tailored to user's profile
  const skillQuestions = useMemo(() => {
    return generateSkillIntakeQuestions(user.skills || []);
  }, [user.skills]);

  // Candidate teams for this event
  const eventTeams = useMemo(() => {
    if (!event) return [];
    const directTeams = state.teams.filter(t => t.eventId === event.id);
    if (directTeams.length > 0) return directTeams;

    // Fallback template teams if none created yet
    return [
      {
        id: `tm-suggested-1`,
        eventId: event.id,
        name: `${event.title.split(' ')[0]} Alpha`,
        status: 'proposed',
        members: [
          { participantId: 'p2', role: 'Backend Lead' },
          { participantId: 'p3', role: 'Product Designer' },
        ],
      },
      {
        id: `tm-suggested-2`,
        eventId: event.id,
        name: `${event.title.split(' ')[0]} Labs`,
        status: 'proposed',
        members: [
          { participantId: 'p4', role: 'Data / AI Engineer' },
          { participantId: 'p6', role: 'Visual Designer' },
        ],
      },
    ];
  }, [state.teams, event]);

  // Computed team compatibility rankings
  const rankedTeams = useMemo(() => {
    if (!event) return [];
    return eventTeams.map(team => {
      const match = calculateTeamCompatibility({
        user,
        userSkills: user.skills || [],
        intakeAnswers,
        team,
        event,
        allParticipants: state.participants,
      });
      return { team, ...match };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [eventTeams, user, intakeAnswers, event, state.participants]);

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
    toast.success(`Registered for ${event.title}! Let's find your compatible team.`);
    // Automatically launch teaming intake
    setIntakeStep('skills');
    setShowTeamingModal(true);
  }

  function handleLeave() {
    dispatch({ type: 'UNREGISTER', payload: { participantId: user.id, eventId: event.id } });
    if (myTeam) {
      dispatch({ type: 'LEAVE_TEAM', payload: { teamId: myTeam.id, participantId: user.id } });
    }
    setLeaveOpen(false);
    toast.info(`You've left ${event.title}`);
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete "${event.title}"?`)) return;
    dispatch({ type: 'DELETE_EVENT', payload: event.id });
    try {
      const token = localStorage.getItem('teamweave_token');
      await fetch(`http://localhost:8000/api/v1/events/${event.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-User-Id': state?.currentUserId || 'user-me',
        },
      });
    } catch {}
    toast.success('Event deleted');
    navigate('/organizer/events');
  }

  function handleSelectOption(questionId, optionId) {
    setIntakeAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }

  function handleRunCompatibility() {
    setIntakeStep('calculating');
    setTimeout(() => {
      setIntakeStep('teams');
    }, 600);
  }

  function handleJoinTeam(teamId, role) {
    if (!registered) {
      dispatch({ type: 'REGISTER', payload: { participantId: user.id, eventId: event.id } });
    }
    dispatch({
      type: 'JOIN_TEAM',
      payload: { teamId, participantId: user.id, role: role || 'Contributor' },
    });
    const selectedTeam = state.teams.find(t => t.id === teamId) || eventTeams.find(t => t.id === teamId);
    toast.success(`You've joined ${selectedTeam?.name || 'the team'} as ${role || 'Contributor'}!`);
    setShowTeamingModal(false);
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
          <div className="flex gap-2 flex-wrap items-center">
            <Badge color={catMeta?.color ?? 'ink'}>{catMeta?.label ?? event.category}</Badge>
            {registered && <Badge color="teal" dot>Registered</Badge>}
            {myTeam && <Badge color="purple">Team: {myTeam.name}</Badge>}
            {isClosed && !registered && <Badge color="ink">Registration closed</Badge>}
          </div>

          {state?.currentRole === 'organizer' && (
            <div className="flex items-center gap-2">
              <Link to={`/organizer/create?edit=${event.id}`}>
                <Button variant="secondary" size="xs" icon={<Edit2 size={12} />}>Edit event</Button>
              </Link>
              <Button
                variant="ghost"
                size="xs"
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                icon={<Trash2 size={12} />}
                onClick={handleDelete}
              >
                Delete event
              </Button>
            </div>
          )}
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

        {/* My Team Preview Banner if already joined a team */}
        {myTeam && (
          <div className="mt-5 p-3.5 bg-surface border border-teal/30 rounded-xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal/15 text-teal border border-teal/20 flex items-center justify-center font-bold text-sm">
                {myTeam.name[0]}
              </div>
              <div>
                <p className="text-xs text-ink-muted font-medium uppercase tracking-wider">Your Assigned Team</p>
                <p className="text-sm font-semibold text-ink">
                  {myTeam.name}
                  <span className="text-xs font-normal text-teal ml-2">
                    ({myTeam.members.find(m => m.participantId === user.id)?.role || 'Member'})
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setIntakeStep('teams');
                  setShowTeamingModal(true);
                }}
              >
                Change team
              </Button>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-5 flex gap-3 flex-wrap items-center">
          {registered ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setLeaveOpen(true)}>Leave event</Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Sparkles size={13} className="text-teal" />}
                onClick={() => {
                  setIntakeStep('skills');
                  setShowTeamingModal(true);
                }}
              >
                {myTeam ? 'Explore team matches' : 'Find compatible teams'}
              </Button>
              <Link to="/my-team">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-ink bg-red-700 hover:bg-red-800 rounded-full shadow-sm transition-all cursor-pointer"
                >
                  View my team <ArrowRight size={14} />
                </button>
              </Link>
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

      {/* Registration Modal */}
      {joinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setJoinOpen(false)} />
          <div className="relative bg-surface border border-border rounded-2xl shadow-modal w-full max-w-md p-6 animate-scaleIn">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-heading font-semibold">Join {event.title}</h3>
              <button onClick={() => setJoinOpen(false)} className="text-ink-muted hover:text-ink"><X size={16} /></button>
            </div>

            <div className="space-y-3 mb-5">
              <p className="text-sm text-ink-secondary">
                You're about to register for this event. Next, you will answer a brief intake questionnaire to calculate compatibility and pick a team!
              </p>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-secondary uppercase tracking-wide">
                  Availability notes (optional)
                </label>
                <textarea
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-paper focus:outline-none focus:border-teal resize-none"
                  rows={2}
                  value={availNote}
                  onChange={e => setAvailNote(e.target.value)}
                  placeholder="e.g. available weekends, timezone UTC-4"
                />
              </div>

              {/* Profile summary */}
              <div className="bg-paper border border-border rounded-lg p-3 text-xs text-ink-secondary space-y-1">
                <p className="font-medium text-ink">Participant Profile:</p>
                <p>Name: {user.name}</p>
                <p>Verified Skills: {user.skills?.map(s => s.name).join(', ') || 'No skills added yet'}</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setJoinOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleJoin}>Confirm & Find Teams</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI Teaming Intake & Compatible Teams Modal ──────────────────────── */}
      {showTeamingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowTeamingModal(false)} />
          <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-scaleIn">

            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border mb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-teal/15 text-teal"><Sparkles size={16} /></span>
                  <h3 className="text-lg font-heading font-bold text-ink">
                    {intakeStep === 'teams' ? 'Compatible Teams You Can Join' : 'AI Teaming Intake'}
                  </h3>
                </div>
                <p className="text-xs text-ink-muted">
                  {intakeStep === 'skills' && 'Step 1 of 2: Practical contribution focus based on your skills (non-technical).'}
                  {intakeStep === 'personality' && 'Step 2 of 2: Collaboration rhythm, blocker handling, and event ambition.'}
                  {intakeStep === 'calculating' && 'Calculating 4-factor compatibility scores across available teams...'}
                  {intakeStep === 'teams' && 'Ranked by skill complementarity, communication harmony, ambition, and open spots.'}
                </p>
              </div>
              <button
                onClick={() => setShowTeamingModal(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-paper cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step 1: Practical Contribution Questions (Skill-based, non-technical) */}
            {intakeStep === 'skills' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-3 bg-paper border border-border rounded-xl text-xs text-ink-secondary flex items-center gap-2">
                  <Sparkles size={14} className="text-teal shrink-0" />
                  <span>
                    Questions are tailored to your profile skills: <strong>{user.skills?.map(s => s.name).slice(0, 3).join(', ') || 'General'}</strong>. Select the contribution style you enjoy most.
                  </span>
                </div>

                <div className="space-y-5">
                  {skillQuestions.map((q, idx) => (
                    <div key={q.id} className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-paper border border-border text-[11px] font-bold flex items-center justify-center text-ink">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-semibold text-ink">{q.title}</h4>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        {q.options.map(opt => {
                          const isSelected = intakeAnswers[q.id] === opt.id || (!intakeAnswers[q.id] && opt.id === q.options[0].id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectOption(q.id, opt.id)}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'border-teal bg-teal/10 shadow-sm'
                                  : 'border-border bg-paper hover:border-border-strong hover:bg-paper/70'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-semibold ${isSelected ? 'text-teal' : 'text-ink'}`}>
                                    {opt.label}
                                  </span>
                                  {isSelected && <Check size={14} className="text-teal shrink-0" />}
                                </div>
                                <p className="text-[11px] text-ink-muted leading-relaxed">{opt.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="text-xs text-ink-muted">Step 1 of 2</span>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setIntakeStep('personality')}
                  >
                    Next: Personality & Style <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Personality & Collaboration (1 to 3 Questions) */}
            {intakeStep === 'personality' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-5">
                  {PERSONALITY_QUESTIONS.map((q, idx) => (
                    <div key={q.id} className="space-y-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-paper border border-border text-[11px] font-bold flex items-center justify-center text-ink">
                            {idx + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-ink">{q.title}</h4>
                        </div>
                        <p className="text-xs text-ink-muted ml-7">{q.subtitle}</p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 ml-7">
                        {q.options.map(opt => {
                          const isSelected = intakeAnswers[q.id] === opt.id || (!intakeAnswers[q.id] && opt.id === q.options[0].id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectOption(q.id, opt.id)}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'border-teal bg-teal/10 shadow-sm'
                                  : 'border-border bg-paper hover:border-border-strong hover:bg-paper/70'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-semibold ${isSelected ? 'text-teal' : 'text-ink'}`}>
                                    {opt.label}
                                  </span>
                                  {isSelected && <Check size={14} className="text-teal shrink-0" />}
                                </div>
                                <p className="text-[11px] text-ink-muted leading-relaxed">{opt.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => setIntakeStep('skills')}>
                    Back
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-teal hover:bg-teal-600 text-ink font-semibold"
                    onClick={handleRunCompatibility}
                  >
                    Calculate Compatibility & View Teams <Sparkles size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Calculating Simulation */}
            {intakeStep === 'calculating' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 animate-fadeIn">
                <RefreshCw size={28} className="text-teal animate-spin" />
                <h4 className="text-sm font-semibold text-ink">Evaluating Team Compatibility</h4>
                <p className="text-xs text-ink-muted max-w-sm">
                  Correlating your skills against team requirement gaps, collaboration styles, and open vacancies...
                </p>
              </div>
            )}

            {/* Step 4: List of Teams He or She Can Join */}
            {intakeStep === 'teams' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between text-xs text-ink-muted pb-1">
                  <span>Found {rankedTeams.length} teams in {event.title}</span>
                  <button
                    onClick={() => setIntakeStep('skills')}
                    className="text-teal hover:underline cursor-pointer"
                  >
                    Adjust preferences
                  </button>
                </div>

                <div className="space-y-3">
                  {rankedTeams.map(({ team, overallScore, synergyTier, tierBadgeColor, proposedRole, roleType, isFullStack, roleOverlapWarning, spotsLeft, isFull, highlights }) => {
                    const isMyCurrentTeam = myTeam?.id === team.id;
                    const members = team.members || [];
                    const isRedundant = roleType === 'redundant';

                    return (
                      <div
                        key={team.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isMyCurrentTeam
                            ? 'bg-teal/5 border-teal/40'
                            : isRedundant
                              ? 'bg-paper border-rose-500/30'
                              : 'bg-surface border-border hover:border-teal/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-heading font-bold text-ink">{team.name}</h4>
                              <Badge color={tierBadgeColor} size="xs">{overallScore}% · {synergyTier}</Badge>
                              {isMyCurrentTeam && <Badge color="teal" size="xs">Your Team</Badge>}
                              {roleType === 'gap_fill' && (
                                <Badge color="teal" size="xs">⭐ Critical Role Needed</Badge>
                              )}
                              {roleType === 'fullstack_flex' && (
                                <Badge color="purple" size="xs">⚡ Full-Stack Flex</Badge>
                              )}
                              {isRedundant && (
                                <Badge color="coral" size="xs">⚠️ Role Overlap</Badge>
                              )}
                            </div>
                            <p className="text-xs text-ink-muted">
                              Proposed Role: <strong className={isRedundant ? 'text-coral font-semibold' : 'text-teal font-semibold'}>{proposedRole}</strong> · {spotsLeft} open spot{spotsLeft !== 1 ? 's' : ''} ({members.length}/{event.teamSize.max} members)
                            </p>
                          </div>

                          <div>
                            {isMyCurrentTeam ? (
                              <Link to="/my-team">
                                <Button size="xs" variant="secondary" className="gap-1">
                                  Open Workspace <ArrowRight size={12} />
                                </Button>
                              </Link>
                            ) : isFull ? (
                              <Button size="xs" disabled>Team Full</Button>
                            ) : (
                              <Button
                                size="sm"
                                className={isRedundant ? "bg-slate-700 hover:bg-slate-600 text-ink font-medium" : "bg-red-700 hover:bg-red-800 text-ink font-semibold"}
                                onClick={() => handleJoinTeam(team.id, proposedRole)}
                              >
                                {isRedundant ? "Join anyway" : "Join this team"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Current roster */}
                        <div className="flex items-center gap-2 my-3 flex-wrap">
                          <span className="text-xs text-ink-muted mr-1">Current Roster:</span>
                          {members.map((m, i) => {
                            const p = state.participants.find(part => part.id === m.participantId);
                            return (
                              <div
                                key={m.participantId || i}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-paper border border-border text-xs"
                              >
                                <span className="w-5 h-5 rounded-full bg-teal/15 text-teal text-[10px] font-bold flex items-center justify-center">
                                  {p?.initials || p?.name?.[0] || 'M'}
                                </span>
                                <span className="font-medium text-ink">{p?.name || 'Member'}</span>
                                <span className="text-ink-muted text-[11px]">({m.role})</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Why you match */}
                        <div className="pt-2.5 border-t border-border/70 space-y-1">
                          <p className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider">
                            Match & Role Diagnostics:
                          </p>
                          <ul className="grid sm:grid-cols-2 gap-1.5 text-xs text-ink-secondary">
                            {highlights.map((h, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                {isRedundant && i === 0 ? (
                                  <AlertCircle size={13} className="text-coral shrink-0 mt-0.5" />
                                ) : (
                                  <Check size={13} className="text-teal shrink-0 mt-0.5" />
                                )}
                                <span className={isRedundant && i === 0 ? 'text-coral font-medium' : ''}>{h}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-3 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => setShowTeamingModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave Event Dialog */}
      <ConfirmDialog
        open={leaveOpen}
        title="Leave event"
        description={`Are you sure you want to leave ${event.title}? Your registration and team assignments will be removed.`}
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
