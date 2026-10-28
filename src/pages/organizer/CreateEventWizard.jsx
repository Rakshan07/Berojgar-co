import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Plus, Trash2, X, ChevronDown, ChevronUp, Info, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { Card, SectionHeader, ProgressSteps } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SKILL_LIBRARY, EVENT_CATEGORIES, PROFICIENCY_LEVELS, AI_DEMO_SUGGESTIONS } from '../../data/demoData';
import { useToast } from '../../hooks/useToast';

const STEPS = ['Basics', 'Team config', 'Requirements', 'Review'];
const MODES = ['remote', 'in-person', 'hybrid'];

const emptyForm = {
  title: '',
  description: '',
  category: 'hackathon',
  mode: 'hybrid',
  location: '',
  dates: { start: '', end: '', registrationDeadline: '' },
  teamSize: { min: 3, max: 5 },
  requirements: [],
  tags: [],
  maxParticipants: 60,
};

export default function CreateEventPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editEventId = searchParams.get('edit');
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [newReq, setNewReq] = useState({ skill: '', category: 'Technical', required: true, proficiency: 2, count: 1 });
  const [reqSearch, setReqSearch] = useState('');
  const [showReqPicker, setShowReqPicker] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editEventId && state?.events) {
      const existing = state.events.find(e => e.id === editEventId);
      if (existing) {
        setForm({
          title: existing.title || '',
          description: existing.description || '',
          category: existing.category || existing.category_id || 'hackathon',
          mode: existing.mode || 'hybrid',
          location: existing.location || '',
          dates: {
            start: existing.dates?.start || (existing.start_date ? new Date(existing.start_date).toISOString().slice(0, 10) : ''),
            end: existing.dates?.end || (existing.end_date ? new Date(existing.end_date).toISOString().slice(0, 10) : ''),
            registrationDeadline: existing.dates?.registrationDeadline || (existing.registration_deadline ? new Date(existing.registration_deadline).toISOString().slice(0, 10) : ''),
          },
          teamSize: {
            min: existing.teamSize?.min || existing.min_team_size || 3,
            max: existing.teamSize?.max || existing.max_team_size || 5,
          },
          requirements: (existing.requirements || []).map((r, i) => ({
            id: r.id || `r-${i}`,
            skill: r.skill || r.skill_name,
            category: r.category || 'Technical',
            required: r.required !== undefined ? r.required : true,
            proficiency: r.proficiency || r.min_proficiency || 2,
            count: r.count || r.target_count || 1,
          })),
          tags: existing.tags || [],
          maxParticipants: existing.maxParticipants || existing.max_participants || 60,
        });
      }
    }
  }, [editEventId, state?.events]);

  function setField(path, value) {
    setForm(f => setNested(f, path, value));
    setErrors(e => ({ ...e, [path]: undefined }));
  }

  function validateStep(s) {
    const errs = {};
    if (s === 0) {
      if (!form.title.trim()) errs.title = 'Event name is required';
      if (!form.description.trim()) errs.description = 'Description is required';
      if (!form.dates.start) errs['dates.start'] = 'Start date is required';
    }
    if (s === 1) {
      if (form.teamSize.min < 1) errs['teamSize.min'] = 'Minimum team size must be at least 1';
      if (form.teamSize.max < form.teamSize.min) errs['teamSize.max'] = 'Max must be ≥ min';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep(s => Math.max(s - 1, 0)); }

  function addRequirement() {
    if (!newReq.skill.trim()) return;
    setForm(f => ({
      ...f,
      requirements: [...f.requirements, { id: `r-${Date.now()}`, ...newReq }],
    }));
    setNewReq({ skill: '', category: 'Technical', required: true, proficiency: 2, count: 1 });
    setReqSearch('');
  }

  function removeRequirement(id) {
    setForm(f => ({ ...f, requirements: f.requirements.filter(r => r.id !== id) }));
  }

  function applyAiSuggestion(sug) {
    const req = {
      id: `r-${Date.now()}-${sug.skill}`,
      skill: sug.skill,
      category: 'Suggested',
      required: sug.required,
      proficiency: sug.proficiency,
      count: 1,
    };
    setForm(f => ({
      ...f,
      requirements: [...f.requirements.filter(r => r.skill !== sug.skill), req],
    }));
    toast.success(`Added: ${sug.skill}`);
  }

  function openAiPanel() {
    setAiOpen(true);
    if (aiSuggestions?.category === form.category) return;
    setAiLoading(true);
    setTimeout(() => {
      setAiSuggestions({ ...(AI_DEMO_SUGGESTIONS[form.category] ?? AI_DEMO_SUGGESTIONS.hackathon), category: form.category });
      setAiLoading(false);
    }, 900);
  }

  async function saveEvent(status = 'open') {
    if (!validateStep(0) || !validateStep(1)) { setStep(0); return; }
    if (editEventId) {
      dispatch({
        type: 'UPDATE_EVENT',
        payload: {
          id: editEventId,
          data: {
            ...form,
            status,
          },
        },
      });
      try {
        const token = localStorage.getItem('teamweave_token');
        await fetch(`http://localhost:8000/api/v1/events/${editEventId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'X-User-Id': orgId === 'user-me' ? 'asel' : orgId,
          },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            mode: form.mode || 'hybrid',
            location: form.location || null,
            min_team_size: form.teamSize?.min || 3,
            max_team_size: form.teamSize?.max || 5,
          }),
        });
      } catch {}

      toast.success('Event updated successfully!');
      navigate('/organizer/events');
      return;
    }

    const eventId = `ev-${Date.now()}`;
    const orgId = state?.currentUserId || 'org1';
    const event = {
      ...form,
      id: eventId,
      status,
      registeredCount: 0,
      organizer: { id: orgId, name: 'Lead Organizer', role: 'organizer' },
      organizerId: orgId,
      _isNew: true,
    };

    // Sync with backend API if accessible
    try {
      const token = localStorage.getItem('teamweave_token');
      const startIso = form.dates?.start ? new Date(form.dates.start).toISOString() : new Date().toISOString();
      const endIso = form.dates?.end ? new Date(form.dates.end).toISOString() : startIso;
      const deadlineIso = form.dates?.registrationDeadline ? new Date(form.dates.registrationDeadline).toISOString() : startIso;

      await fetch('http://localhost:8000/api/v1/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'X-User-Id': orgId === 'user-me' ? 'asel' : orgId,
        },
        body: JSON.stringify({
          title: form.title,
          category_id: form.category || 'hackathon',
          description: form.description,
          mode: form.mode || 'hybrid',
          location: form.location || null,
          min_team_size: form.teamSize?.min || 3,
          max_team_size: form.teamSize?.max || 5,
          start_date: startIso,
          end_date: endIso,
          registration_deadline: deadlineIso,
          max_participants: form.maxParticipants || 100,
          tags: form.tags?.length ? form.tags : ['General'],
          requirements: (form.requirements || []).map(r => ({
            skill_name: r.skill,
            category: r.category || 'Technical',
            min_proficiency: r.proficiency || 2,
            required: !!r.required,
            target_count: r.count || 1,
            priority: 1,
            is_custom: false,
          })),
          roles: [],
        }),
      });
    } catch {
      // Backend offline or local demo fallback
    }

    dispatch({ type: 'ADD_EVENT', payload: event });
    if (state?.currentRole !== 'organizer') {
      dispatch({ type: 'SET_ROLE', payload: 'organizer' });
    }
    toast.success(status === 'open' ? 'Event published!' : 'Draft saved');
    navigate('/organizer');
  }

  const libSkills = SKILL_LIBRARY.filter(s => {
    const q = reqSearch.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  }).slice(0, 12);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-heading font-bold text-ink">{editEventId ? 'Edit Event' : 'Create Event'}</h1>
        <p className="text-sm text-ink-secondary mt-1">{editEventId ? 'Update your event details and requirements.' : 'Set up your event in four steps.'}</p>
      </div>

      <ProgressSteps steps={STEPS} current={step} />

      {/* ─ Step 0: Basics ─────────────────────────────────────────────── */}
      {step === 0 && (
        <Card className="space-y-4">
          <SectionHeader title="Event basics" />

          <WizField label="Event name *" error={errors.title}>
            <input className="input-field" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. City Climate Hackathon 2027" />
          </WizField>

          <WizField label="Description *" error={errors.description}>
            <textarea className="input-field min-h-24 resize-y" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="What is the event about? Who should join?" />
          </WizField>

          <div className="grid sm:grid-cols-2 gap-4">
            <WizField label="Category">
              <select className="input-field" value={form.category} onChange={e => { setField('category', e.target.value); setAiSuggestions(null); }}>
                {EVENT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </WizField>
            <WizField label="Participation mode">
              <select className="input-field" value={form.mode} onChange={e => setField('mode', e.target.value)}>
                {MODES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </WizField>
          </div>

          {form.mode !== 'remote' && (
            <WizField label="Location">
              <input className="input-field" value={form.location} onChange={e => setField('location', e.target.value)} placeholder="e.g. Room 204, Main Campus" />
            </WizField>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            <WizField label="Start date *" error={errors['dates.start']}>
              <input type="date" className="input-field" value={form.dates.start} onChange={e => setField('dates', { ...form.dates, start: e.target.value })} />
            </WizField>
            <WizField label="End date">
              <input type="date" className="input-field" value={form.dates.end} onChange={e => setField('dates', { ...form.dates, end: e.target.value })} />
            </WizField>
            <WizField label="Registration deadline">
              <input type="date" className="input-field" value={form.dates.registrationDeadline} onChange={e => setField('dates', { ...form.dates, registrationDeadline: e.target.value })} />
            </WizField>
          </div>
        </Card>
      )}

      {/* ─ Step 1: Team config ─────────────────────────────────────────── */}
      {step === 1 && (
        <Card className="space-y-4">
          <SectionHeader title="Team configuration" />
          <div className="grid sm:grid-cols-3 gap-4">
            <WizField label="Min team size *" error={errors['teamSize.min']}>
              <input type="number" className="input-field" value={form.teamSize.min} onChange={e => setField('teamSize', { ...form.teamSize, min: Number(e.target.value) })} min={1} max={20} />
            </WizField>
            <WizField label="Max team size *" error={errors['teamSize.max']}>
              <input type="number" className="input-field" value={form.teamSize.max} onChange={e => setField('teamSize', { ...form.teamSize, max: Number(e.target.value) })} min={1} max={20} />
            </WizField>
            <WizField label="Max participants">
              <input type="number" className="input-field" value={form.maxParticipants} onChange={e => setField('maxParticipants', Number(e.target.value))} min={1} />
            </WizField>
          </div>
          <p className="text-xs text-ink-muted flex items-center gap-1">
            <Info size={12} /> Teams will be formed with between {form.teamSize.min} and {form.teamSize.max} members.
          </p>
        </Card>
      )}

      {/* ─ Step 2: Requirements ────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* AI Assistant Button */}
          <div className="flex justify-end">
            <button
              onClick={openAiPanel}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-cobalt/40 bg-cobalt-light/40 text-cobalt text-sm font-medium hover:bg-cobalt-light transition-colors"
            >
              <Sparkles size={15} />
              Help me design this event
              <span className="text-xs font-normal opacity-70 ml-1">(Demo)</span>
            </button>
          </div>

          {/* AI Assistant Panel */}
          {aiOpen && (
            <Card className="border-cobalt/20 bg-cobalt-light/20">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-cobalt" />
                  <span className="text-sm font-semibold text-cobalt">Event Assistant — Sample suggestions</span>
                </div>
                <button onClick={() => setAiOpen(false)} className="text-ink-muted hover:text-ink"><X size={15} /></button>
              </div>
              <div className="text-xs text-ink-muted bg-cobalt-light/30 border border-cobalt/10 rounded-lg px-3 py-2 mb-3 flex items-start gap-1.5">
                <Info size={12} className="shrink-0 mt-0.5" />
                These are sample suggestions based on the selected event category ({form.category}). They are NOT generated by a real AI model. Review and edit before applying.
              </div>

              {aiLoading ? (
                <div className="text-sm text-ink-muted flex items-center gap-2 py-4">
                  <span className="w-4 h-4 rounded-full border-2 border-cobalt border-t-transparent animate-spin" />
                  Loading sample suggestions…
                </div>
              ) : aiSuggestions ? (
                <div className="space-y-4">
                  {/* Suggested roles */}
                  <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Suggested roles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiSuggestions.roles.map(r => (
                        <Badge key={r} color="cobalt" size="sm">{r}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Suggested skills */}
                  <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Suggested requirements</p>
                    <div className="space-y-1.5">
                      {aiSuggestions.skills.map((s, i) => {
                        const alreadyAdded = form.requirements.some(r => r.skill === s.skill);
                        return (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 bg-surface border border-border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-ink">{s.skill}</span>
                                <Badge color={s.required ? 'teal' : 'ink'} size="xs">{s.required ? 'Required' : 'Preferred'}</Badge>
                                <Badge color="cobalt" size="xs">{PROFICIENCY_LEVELS.find(l => l.value === s.proficiency)?.label}</Badge>
                              </div>
                            </div>
                            <Button
                              size="xs"
                              variant={alreadyAdded ? 'ghost' : 'outline'}
                              disabled={alreadyAdded}
                              onClick={() => applyAiSuggestion(s)}
                            >
                              {alreadyAdded ? 'Added ✓' : '+ Add'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="text-xs text-ink-secondary bg-paper border border-border rounded-lg px-3 py-2">
                    <strong>Why these suggestions:</strong> {aiSuggestions.reason}
                  </div>

                  {/* Sample questions */}
                  <details>
                    <summary className="text-xs font-semibold text-ink-muted uppercase tracking-wider cursor-pointer hover:text-ink list-none flex items-center gap-1">
                      <span>›</span> Sample assessment questions ({aiSuggestions.sampleQuestions.length})
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {aiSuggestions.sampleQuestions.map((q, i) => (
                        <li key={i} className="text-xs text-ink-secondary pl-3 border-l-2 border-cobalt/20">{q}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              ) : null}
            </Card>
          )}

          {/* Requirements list */}
          <Card>
            <SectionHeader title={`Requirements (${form.requirements.length})`} subtitle="Define required and preferred skills for participants." />

            <div className="space-y-2 mb-4">
              {form.requirements.length === 0 && (
                <p className="text-sm text-ink-muted italic">No requirements added yet. Use the form below or the assistant above.</p>
              )}
              {form.requirements.map(req => {
                const profLabel = PROFICIENCY_LEVELS.find(l => l.value === req.proficiency)?.label;
                return (
                  <div key={req.id} className="flex items-center gap-3 px-3 py-2 bg-paper border border-border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink">{req.skill}</span>
                        <Badge color={req.required ? 'teal' : 'ink'} size="xs">{req.required ? 'Required' : 'Preferred'}</Badge>
                        <Badge color="cobalt" size="xs">{profLabel}</Badge>
                        {req.count > 1 && <Badge color="ink" size="xs">×{req.count}</Badge>}
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">{req.category}</p>
                    </div>
                    <button onClick={() => removeRequirement(req.id)} className="text-ink-muted hover:text-red-500 transition-colors p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add requirement form */}
            <div className="border border-border rounded-xl bg-paper p-4 space-y-3">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Add requirement</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="relative sm:col-span-2">
                  <input
                    className="input-field pr-8"
                    placeholder="Search or type a skill name…"
                    value={reqSearch || newReq.skill}
                    onChange={e => { setReqSearch(e.target.value); setNewReq(r => ({ ...r, skill: e.target.value })); setShowReqPicker(true); }}
                    onFocus={() => setShowReqPicker(true)}
                  />
                  {showReqPicker && reqSearch && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-surface border border-border rounded-xl shadow-elevated max-h-40 overflow-y-auto mt-1">
                      {libSkills.map(s => (
                        <button
                          key={s.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-paper flex items-center gap-2 transition-colors"
                          onClick={() => { setNewReq(r => ({ ...r, skill: s.name, category: s.category })); setReqSearch(''); setShowReqPicker(false); }}
                        >
                          <Badge color="ink" size="xs">{s.category}</Badge>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <WizField label="Type">
                  <select className="input-field" value={newReq.required ? 'required' : 'preferred'} onChange={e => setNewReq(r => ({ ...r, required: e.target.value === 'required' }))}>
                    <option value="required">Required</option>
                    <option value="preferred">Preferred</option>
                  </select>
                </WizField>
                <WizField label="Min proficiency">
                  <select className="input-field" value={newReq.proficiency} onChange={e => setNewReq(r => ({ ...r, proficiency: Number(e.target.value) }))}>
                    {PROFICIENCY_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </WizField>
              </div>
              <Button size="sm" icon={<Plus size={13} />} onClick={addRequirement} disabled={!newReq.skill.trim()}>Add requirement</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ─ Step 3: Review ──────────────────────────────────────────────── */}
      {step === 3 && (
        <Card className="space-y-5">
          <SectionHeader title="Review your event" subtitle="Check the details before saving." />

          <ReviewSection label="Event name">{form.title || <span className="text-ink-muted italic">Not set</span>}</ReviewSection>
          <ReviewSection label="Category"><Badge color={EVENT_CATEGORIES.find(c => c.id === form.category)?.color ?? 'ink'}>{EVENT_CATEGORIES.find(c => c.id === form.category)?.label ?? form.category}</Badge></ReviewSection>
          <ReviewSection label="Mode">{form.mode} {form.location && `· ${form.location}`}</ReviewSection>
          <ReviewSection label="Dates">{form.dates.start || '—'} → {form.dates.end || '—'}</ReviewSection>
          <ReviewSection label="Team size">{form.teamSize.min}–{form.teamSize.max} per team</ReviewSection>
          <ReviewSection label="Description">
            <p className="text-sm text-ink-secondary">{form.description || <span className="italic text-ink-muted">Not set</span>}</p>
          </ReviewSection>
          <ReviewSection label={`Requirements (${form.requirements.length})`}>
            {form.requirements.length === 0
              ? <span className="text-ink-muted italic text-sm">None defined</span>
              : (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.requirements.map(r => (
                    <Badge key={r.id} color={r.required ? 'teal' : 'ink'} size="sm">
                      {r.skill} · {PROFICIENCY_LEVELS.find(l => l.value === r.proficiency)?.label}
                      {r.required ? ' (req)' : ' (pref)'}
                    </Badge>
                  ))}
                </div>
              )}
          </ReviewSection>

          {/* Validation */}
          {(!form.title || !form.description || !form.dates.start) && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              Missing required fields. Please go back and complete the Basics step.
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => saveEvent('draft')}>{editEventId ? 'Save draft changes' : 'Save as draft'}</Button>
            <Button onClick={() => saveEvent('open')} disabled={!form.title || !form.description || !form.dates.start}>
              {editEventId ? 'Save changes' : 'Publish event'}
            </Button>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={back} disabled={step === 0} className="gap-1.5"><ArrowLeft size={13} /> Back</Button>
        {step < STEPS.length - 1 && <Button onClick={next} className="gap-1.5">Continue <ArrowRight size={13} /></Button>}
      </div>
    </div>
  );
}

function WizField({ label, children, error, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-semibold text-[var(--sf-secondary)] uppercase tracking-wider block">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-400 font-medium mt-1 animate-fadeIn">{error}</p>}
    </div>
  );
}

function ReviewSection({ label, children }) {
  return (
    <div className="pb-3 border-b border-border last:border-0">
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

function setNested(obj, path, value) {
  const keys = path.split('.');
  if (keys.length === 1) return { ...obj, [path]: value };
  return { ...obj, [keys[0]]: setNested(obj[keys[0]], keys.slice(1).join('.'), value) };
}
