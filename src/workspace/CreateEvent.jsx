import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, FileText, Users, ClipboardCheck, Check, Sparkles, AlertCircle } from 'lucide-react';
import { Heading, Panel } from './Workspace';
import { useWorkspaceAccount } from './account';
import { request, useResource, categories } from './api';

const initial = {
  title: '',
  category_id: '',
  description: '',
  rules: '',
  eligibility: '',
  expected_deliverables: '',
  constraints_and_tools: '',
  judging_criteria: '',
  mode: 'hybrid',
  location: '',
  min_team_size: 2,
  max_team_size: 5,
  start_date: '',
  end_date: '',
  registration_deadline: '',
  max_participants: 100,
  skills: '',
  roles: ''
};

export function CreateEvent() {
  const { account, organizerAllowed } = useWorkspaceAccount();
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBrief, setAiBrief] = useState(null);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const formRef = useRef(null);

  const catalog = useResource('/events/categories');
  const options = catalog.data || categories.map(([id, name]) => ({ id, name }));

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function next(e) {
    e.preventDefault();
    setError('');
    if (step === 2) {
      if (new Date(form.end_date) <= new Date(form.start_date)) {
        setError('The end date must be after the start date.');
        return;
      }
      if (new Date(form.registration_deadline) > new Date(form.start_date)) {
        setError('Registration must close before the event starts.');
        return;
      }
      if (Number(form.max_team_size) < Number(form.min_team_size)) {
        setError('Maximum team size must be at least the minimum.');
        return;
      }
    }
    setStep(step + 1);
  }

  async function generateAiBrief() {
    if (!form.title || !form.description || !form.category_id) {
      setError('Please provide an event title, category, and challenge description first.');
      return;
    }
    setAiLoading(true);
    setError('');
    try {
      // First save draft if not saved
      let currentEvent = created;
      if (!currentEvent) {
        const payload = {
          title: form.title.trim(),
          category_id: form.category_id,
          description: form.description.trim(),
          rules: form.rules.trim() || null,
          eligibility: form.eligibility.trim() || null,
          expected_deliverables: form.expected_deliverables.trim() || null,
          constraints_and_tools: form.constraints_and_tools.trim() || null,
          judging_criteria: form.judging_criteria.trim() || null,
          mode: form.mode,
          location: form.location || null,
          min_team_size: Number(form.min_team_size),
          max_team_size: Number(form.max_team_size),
          max_participants: Number(form.max_participants),
          start_date: new Date(form.start_date || Date.now() + 86400000 * 7).toISOString(),
          end_date: new Date(form.end_date || Date.now() + 86400000 * 9).toISOString(),
          registration_deadline: new Date(form.registration_deadline || Date.now() + 86400000 * 5).toISOString(),
          requirements: form.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill_name => ({
            skill_name, category: 'Technical', min_proficiency: 2, required: true, target_count: 1
          })),
          roles: form.roles.split(',').map(s => s.trim()).filter(Boolean).map(name => ({
            name, suggested_count: 1
          })),
          tags: []
        };
        currentEvent = await request('/events', { method: 'POST', body: JSON.stringify(payload) });
        setCreated(currentEvent);
      }

      const res = await request(`/events/${encodeURIComponent(currentEvent.id)}/ai-brief`, { method: 'POST' });
      setAiBrief(res.brief);

      // Auto-suggest roles and skills into form if currently empty
      if (!form.skills && res.brief?.relevant_skills?.length) {
        setForm(prev => ({
          ...prev,
          skills: res.brief.relevant_skills.map(s => s.skill_name).join(', ')
        }));
      }
      if (!form.roles && res.brief?.complementary_roles?.length) {
        setForm(prev => ({
          ...prev,
          roles: res.brief.complementary_roles.map(r => r.name).join(', ')
        }));
      }
    } catch (err) {
      setError(err.message || 'AI brief generation failed. Check your Gemini API key in root .env.');
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        category_id: form.category_id,
        description: form.description.trim(),
        rules: form.rules.trim() || null,
        eligibility: form.eligibility.trim() || null,
        expected_deliverables: form.expected_deliverables.trim() || null,
        constraints_and_tools: form.constraints_and_tools.trim() || null,
        judging_criteria: form.judging_criteria.trim() || null,
        mode: form.mode,
        location: form.location || null,
        min_team_size: Number(form.min_team_size),
        max_team_size: Number(form.max_team_size),
        max_participants: Number(form.max_participants),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        registration_deadline: new Date(form.registration_deadline).toISOString(),
        requirements: form.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill_name => ({
          skill_name, category: 'Technical', min_proficiency: 2, required: true, target_count: 1
        })),
        roles: form.roles.split(',').map(s => s.trim()).filter(Boolean).map(name => ({
          name, suggested_count: 1
        })),
        tags: []
      };

      let result;
      if (created) {
        result = await request(`/events/${encodeURIComponent(created.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        result = await request('/events', { method: 'POST', body: JSON.stringify(payload) });
      }
      setCreated(result);
    } catch (err) {
      setError(err instanceof TypeError ? 'Unable to reach the server. Your event has not been saved.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  function field(name, label, type = 'text', extra = {}) {
    return (
      <label className="tw-field">
        <span>{label}</span>
        <input name={name} type={type} value={form[name]} onChange={update} required {...extra} />
      </label>
    );
  }

  const category = options.find(c => c.id === form.category_id)?.name;

  return (
    <>
      <Heading
        eyebrow="CREATE AN OPPORTUNITY"
        title="Start with a challenge worth solving."
        description="A thoughtful brief is the beginning of a remarkable team."
      />

      {created && step === 4 ? (
        <Panel title="Your event draft is saved">
          <div className="tw-empty">
            <Check size={32} style={{ color: '#2DA44E' }} />
            <h2>{created.title}</h2>
            <p>
              Your draft was saved by the server. It has not been published. Open the event to review its details and publish it.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link className="tw-button" to={`/events/${encodeURIComponent(created.id)}`}>
                Open Event Details
              </Link>
              <Link className="tw-button secondary" to="/organizer/events">
                View my events
              </Link>
            </div>
          </div>
        </Panel>
      ) : (
        <>
          <div className="tw-wizardsteps" aria-label="Event creation progress">
            {['Event brief & deliverables', 'Team & schedule', 'AI Brief & Roles', 'Review & Save'].map((name, i) => (
              <div className={step === i + 1 ? 'current' : ''} key={name} aria-current={step === i + 1 ? 'step' : undefined}>
                <b>{i + 1}</b>{name}
              </div>
            ))}
          </div>

          <div className="tw-formlayout">
            <section className="tw-panel tw-formpanel">
              <form ref={formRef} onSubmit={step < 4 ? next : e => { e.preventDefault(); save(); }}>
                {step === 1 && (
                  <>
                    <h2>Tell us about your event.</h2>
                    <p className="tw-subtle">Give participants a clear reason to join.</p>
                    {field('title', 'Event name', 'text', { minLength: 3, maxLength: 200 })}
                    
                    <label className="tw-field">
                      <span>Event category</span>
                      <select required name="category_id" value={form.category_id} onChange={update}>
                        <option value="">Choose a category</option>
                        {options.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>

                    <label className="tw-field">
                      <span>Describe the challenge & objectives</span>
                      <textarea
                        required
                        minLength={10}
                        maxLength={20000}
                        name="description"
                        value={form.description}
                        onChange={update}
                        placeholder="What will participants work on? Describe the primary goals and context."
                      />
                    </label>

                    <label className="tw-field">
                      <span>Expected deliverables (optional)</span>
                      <textarea
                        name="expected_deliverables"
                        value={form.expected_deliverables}
                        onChange={update}
                        placeholder="e.g. Working prototype, GitHub repository, system design presentation..."
                      />
                    </label>

                    <div className="tw-fieldpair">
                      <label className="tw-field">
                        <span>Rules & eligibility</span>
                        <input
                          name="rules"
                          value={form.rules}
                          onChange={update}
                          placeholder="e.g. Open to undergraduate students, original work only"
                        />
                      </label>
                      <label className="tw-field">
                        <span>Constraints & permitted tools</span>
                        <input
                          name="constraints_and_tools"
                          value={form.constraints_and_tools}
                          onChange={update}
                          placeholder="e.g. Open-source models allowed, no proprietary APIs"
                        />
                      </label>
                    </div>

                    <label className="tw-field">
                      <span>Judging & assessment criteria</span>
                      <input
                        name="judging_criteria"
                        value={form.judging_criteria}
                        onChange={update}
                        placeholder="e.g. Technical depth (40%), originality (30%), feasibility (30%)"
                      />
                    </label>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2>The people. The place. The plan.</h2>
                    <p className="tw-subtle">Dates use your device’s local time zone and are saved in UTC.</p>
                    <div className="tw-fieldpair">
                      {field('min_team_size', 'Minimum team size', 'number', { min: 1, max: 100 })}
                      {field('max_team_size', 'Maximum team size', 'number', { min: 1, max: 100 })}
                    </div>
                    {field('max_participants', 'Participant capacity', 'number', { min: 1 })}
                    
                    <label className="tw-field">
                      <span>Event mode</span>
                      <select name="mode" value={form.mode} onChange={update}>
                        <option value="hybrid">Hybrid</option>
                        <option value="remote">Online</option>
                        <option value="in-person">In person</option>
                      </select>
                    </label>
                    
                    {field('location', 'Venue / location', 'text', { required: form.mode !== 'remote' })}
                    
                    <div className="tw-fieldpair">
                      {field('start_date', 'Starts', 'datetime-local')}
                      {field('end_date', 'Ends', 'datetime-local')}
                    </div>
                    {field('registration_deadline', 'Registration closes', 'datetime-local')}
                  </>
                )}

                {step === 3 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2>Different strengths. One shared goal.</h2>
                        <p className="tw-subtle">Set the skills and complementary roles your challenge needs.</p>
                      </div>
                      <button
                        type="button"
                        className="tw-button"
                        disabled={aiLoading}
                        onClick={generateAiBrief}
                        style={{ fontSize: 11 }}
                      >
                        <Sparkles size={14} />
                        {aiLoading ? 'Analyzing...' : 'Generate AI Event Brief'}
                      </button>
                    </div>

                    {/* AI Brief Review Card if generated */}
                    {aiBrief && (
                      <div style={{ background: '#F8F3FC', border: '1px solid #D6BEEA', borderRadius: 8, padding: 16, margin: '16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Sparkles size={16} style={{ color: '#804DA8' }} />
                          <strong style={{ color: '#5A2A82', fontSize: 13 }}>AI Structured Brief (Organizer Review)</strong>
                        </div>
                        <p style={{ fontSize: 12, lineHeight: 1.5, margin: '0 0 10px' }}>{aiBrief.summary}</p>
                        
                        {aiBrief.complementary_roles?.length > 0 && (
                          <div style={{ fontSize: 11, marginBottom: 8 }}>
                            <strong>Suggested Complementary Roles: </strong>
                            {aiBrief.complementary_roles.map(r => r.name).join(', ')}
                          </div>
                        )}
                        {aiBrief.relevant_skills?.length > 0 && (
                          <div style={{ fontSize: 11, marginBottom: 8 }}>
                            <strong>Identified Skills: </strong>
                            {aiBrief.relevant_skills.map(s => s.skill_name).join(', ')}
                          </div>
                        )}
                        <p className="tw-subtle" style={{ fontSize: 10, margin: 0 }}>
                          Organizer rules are authoritative. You can edit the roles and skills below to refine the assessment criteria.
                        </p>
                      </div>
                    )}

                    {field('skills', 'Required skills, separated by commas', 'text', { placeholder: 'Python, React, API Design, Docker', required: false })}
                    {field('roles', 'Complementary team roles, separated by commas', 'text', { placeholder: 'Frontend Lead, Backend Lead, Product Designer', required: false })}

                    <div className="tw-note">
                      <ClipboardCheck size={20} />
                      <span>Case studies will adapt to each participant's skills and stated level using this brief and criteria.</span>
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <p className="tw-eyebrow">{category}</p>
                    <h2>{form.title}</h2>
                    <p className="tw-brieftext">{form.description}</p>
                    <dl className="tw-details">
                      {[
                        ['Team size', `${form.min_team_size}–${form.max_team_size} members`],
                        ['Capacity', form.max_participants],
                        ['Mode', form.mode],
                        ['Location', form.location || 'Online'],
                        ['Starts', form.start_date.replace('T', ' ')],
                        ['Ends', form.end_date.replace('T', ' ')],
                        ['Registration deadline', form.registration_deadline.replace('T', ' ')],
                        ['Skills', form.skills || 'Not specified'],
                        ['Roles', form.roles || 'Not specified'],
                        ['Deliverables', form.expected_deliverables || 'Standard submission']
                      ].map(([label, value]) => (
                        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                      ))}
                    </dl>
                    <div className="tw-note">
                      Save this as a draft. Once saved, your approved organizer account can publish it from the event details page.
                    </div>
                  </>
                )}

                {error && <div className="tw-notice" role="alert"><AlertCircle size={16} /> {error}</div>}

                <div className="tw-formactions">
                  {step > 1 && (
                    <button type="button" className="tw-button secondary" disabled={busy || aiLoading} onClick={() => { setStep(step - 1); setError(''); }}>
                      <ArrowLeft size={16} />Back
                    </button>
                  )}
                  {step < 4 ? (
                    <button className="tw-button" disabled={aiLoading}>
                      Continue<ArrowRight size={16} />
                    </button>
                  ) : (
                    <button className="tw-button" disabled={busy || !account.data || !organizerAllowed || !account.data?.organizer_approved || !catalog.data}>
                      {busy ? 'Saving...' : 'Save event draft'}
                    </button>
                  )}
                </div>

                {step === 4 && (!organizerAllowed || !account.data?.organizer_approved || !catalog.data) && (
                  <p className="tw-subtle">An approved organizer account and a working server connection are needed to save.</p>
                )}
              </form>
            </section>

            <aside className="tw-formaside">
              <div className="tw-panel tw-formpanel">
                <Users size={24} />
                <h2>A good brief brings people together.</h2>
                <p className="tw-subtle">
                  Be specific about the problem. Make room for complementary skills. Give everyone a clear picture of what they can contribute.
                </p>
                <hr />
                <p className="tw-subtle">Your event stays a draft until it is reviewed and published.</p>
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
