// ─── Organizer Team Formation Workspace ──────────────────────────────────
import { useState } from 'react';
import { Users, Zap, CheckCircle, AlertCircle, UserMinus, UserPlus, Info, RefreshCw } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { Card, SectionHeader, Avatar, EmptyState, Spinner, CoverageBar, ConfirmDialog } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TeamBlueprint } from '../../components/teams/TeamBlueprint';
import { LivingWeaveViz } from '../../components/teams/LivingWeaveViz';
import { generateTeamSuggestions, computeReplacementSuggestions } from '../../services/matchingService';
import { PROFICIENCY_LEVELS } from '../../data/demoData';
import { useToast } from '../../hooks/useToast';
import LatticeLoader from '../../components/ui/LatticeLoader';

export default function TeamFormationPage() {
  const { state, dispatch } = useApp();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(state.organizerEventId ?? 'ev1');
  const [confirmPublish, setConfirmPublish] = useState(null);
  const [departureState, setDepartureState] = useState(null); // { teamId, participantId }
  const [replacementData, setReplacementData] = useState(null);

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
  const currentEvent = state.events.find(e => e.id === selectedEventId);
  const registeredParticipants = state.registrations
    .filter(r => r.eventId === selectedEventId)
    .map(r => state.participants.find(p => p.id === r.participantId))
    .filter(Boolean);

  const generatedTeams = state.generatedTeams.filter(t => t.eventId === selectedEventId);
  const savedTeams = state.teams.filter(t => t.eventId === selectedEventId);
  const displayTeams = generatedTeams.length > 0 ? generatedTeams : savedTeams;

  const assignedIds = new Set(displayTeams.flatMap(t => t.members.map(m => m.participantId)));
  const unassigned = registeredParticipants.filter(p => !assignedIds.has(p.id));

  async function handleGenerate() {
    if (!currentEvent || !registeredParticipants.length) return;
    setLoading(true);
    try {
      const teams = await generateTeamSuggestions(currentEvent, registeredParticipants);
      dispatch({ type: 'SET_GENERATED_TEAMS', payload: teams });
      toast.success(`Generated ${teams.length} team suggestion${teams.length !== 1 ? 's' : ''}`);
    } catch (e) {
      toast.error('Generation failed — see console');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSaveTeams() {
    dispatch({ type: 'SAVE_TEAMS', payload: generatedTeams });
    dispatch({ type: 'SET_GENERATED_TEAMS', payload: [] });
    toast.success('Teams saved');
  }

  function handlePublish(teamId) {
    dispatch({ type: 'PUBLISH_TEAM', payload: teamId });
    setConfirmPublish(null);
    toast.success('Team published — participants will see their assignment');
  }

  function handleRemoveMember(teamId, participantId) {
    const team = displayTeams.find(t => t.id === teamId);
    const event = currentEvent;
    if (!team || !event) return;
    const data = computeReplacementSuggestions(team, participantId, state.participants, event);
    dispatch({ type: 'REMOVE_TEAM_MEMBER', payload: { teamId, participantId } });
    setReplacementData({ teamId, ...data });
    setDepartureState(null);
    toast.warn('Member removed — reviewing replacement candidates');
  }

  function handleAddReplacement(teamId, participantId) {
    dispatch({ type: 'ADD_TEAM_MEMBER', payload: { teamId, participantId } });
    setReplacementData(null);
    toast.success('Replacement member added to team');
  }

  return (
    <div className="space-y-7 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-garnet/20 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider font-semibold bg-wine-surface text-pink border border-garnet/30 shadow-sm shadow-black/50 mb-3">
            <Zap size={11} className="text-pink" /> Skill-Driven Teaming Studio
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black text-white tracking-tight">
            Team Formation <span className="text-gradient-purple">Studio</span>
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Read participant skills, match role requirements, and resolve capability gaps before publishing.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {generatedTeams.length > 0 && (
            <Button variant="secondary" size="sm" onClick={handleSaveTeams} className="border border-garnet/30 bg-[#13080E] text-white font-medium hover:bg-[#2C1020]">
              Save suggestions
            </Button>
          )}
          <Button
            size="sm"
            icon={loading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            loading={loading}
            onClick={handleGenerate}
            className="border border-garnet/40 bg-gradient-to-r from-garnet to-garnet-hover hover:from-garnet hover:to-garnet-hover text-white font-semibold shadow-md shadow-black/50"
          >
            Generate suggestions
          </Button>
        </div>
      </div>

      {/* Event picker & Info bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface/70 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider shrink-0">Selected Event:</label>
          <select
            className="border border-white/10 rounded-xl px-3.5 py-1.5 bg-[#13080E] text-sm text-white focus:outline-none focus:border-teal/60 focus:ring-1 focus:ring-teal/30 transition-all font-medium"
            value={selectedEventId}
            onChange={e => { setSelectedEventId(e.target.value); dispatch({ type: 'SET_GENERATED_TEAMS', payload: [] }); }}
          >
            {orgEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Info size={13} className="shrink-0 text-teal" />
          <span>Deterministic matching engine prioritizing core capabilities & complementary roles.</span>
        </div>
      </div>

      {/* AI Matching Animation & Progress */}
      {loading && (
        <div className="p-4 rounded-xl bg-surface border border-teal/30 shadow-card flex items-center justify-between animate-fadeIn">
          <LatticeLoader
            label="Matching Engine: Parsing skill matrices & optimizing role distribution"
            doneLabel="Teams formed in"
            status="working"
            pattern="orbit"
            grid={4}
            cellSize={7}
            gap={3}
            glow
            color="#B6264D"
            doneColor="#D13D65"
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: participants panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <SectionHeader title="Registered participants" subtitle={`${registeredParticipants.length} participants`} />
            {registeredParticipants.length === 0 ? (
              <EmptyState icon={<Users size={16} />} title="No participants" description="No one has registered for this event yet." />
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {registeredParticipants.map((p, i) => {
                  const isAssigned = assignedIds.has(p.id);
                  return (
                    <div key={p.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${isAssigned ? 'bg-teal-pale/40 border-teal/15' : 'bg-paper border-border'}`}>
                      <Avatar initials={p.initials} size="sm" index={i} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink truncate">{p.name}</p>
                        <p className="text-xs text-ink-muted truncate">{p.skills.map(s => s.name).slice(0, 2).join(', ')}</p>
                      </div>
                      {isAssigned && <CheckCircle size={12} className="text-teal shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Event requirements */}
          {currentEvent && (
            <Card>
              <SectionHeader title="Event requirements" />
              <div className="space-y-1.5">
                {currentEvent.requirements.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                    <span className="text-ink">{r.skill}</span>
                    <div className="flex gap-1.5">
                      <Badge color={r.required ? 'teal' : 'ink'} size="xs">{r.required ? 'Required' : 'Preferred'}</Badge>
                      <Badge color="cobalt" size="xs">{PROFICIENCY_LEVELS.find(l => l.value === r.proficiency)?.label}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <Card className="border-coral/20 bg-coral-light/20">
              <SectionHeader title={`Unassigned (${unassigned.length})`} />
              <div className="space-y-1.5">
                {unassigned.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 bg-surface border border-border rounded-lg">
                    <Avatar initials={p.initials} size="xs" index={i} />
                    <span className="text-xs text-ink">{p.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: team cards */}
        <div className="lg:col-span-2 space-y-5">
          {loading && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Spinner size={28} />
              <p className="text-sm text-ink-muted">Generating team suggestions…</p>
            </div>
          )}

          {!loading && displayTeams.length === 0 && (
            <EmptyState
              icon={<Users size={20} />}
              title="No teams yet"
              description={registeredParticipants.length < 2 ? "Not enough participants registered yet." : "Click 'Generate suggestions' to form teams from the registered participants."}
              action={registeredParticipants.length >= 2 ? (
                <Button size="sm" icon={<Zap size={13} />} onClick={handleGenerate}>Generate suggestions</Button>
              ) : null}
            />
          )}

          {!loading && displayTeams.map(team => (
            <div key={team.id} className="space-y-4 bg-surface/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md shadow-card">
              {/* Team header with actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-heading font-bold text-white text-lg sm:text-xl tracking-tight">{team.name}</h3>
                  <Badge color={team.status === 'published' ? 'teal' : 'cobalt'}>{team.status}</Badge>
                  {team._isGenerated && <Badge color="ink" size="xs">Unsaved Draft</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {team.status !== 'published' ? (
                    <Button
                      size="sm"
                      icon={<CheckCircle size={14} />}
                      onClick={() => setConfirmPublish(team.id)}
                      className="border border-garnet/40 bg-gradient-to-r from-garnet to-garnet-hover hover:from-garnet hover:to-garnet-hover text-white font-semibold shadow-md shadow-black/50"
                    >
                      Publish Team
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-wine-surface text-pink border border-garnet/30 text-xs font-mono font-semibold uppercase tracking-wider">
                      <CheckCircle size={13} className="text-pink" /> Published
                    </span>
                  )}
                </div>
              </div>

              {/* Weave visualization */}
              <LivingWeaveViz
                team={team}
                participants={state.participants}
                requirements={currentEvent?.requirements ?? []}
              />

              {/* Blueprint with departure controls */}
              <Card>
                <div className="mb-3 pb-3 border-b border-border">
                  <p className="text-xs text-ink-muted font-medium uppercase tracking-wider">Team Blueprint</p>
                </div>
                <div className="space-y-2 mb-4">
                  {team.members.map((m, i) => {
                    const p = state.participants.find(x => x.id === m.participantId);
                    if (!p) return null;
                    return (
                      <div key={m.participantId} className="flex items-center gap-3 p-3 bg-paper border border-border rounded-lg">
                        <Avatar initials={p.initials} size="sm" index={i} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">{p.name}</p>
                          <p className="text-xs text-ink-muted">{m.role} · {p.skills.slice(0, 2).map(s => s.name).join(', ')}</p>
                        </div>
                        {team.status !== 'published' && (
                          <button
                            onClick={() => setDepartureState({ teamId: team.id, participantId: p.id, name: p.name })}
                            className="text-ink-muted hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                            title="Remove / mark as departed"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Coverage bars */}
                {currentEvent && (
                  <div className="space-y-2">
                    <CoverageBar
                      label="Required skills"
                      covered={countCovered(team, state.participants, currentEvent.requirements.filter(r => r.required))}
                      total={currentEvent.requirements.filter(r => r.required).length}
                    />
                    <CoverageBar
                      label="Preferred skills"
                      covered={countCovered(team, state.participants, currentEvent.requirements.filter(r => !r.required))}
                      total={currentEvent.requirements.filter(r => !r.required).length}
                    />
                  </div>
                )}

                {/* Notes */}
                {team.coverageNotes?.length > 0 && (
                  <details className="mt-3 group">
                    <summary className="text-xs text-ink-muted cursor-pointer list-none flex items-center gap-1 hover:text-ink">
                      <span className="group-open:rotate-90 transition-transform inline-block">›</span>
                      Coverage notes
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {team.coverageNotes.map((note, i) => {
                        const isGap = note.startsWith('CRITICAL') || note.startsWith('Gap');
                        return (
                          <li key={i} className={`text-xs ${isGap ? 'text-red-600' : 'text-ink-secondary'} flex items-start gap-1.5`}>
                            <span>{isGap ? '⚠' : '✓'}</span>{note}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                )}
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Departure confirmation */}
      <ConfirmDialog
        open={!!departureState}
        title="Remove team member"
        description={`Remove ${departureState?.name} from this team? The team's skill coverage will be recalculated and replacement candidates will be shown.`}
        confirmLabel="Remove member"
        danger
        onConfirm={() => handleRemoveMember(departureState.teamId, departureState.participantId)}
        onCancel={() => setDepartureState(null)}
      />

      {/* Replacement panel */}
      {replacementData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setReplacementData(null)} />
          <div className="relative bg-surface border border-border rounded-2xl shadow-modal w-full max-w-lg p-6 animate-scaleIn max-h-[80vh] overflow-y-auto">
            <h3 className="text-base font-heading font-semibold text-ink mb-2">Replacement candidates</h3>
            <p className="text-xs text-ink-muted mb-4">Member removed. The following gaps were identified. These candidates could help cover them.</p>

            {replacementData.newGaps.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-red-600 mb-1.5">New gaps after removal:</p>
                <div className="flex flex-wrap gap-1.5">
                  {replacementData.newGaps.map((g, i) => (
                    <Badge key={i} color="red" size="sm">
                      {g.skill} ({g.required ? 'required' : 'preferred'})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {replacementData.candidates.length === 0 ? (
              <div className="py-6 text-center text-sm text-ink-muted">
                No suitable replacement candidates available in the participant pool.
              </div>
            ) : (
              <div className="space-y-3">
                {replacementData.candidates.map(({ participant, coversGaps }, i) => (
                  <div key={participant.id} className="flex items-start gap-3 p-3 bg-paper border border-border rounded-xl">
                    <Avatar initials={participant.initials} size="sm" index={i} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink">{participant.name}</p>
                      <p className="text-xs text-teal mt-0.5">
                        Covers: {coversGaps.map(g => g.skill).join(', ')}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {participant.skills.map(s => s.name).slice(0, 3).join(', ')}
                      </p>
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      icon={<UserPlus size={12} />}
                      onClick={() => handleAddReplacement(replacementData.teamId, participant.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button variant="ghost" size="sm" onClick={() => setReplacementData(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Publish confirm */}
      <ConfirmDialog
        open={!!confirmPublish}
        title="Publish team assignment"
        description="This will mark the team as published. Participants will see their team assignment. You can still make changes afterwards."
        confirmLabel="Publish team"
        onConfirm={() => handlePublish(confirmPublish)}
        onCancel={() => setConfirmPublish(null)}
      />
    </div>
  );
}

function countCovered(team, allParticipants, reqs) {
  const members = team.members
    .map(m => allParticipants.find(p => p.id === m.participantId))
    .filter(Boolean);
  return reqs.filter(req =>
    members.some(p => {
      const match = p.skills.find(s =>
        s.name.toLowerCase().includes(req.skill.toLowerCase()) ||
        req.skill.toLowerCase().includes(s.name.toLowerCase())
      );
      return match && match.proficiency >= req.proficiency;
    })
  ).length;
}
