import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, Clock, CheckCircle2, AlertCircle, ArrowRight, 
  RotateCcw, Sparkles, Shield, User, Users, Check, AlertTriangle, ArrowLeft 
} from 'lucide-react';
import { Heading, Panel, ResourceState } from './Workspace';
import { request, useResource } from './api';

export function Assessment({ eventId }) {
  const navigate = useNavigate();
  const assessmentResource = useResource(`/events/${encodeURIComponent(eventId)}/assessment`);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState('');
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);
  const [starting, setStarting] = useState(false);
  const lastSaveTimer = useRef(null);

  const data = assessmentResource.data;

  // Sync loaded answer drafts
  useEffect(() => {
    if (data?.answers) {
      setAnswers(prev => ({ ...data.answers, ...prev }));
    }
  }, [data?.answers]);

  async function handleStart() {
    setStarting(true);
    setError('');
    try {
      await request(`/events/${encodeURIComponent(eventId)}/assessment/start`, { method: 'POST', timeoutMs: 120000 });
      assessmentResource.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  function handleAnswerChange(qid, value) {
    setAnswers(prev => ({ ...prev, [qid]: value }));
    setSaveStatus('Unsaved changes');

    if (lastSaveTimer.current) clearTimeout(lastSaveTimer.current);
    lastSaveTimer.current = setTimeout(() => {
      autoSave({ ...answers, [qid]: value });
    }, 2500);
  }

  async function autoSave(currentAnswers) {
    if (!data?.questions?.length) return;
    setSaving(true);
    try {
      const payload = {
        answers: Object.entries(currentAnswers)
          .filter(([_, txt]) => txt && txt.trim().length > 0)
          .map(([qid, txt]) => ({ question_id: qid, answer_text: txt }))
      };
      if (payload.answers.length > 0) {
        await request(`/events/${encodeURIComponent(eventId)}/assessment/answers`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setSaveStatus('Draft saved');
      }
    } catch (err) {
      setSaveStatus('Draft save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!data?.questions) return;

    // Validate minimum lengths
    for (const q of data.questions) {
      const ans = (answers[q.id] || '').trim();
      if (ans.length < 20) {
        setError(`Please write at least 20 characters for Question ${q.position}.`);
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        answers: data.questions.map(q => ({
          question_id: q.id,
          answer_text: (answers[q.id] || '').trim()
        }))
      };
      await request(`/events/${encodeURIComponent(eventId)}/assessment/submit`, {
        method: 'POST', timeoutMs: 120000,
        body: JSON.stringify(payload)
      });
      assessmentResource.reload();
    } catch (err) {
      setError(err.message);
      assessmentResource.reload();
    } finally {
      setSubmitting(false);
    }
  }

  if (assessmentResource.loading) {
    return <div className="tw-empty" role="status">Loading assessment...</div>;
  }

  const status = data?.status;

  return (
    <>
      <Heading
        eyebrow="EVENT ASSESSMENT"
        title="Show how you think."
        description="Practical scenario-based questions calibrated for your skills and preferred role."
      >
        <Link className="tw-button secondary" to={`/events/${encodeURIComponent(eventId)}`}>
          <ArrowLeft size={16} />Back to Event
        </Link>
      </Heading>

      {error && <div className="tw-notice" role="alert"><AlertCircle size={18} /> {error}</div>}

      {/* State 1: Not started */}
      {status === 'not_started' && (
        <Panel title="Personalized Case Study Intake" description="Evaluate your capabilities for complementary team matching.">
          <div className="tw-empty">
            <div className="tw-empty-symbol"><ClipboardCheck size={28} /></div>
            <h3>Ready to begin your case study?</h3>
            <p>
              You will receive 2 to 3 scenario questions tailored to this event, your declared skills, and preferred role.
              Questions test real architectural decisions, trade-offs, and practical execution.
            </p>
            <div style={{ maxWidth: 480, margin: '15px auto', textAlign: 'left', background: 'var(--sf-surface)', padding: 14, borderRadius: 8, border: '1px solid var(--sf-border)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Shield size={18} style={{ color: '#9672B7', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--sf-muted)' }}>
                  <strong>Privacy Disclosure:</strong> Relevant event requirements and your written answers are processed by the configured AI provider strictly for assessment scoring and role recommendations. No personal credentials, emails, or identity documents are shared.
                </div>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 12, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={disclosureAccepted} 
                  onChange={e => setDisclosureAccepted(e.target.checked)}
                />
                <span>I understand and wish to proceed with the assessment</span>
              </label>
            </div>
            <button 
              className="tw-button" 
              disabled={!disclosureAccepted || starting} 
              onClick={handleStart}
            >
              {starting ? 'Generating case studies...' : 'Start Assessment'}
              <Sparkles size={16} />
            </button>
          </div>
        </Panel>
      )}

      {/* State 2: Generating */}
      {status === 'generating' && (
        <Panel title="Crafting your personalized scenarios">
          <div className="tw-empty">
            <div className="tw-empty-symbol"><Sparkles size={28} /></div>
            <h3>Generating tailored questions...</h3>
            <p>
              Our assessment architect is formulating practical written scenarios matching this event brief and your selected role. This typically takes 5–15 seconds.
            </p>
            <button className="tw-button secondary" onClick={() => assessmentResource.reload()}>Check status</button>
          </div>
        </Panel>
      )}

      {/* State 3: Ready or Draft */}
      {(status === 'ready' || status === 'draft') && data?.questions && (
        <Panel 
          title="Assigned Scenarios" 
          description={`Role: ${data.selected_role || 'Contributor'} · Total questions: ${data.questions.length}`}
          action={
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="tw-subtle">{saveStatus}</span>
              <button 
                type="button" 
                className="tw-button secondary" 
                disabled={saving} 
                onClick={() => autoSave(answers)}
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmit} style={{ padding: 20 }}>
            {data.questions.map((q, idx) => {
              const currentAns = answers[q.id] || '';
              return (
                <div key={q.id} className="tw-assessment-question">
                  <div className="tw-q-header">
                    <div>
                      <span className="tw-badge">Scenario {idx + 1} of {data.questions.length}</span>
                      <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>Target: {q.target_role} ({q.target_skill})</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="tw-badge" style={{ textTransform: 'capitalize' }}>{q.difficulty}</span>
                      <span className="tw-subtle" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} /> ~{q.estimated_time_minutes} min
                      </span>
                    </div>
                  </div>

                  <div className="tw-q-prompt">{q.prompt}</div>

                  <label className="tw-field">
                    <span style={{ fontSize: 12, color: 'var(--sf-muted)' }}>
                      {q.expected_response_format || 'Your written analysis and solution:'}
                    </span>
                    <textarea
                      required
                      minLength={20}
                      maxLength={10000}
                      rows={6}
                      value={currentAns}
                      onChange={e => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Explain your approach, key decisions, architectural trade-offs, and how you would address edge cases..."
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--sf-muted)' }}>
                      <span>Minimum 20 characters</span>
                      <span>{currentAns.length} / 10,000 characters</span>
                    </div>
                  </label>
                </div>
              );
            })}

            <div className="tw-formactions" style={{ marginTop: 24 }}>
              <button 
                type="button" 
                className="tw-button secondary" 
                disabled={saving || submitting} 
                onClick={() => autoSave(answers)}
              >
                Save Draft
              </button>
              <button 
                type="submit" 
                className="tw-button" 
                disabled={submitting}
              >
                {submitting ? 'Evaluating...' : 'Submit Assessment for AI Evaluation'}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* State 4: Evaluating */}
      {status === 'evaluating' && (
        <Panel title="Evaluation in progress">
          <div className="tw-empty">
            <div className="tw-empty-symbol"><Sparkles size={28} /></div>
            <h3>Analyzing your answers...</h3>
            <p>
              Your written solutions are being evaluated against the scenario rubrics and event requirements. You can safely refresh or return later; your progress is preserved.
            </p>
            <button className="tw-button secondary" onClick={() => assessmentResource.reload()}>Refresh Results</button>
          </div>
        </Panel>
      )}

      {/* State 5: Completed */}
      {status === 'completed' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <Panel title="Evaluation Results & Evidence Summary">
            <div className="tw-eval-card">
              <div className="tw-eval-top">
                <div>
                  <span className="tw-badge">Assessment Completed</span>
                  <h2 style={{ fontSize: 24, margin: '8px 0 6px' }}>
                    {data.evaluation_details?.role_suitability?.role_name || data.selected_role || 'Contributor'}
                  </h2>
                  <p style={{ color: 'var(--sf-muted)', maxWidth: 540 }}>
                    {data.evaluation_summary}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="tw-score-badge">
                    {Math.round(data.evaluation_score || 0)}<small style={{ fontSize: 14 }}>/100</small>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--sf-muted)', marginTop: 4 }}>
                    Fit: <strong>{data.evaluation_details?.role_suitability?.fit_level || 'Evaluated'}</strong>
                  </div>
                </div>
              </div>

              {/* Strengths and Improvements */}
              {data.evaluation_details?.strengths?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ fontSize: 12, color: 'var(--sf-secondary)' }}>Identified Strengths:</strong>
                  <div className="tw-pill-list">
                    {data.evaluation_details.strengths.map((str, idx) => (
                      <span key={idx} className="tw-pill-strength"><Check size={12} style={{ display: 'inline', marginRight: 4 }} />{str}</span>
                    ))}
                  </div>
                </div>
              )}

              {data.evaluation_details?.areas_to_improve?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ fontSize: 12, color: 'var(--sf-secondary)' }}>Areas to Strengthen:</strong>
                  <div className="tw-pill-list">
                    {data.evaluation_details.areas_to_improve.map((imp, idx) => (
                      <span key={idx} className="tw-pill-improve">{imp}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Evaluated skills */}
              {data.evaluation_details?.skill_estimates?.length > 0 && (
                <div>
                  <strong style={{ fontSize: 12, color: 'var(--sf-secondary)' }}>Assessed Skill Evidence:</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginTop: 8 }}>
                    {data.evaluation_details.skill_estimates.map((sk, idx) => (
                      <div key={idx} style={{ background: 'var(--sf-surface)', border: '1px solid var(--sf-border)', borderRadius: 6, padding: '10px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong>{sk.skill_name}</strong>
                          <span className="tw-badge">{Math.round(sk.score)}%</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--sf-muted)', marginTop: 4 }}>
                          {sk.evidence_summary}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions to proceed */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--sf-border)' }}>
                <Link className="tw-button" to={`/events/${encodeURIComponent(eventId)}/teams?create=1`}>
                  <Users size={16} />Create a Team
                </Link>
                <Link className="tw-button secondary" to={`/events/${encodeURIComponent(eventId)}/teams`}>
                  <Users size={16} />Find Teams to Join
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* State 6: Failed */}
      {status === 'failed' && (
        <Panel title="Assessment Error">
          <div className="tw-empty">
            <div className="tw-empty-symbol"><AlertTriangle size={28} /></div>
            <h3>We were unable to complete this evaluation</h3>
            <p>{data.error_message || 'The service encountered an issue processing your request.'}</p>
            <button className="tw-button" disabled={starting || submitting} onClick={data.questions?.length ? () => handleSubmit() : handleStart}>
              <RotateCcw size={16} /> {submitting || starting ? 'Retrying…' : data.questions?.length ? 'Retry evaluation' : 'Retry generation'}
            </button>
          </div>
        </Panel>
      )}
    </>
  );
}

