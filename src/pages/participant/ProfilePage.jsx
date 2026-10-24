// ─── Participant Profile Page ─────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Trash2, ExternalLink, Info, Save, Sparkles, RefreshCw,
  CheckCircle2, AlertCircle, Award, Compass, Zap, HelpCircle,
  FileText, Check, Upload, FileUp, CheckCircle
} from 'lucide-react';
import { useApp, useCurrentUser, PROFILE_TEMPLATES } from '../../app/AppContext';
import { Card, SectionHeader, Avatar, ProficiencyPips, Divider } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, SkillTag, categoryColor } from '../../components/ui/Badge';
import { PROFICIENCY_LEVELS, SKILL_LIBRARY } from '../../data/demoData';
import { useToast } from '../../hooks/useToast';
import LatticeLoader from '../../components/ui/LatticeLoader';
import { analyzeProfileEvidence, uploadProfileEvidence } from '../../services/aiService';



const ROLE_OPTIONS = [
  'Frontend Developer', 'Backend Developer', 'Full-stack Engineer',
  'UI/UX Designer', 'Project Manager', 'Data Engineer', 'AI/ML Engineer',
  'Research Lead', 'Creative Director', 'Team Lead', 'DevOps / Cloud',
];

const WORKING_STYLES = [
  'Async-first', 'Real-time pair programming', 'Rapid prototyper',
  'Systems thinker', 'Detail-oriented', 'Night owl', 'Early bird', 'Flexible hours',
];

const COLLABORATION_GOALS = [
  'Build an MVP to win', 'Learn new frameworks & skills',
  'Network & meet great builders', 'Research & experimental AI',
];

export default function ProfilePage() {
  const { state, dispatch } = useApp();
  const user = useCurrentUser();
  const toast = useToast();

  const isBrandNew = !user.name?.trim() || (user.skills?.length ?? 0) === 0;

  // Auto-enable edit mode if user hasn't set up their profile yet
  const [editMode, setEditMode] = useState(isBrandNew);
  const [form, setForm] = useState(() => ({
    name: user.name || '',
    tagline: user.tagline || '',
    bio: user.bio || '',
    initials: user.initials || 'YOU',
    skills: user.skills || [],
    interests: user.interests || [],
    preferredRoles: user.preferredRoles || [],
    workingStyles: user.workingStyles || ['Async-first', 'Rapid prototyper'],
    goal: user.goal || 'Build an MVP to win',
    availability: user.availability || { hoursPerWeek: 15, timezone: 'UTC+0', constraints: [] },
    links: {
      github: user.links?.github || '',
      portfolio: user.links?.portfolio || '',
      linkedin: user.links?.linkedin || '',
    },
  }));

  // Sync if current user changes in context
  useEffect(() => {
    setForm({
      name: user.name || '',
      tagline: user.tagline || '',
      bio: user.bio || '',
      initials: user.initials || 'YOU',
      skills: user.skills || [],
      interests: user.interests || [],
      preferredRoles: user.preferredRoles || [],
      workingStyles: user.workingStyles || ['Async-first', 'Rapid prototyper'],
      goal: user.goal || 'Build an MVP to win',
      availability: user.availability || { hoursPerWeek: 15, timezone: 'UTC+0', constraints: [] },
      links: {
        github: user.links?.github || '',
        portfolio: user.links?.portfolio || '',
        linkedin: user.links?.linkedin || '',
      },
    });
  }, [user.id]);

  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customSkill, setCustomSkill] = useState({ name: '', category: 'Frontend', proficiency: 2 });

  // AI Matching Simulation state using LatticeLoader
  const [simStatus, setSimStatus] = useState('idle'); // 'idle' | 'working' | 'done'

  // Resume & Portfolio Evidence Upload state
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceSourceType, setEvidenceSourceType] = useState('resume');
  const [analyzingEvidence, setAnalyzingEvidence] = useState(false);
  const [evidenceAnalysis, setEvidenceAnalysis] = useState(null);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'text'

  async function handleFileUpload(file) {
    if (!file) return;
    setUploadedFileName(file.name);
    setAnalyzingEvidence(true);
    try {
      toast.info(`Reading ${file.name}...`);
      const res = await uploadProfileEvidence(file, 'resume', form.name);
      setEvidenceAnalysis(res);
      toast.success(`Analyzed ${file.name}: found ${res.extracted_skills?.length || 0} skills!`);
    } catch (err) {
      toast.error('File analysis failed');
      console.error(err);
    } finally {
      setAnalyzingEvidence(false);
    }
  }

  async function handleAnalyzeEvidence() {
    if (!evidenceText.trim() || evidenceText.trim().length < 20) {
      toast.warn('Please paste at least a paragraph of resume, portfolio, or project text.');
      return;
    }
    setAnalyzingEvidence(true);
    try {
      const res = await analyzeProfileEvidence(evidenceText, evidenceSourceType, form.name);
      setEvidenceAnalysis(res);
      toast.success(`Extracted ${res.extracted_skills?.length || 0} skills from text!`);
    } catch (err) {
      toast.error('Analysis failed');
      console.error(err);
    } finally {
      setAnalyzingEvidence(false);
    }
  }


  function handleApplyExtractedSkills() {
    if (!evidenceAnalysis?.extracted_skills?.length) return;
    const existingMap = new Map((form.skills || []).map(s => [s.name.toLowerCase(), s]));

    const newSkills = [...(form.skills || [])];
    for (const es of evidenceAnalysis.extracted_skills) {
      const lower = es.skill_name.toLowerCase();
      if (existingMap.has(lower)) {
        const existing = existingMap.get(lower);
        if (es.estimated_proficiency > existing.proficiency) {
          existing.proficiency = es.estimated_proficiency;
          existing.evidenceSnippet = es.evidence_snippet;
          existing.isVerified = es.is_verified;
        }
      } else {
        const item = {
          id: `sk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: es.skill_name,
          category: es.category || 'Backend',
          proficiency: es.estimated_proficiency || 2,
          evidenceSnippet: es.evidence_snippet,
          isVerified: es.is_verified,
        };
        newSkills.push(item);
        existingMap.set(lower, item);
      }
    }

    const updatedRoles = Array.from(new Set([
      ...(form.preferredRoles || []),
      ...(evidenceAnalysis.preferred_roles || [])
    ]));

    setForm(f => ({
      ...f,
      skills: newSkills,
      preferredRoles: updatedRoles,
      bio: f.bio || evidenceAnalysis.summary || f.bio
    }));

    toast.success('Applied extracted skills and roles to your profile! Remember to save changes.');
    setShowEvidencePanel(false);
  }


  const filteredLibrary = useMemo(() => {
    const q = skillSearch.toLowerCase();
    const existing = new Set((form.skills || []).map(s => s.name.toLowerCase()));
    return SKILL_LIBRARY.filter(s => !existing.has(s.name.toLowerCase()) && (
      !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    )).slice(0, 15);
  }, [skillSearch, form.skills]);

  // Derived initials
  function computeInitials(name) {
    if (!name?.trim()) return 'YOU';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function handleNameChange(newName) {
    setForm(f => ({
      ...f,
      name: newName,
      initials: computeInitials(newName),
    }));
  }

  function saveProfile() {
    if (!form.name.trim()) {
      toast.warn('Please enter a display name so teammates can identify you.');
      return;
    }
    const initials = computeInitials(form.name);
    const updatedData = { ...form, initials, isNew: false };
    dispatch({ type: 'UPDATE_PROFILE', payload: { id: user.id, data: updatedData } });
    setEditMode(false);
    toast.success('Your profile is saved and active across TeamWeave!');
  }

  function applyTemplate(tpl) {
    setForm(f => ({
      ...f,
      name: tpl.data.name || f.name,
      initials: computeInitials(tpl.data.name || f.name),
      tagline: tpl.data.tagline,
      bio: tpl.data.bio,
      skills: [...tpl.data.skills],
      interests: [...tpl.data.interests],
      preferredRoles: [...tpl.data.preferredRoles],
    }));
    toast.info(`Loaded "${tpl.name}" template. You can now tweak it to match yourself.`);
  }

  function clearToBlank() {
    setForm(f => ({
      ...f,
      name: '',
      initials: 'YOU',
      tagline: '',
      bio: '',
      skills: [],
      interests: [],
      preferredRoles: [],
    }));
    toast.info('Cleared profile fields — ready to build from scratch.');
  }

  function addSkillFromLibrary(libSkill) {
    const newSkill = { id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: libSkill.name, category: libSkill.category, proficiency: 2 };
    setForm(f => ({ ...f, skills: [...(f.skills || []), newSkill] }));
    setSkillSearch('');
    setShowSkillPicker(false);
  }

  function addCustomSkill() {
    if (!customSkill.name.trim()) return;
    const newSkill = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: customSkill.name.trim(),
      category: customSkill.category,
      proficiency: Number(customSkill.proficiency),
    };
    setForm(f => ({ ...f, skills: [...(f.skills || []), newSkill] }));
    setCustomSkill({ name: '', category: 'Frontend', proficiency: 2 });
    setAddingCustom(false);
  }

  function updateSkillProficiency(skillId, proficiency) {
    setForm(f => ({
      ...f,
      skills: (f.skills || []).map(s => s.id === skillId ? { ...s, proficiency } : s),
    }));
  }

  function removeSkill(skillId) {
    setForm(f => ({ ...f, skills: (f.skills || []).filter(s => s.id !== skillId) }));
  }

  function toggleRole(role) {
    setForm(f => ({
      ...f,
      preferredRoles: (f.preferredRoles || []).includes(role)
        ? f.preferredRoles.filter(r => r !== role)
        : [...(f.preferredRoles || []), role],
    }));
  }

  function toggleWorkingStyle(style) {
    setForm(f => ({
      ...f,
      workingStyles: (f.workingStyles || []).includes(style)
        ? f.workingStyles.filter(s => s !== style)
        : [...(f.workingStyles || []), style],
    }));
  }

  function runMatchingSimulation() {
    setSimStatus('working');
    setTimeout(() => {
      setSimStatus('done');
    }, 1800);
  }

  const displayUser = editMode ? form : user;
  const currentSkills = displayUser.skills || [];

  // Profile readiness checklist
  const hasName = Boolean(displayUser.name?.trim());
  const hasTagline = Boolean(displayUser.tagline?.trim());
  const hasMinSkills = currentSkills.length >= 3;
  const hasRoles = (displayUser.preferredRoles?.length ?? 0) > 0;
  const hasLinks = Boolean(displayUser.links?.github || displayUser.links?.portfolio || displayUser.links?.linkedin);

  const completionChecks = [hasName, hasTagline, hasMinSkills, hasRoles, hasLinks];
  const completionPercentage = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-7 animate-fadeIn pb-16">
      {/* Onboarding & Mission Banner */}
      <div className="bg-gradient-to-r from-teal-pale via-surface to-cobalt-light/20 border border-teal/20 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-teal/15 text-teal"><Sparkles size={16} /></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal">Make Your Profile Understood</span>
            </div>
            <h2 className="text-xl font-heading font-bold text-ink">
              Build your true collaborator profile
            </h2>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              TeamWeave doesn't rely on generic match percentages or random assignment. Organizers and formation engines match teammates by reading your specific skills, proficiency depth, and working style.
            </p>
          </div>

          <div className="bg-surface/90 border border-border rounded-xl p-3 text-center min-w-36 shrink-0 shadow-sm">
            <div className="text-xs text-ink-muted uppercase font-semibold">Match Readiness</div>
            <div className="text-2xl font-heading font-bold text-teal mt-0.5">{completionPercentage}%</div>
            <div className="w-24 h-1.5 bg-paper rounded-full overflow-hidden mx-auto mt-1.5">
              <div
                className="h-full bg-teal transition-all duration-500 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick starter kit toolbar when in edit mode */}
        {editMode && (
          <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ink-muted font-medium">Quick Starters:</span>
            <button
              onClick={clearToBlank}
              className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-ink-muted text-ink-secondary hover:text-ink transition-colors cursor-pointer"
            >
              Start completely blank
            </button>
            {PROFILE_TEMPLATES.filter(t => t.id !== 'blank').map(tpl => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className="px-2.5 py-1 rounded-lg bg-surface border border-teal/30 hover:border-teal text-teal-dark hover:bg-teal-pale transition-colors cursor-pointer"
                title={tpl.description}
              >
                {tpl.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profile Header Card */}
      <div className="flex items-start justify-between gap-4 flex-wrap bg-surface border border-border rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-4">
          <Avatar initials={displayUser.initials || 'YOU'} size="xl" index={0} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-bold text-ink">
                {displayUser.name?.trim() ? displayUser.name : 'Your Name Here'}
              </h1>
              {displayUser.isNew && (
                <Badge color="coral" size="xs">Profile in setup</Badge>
              )}
            </div>
            <p className="text-sm text-ink-secondary mt-0.5">
              {displayUser.tagline?.trim() ? displayUser.tagline : 'Add a short professional tagline (e.g. Full-stack Developer / ML Researcher)'}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-ink-muted flex-wrap">
              <span>{currentSkills.length} skills listed</span>
              <span>·</span>
              <span>{(displayUser.preferredRoles || []).length} preferred roles</span>
              <span>·</span>
              <span>{displayUser.availability?.hoursPerWeek || 15}h/week</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setForm({ ...user });
                  setEditMode(false);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" icon={<Save size={14} />} onClick={saveProfile}>
                Save profile
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditMode(true)}
            >
              Edit profile
            </Button>
          )}
        </div>
      </div>

      {/* AI Match Readiness & Simulation Card */}
      <Card className="bg-gradient-to-br from-surface to-paper border-border">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <Zap size={15} className="text-gold" />
              AI Match Simulation & Requirement Coverage
            </h3>
            <p className="text-xs text-ink-secondary mt-0.5">
              Test how team formation engines interpret your skills for upcoming events.
            </p>
          </div>
          <Button
            size="xs"
            variant="outline"
            icon={<Compass size={13} />}
            onClick={runMatchingSimulation}
            disabled={simStatus === 'working'}
          >
            {simStatus === 'working' ? 'Analyzing...' : 'Run Simulation'}
          </Button>
        </div>

        {/* LatticeLoader Display */}
        {simStatus !== 'idle' && (
          <div className="mt-4 p-4 rounded-xl bg-cobalt-light/10 border border-cobalt/20 flex items-center justify-between">
            <LatticeLoader
              label="Simulating AI team compatibility..."
              doneLabel="Ready: Matched to 6 event requirements in"
              status={simStatus}
              pattern="orbit"
              grid={3}
              cellSize={6}
              glow
              color="#0d9488"
              doneColor="#10b981"
            />
          </div>
        )}

        {/* Readiness Checklist */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border text-xs">
          <div className="flex items-center gap-2">
            {hasName ? <CheckCircle2 size={14} className="text-teal" /> : <AlertCircle size={14} className="text-coral" />}
            <span className={hasName ? 'text-ink' : 'text-ink-muted'}>Display name</span>
          </div>
          <div className="flex items-center gap-2">
            {hasMinSkills ? <CheckCircle2 size={14} className="text-teal" /> : <AlertCircle size={14} className="text-coral" />}
            <span className={hasMinSkills ? 'text-ink' : 'text-ink-muted'}>3+ skills rated</span>
          </div>
          <div className="flex items-center gap-2">
            {hasRoles ? <CheckCircle2 size={14} className="text-teal" /> : <AlertCircle size={14} className="text-coral" />}
            <span className={hasRoles ? 'text-ink' : 'text-ink-muted'}>Preferred role</span>
          </div>
          <div className="flex items-center gap-2">
            {hasLinks ? <CheckCircle2 size={14} className="text-teal" /> : <AlertCircle size={14} className="text-coral" />}
            <span className={hasLinks ? 'text-ink' : 'text-ink-muted'}>External link</span>
          </div>
        </div>
      </Card>

      {/* Basic Identity & About */}
      <Card>
        <SectionHeader title="About You" subtitle="Describe your background and what excites you." />
        {editMode ? (
          <div className="space-y-4">
            <Field label="Display Name" required>
              <input
                className="input-base"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Jordan Rivera"
              />
            </Field>
            <Field label="Tagline / Professional Headline">
              <input
                className="input-base"
                value={form.tagline}
                onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                placeholder="e.g. Full-stack builder passionate about accessible web apps & LLMs"
              />
            </Field>
            <Field label="Bio & Interests">
              <textarea
                className="input-base min-h-24 resize-y"
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell potential teammates about your projects, tools you love using, and what you are looking forward to building."
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-ink-secondary leading-relaxed">
              {displayUser.bio?.trim() ? displayUser.bio : <span className="text-ink-muted italic">No bio written yet. Click "Edit profile" to share your story.</span>}
            </p>
          </div>
        )}
      </Card>

      {/* Skills & Proficiencies */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <SectionHeader
              title="Skills & Proficiencies"
              subtitle="Rate your confidence honestly so teams can balance technical depth."
            />
          </div>
          <Button
            size="xs"
            variant="secondary"
            icon={<Upload size={13} className="text-purple-400" />}
            onClick={() => setShowEvidencePanel(!showEvidencePanel)}
            className="border border-border bg-surface text-ink hover:border-purple-400"
          >
            {showEvidencePanel ? 'Hide upload' : 'Upload Resume / Evidence'}
          </Button>
        </div>

        {/* Normal Resume / Evidence Upload Zone */}
        {showEvidencePanel && (
          <div className="mb-5 p-4 rounded-xl border border-dashed border-purple-500/30 bg-paper/80 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <FileUp size={16} className="text-purple-400" /> Upload Resume or Portfolio
                </h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  Upload an image of your resume (PNG, JPG), PDF document, or paste text to auto-fill your profile.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border shrink-0 self-start sm:self-auto text-xs">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`px-2.5 py-1 rounded-md transition-colors font-medium ${uploadMode === 'file' ? 'bg-purple-600 text-white shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('text')}
                  className={`px-2.5 py-1 rounded-md transition-colors font-medium ${uploadMode === 'text' ? 'bg-purple-600 text-white shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                >
                  Paste Text
                </button>
              </div>
            </div>

            {uploadMode === 'file' ? (
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-surface hover:border-purple-400/50 transition-colors text-center cursor-pointer relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf,.txt,.md,.pdf,.png,.jpg,.jpeg"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
                <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 mb-2">
                  <Upload size={22} />
                </div>
                <p className="text-sm font-medium text-ink">
                  {analyzingEvidence ? 'Reading and analyzing document...' : 'Click or drag & drop to upload'}
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  Supports PDF resumes, photos/screenshots (PNG, JPG), or text docs
                </p>
                {uploadedFileName && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs">
                    <FileText size={12} /> {uploadedFileName}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  className="input-base min-h-24 text-xs font-mono"
                  placeholder="Paste resume text, LinkedIn profile summary, or project descriptions..."
                  value={evidenceText}
                  onChange={e => setEvidenceText(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    loading={analyzingEvidence}
                    onClick={handleAnalyzeEvidence}
                    className="bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    Extract skills
                  </Button>
                </div>
              </div>
            )}

            {/* Analysis Results Display */}
            {evidenceAnalysis && (
              <div className="pt-3 border-t border-border space-y-3">
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <p className="text-xs text-ink font-medium leading-relaxed">{evidenceAnalysis.summary}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Extracted Skills ({evidenceAnalysis.extracted_skills?.length || 0}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {evidenceAnalysis.extracted_skills?.map((sk, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-surface border border-border text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink">{sk.skill_name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Level {sk.estimated_proficiency} · {sk.proficiency_label || PROFICIENCY_LEVELS.find(l => l.value === sk.estimated_proficiency)?.label || 'Developing'}
                          </span>
                        </div>

                        {sk.evidence_snippet && (
                          <p className="text-[11px] text-ink-muted italic line-clamp-2">
                            "{sk.evidence_snippet}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    icon={<Check size={14} />}
                    onClick={handleApplyExtractedSkills}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    Apply to Profile
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Proficiency Scale Guide */}
        <div className="mb-4 p-3 bg-paper border border-border rounded-xl text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">

          {PROFICIENCY_LEVELS.map(lvl => (
            <div key={lvl.value} className="space-y-0.5">
              <div className="font-semibold text-ink flex items-center gap-1.5">
                <ProficiencyPips level={lvl.value} />
                <span>{lvl.label}</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-tight">{lvl.description}</p>
            </div>
          ))}
        </div>

        {/* Skill Rows */}
        {currentSkills.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl bg-paper/50">
            <p className="text-sm font-medium text-ink">No skills listed yet</p>
            <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
              Add the tools, languages, and frameworks you want to collaborate with.
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {currentSkills.map(skill => (
              <SkillRow
                key={skill.id}
                skill={skill}
                editMode={editMode}
                onProficiencyChange={v => updateSkillProficiency(skill.id, v)}
                onRemove={() => removeSkill(skill.id)}
              />
            ))}
          </div>
        )}

        {/* Skill Add controls when editing */}
        {editMode && (
          <div className="mt-4 pt-3 border-t border-border space-y-3">
            <div className="relative">
              <input
                className="input-base pr-8"
                placeholder="Search 50+ skills in the library (e.g. React, Python, Figma, Docker)..."
                value={skillSearch}
                onChange={e => { setSkillSearch(e.target.value); setShowSkillPicker(true); }}
                onFocus={() => setShowSkillPicker(true)}
              />
              {skillSearch && (
                <button
                  onClick={() => setSkillSearch('')}
                  className="absolute right-2 top-2.5 text-ink-muted hover:text-ink text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Library Suggestions */}
            {showSkillPicker && filteredLibrary.length > 0 && (
              <div className="border border-border rounded-xl bg-surface shadow-elevated max-h-56 overflow-y-auto divide-y divide-border">
                {filteredLibrary.map(s => (
                  <button
                    key={s.id}
                    onClick={() => addSkillFromLibrary(s)}
                    className="w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between hover:bg-paper transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Badge color={categoryColor(s.category)} size="xs">{s.category}</Badge>
                      <span className="font-medium text-ink">{s.name}</span>
                    </div>
                    <span className="text-xs text-teal font-medium">+ Add</span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom Skill Creator */}
            {!addingCustom ? (
              <Button
                variant="ghost"
                size="xs"
                icon={<Plus size={13} />}
                onClick={() => setAddingCustom(true)}
              >
                Add custom skill not in library
              </Button>
            ) : (
              <div className="border border-border rounded-xl p-3.5 bg-paper space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink uppercase">New Custom Skill</span>
                  <button onClick={() => setAddingCustom(false)} className="text-xs text-ink-muted hover:text-ink">Cancel</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    className="input-base"
                    placeholder="Skill name (e.g. Next.js, Rust)"
                    value={customSkill.name}
                    onChange={e => setCustomSkill(c => ({ ...c, name: e.target.value }))}
                  />
                  <select
                    className="input-base"
                    value={customSkill.category}
                    onChange={e => setCustomSkill(c => ({ ...c, category: e.target.value }))}
                  >
                    {['Frontend', 'Backend', 'Data', 'AI/ML', 'Design', 'DevOps', 'Creative', 'Management', 'Soft Skills', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    className="input-base"
                    value={customSkill.proficiency}
                    onChange={e => setCustomSkill(c => ({ ...c, proficiency: Number(e.target.value) }))}
                  >
                    {PROFICIENCY_LEVELS.map(l => (
                      <option key={l.value} value={l.value}>{l.label} (Level {l.value})</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="xs" variant="ghost" onClick={() => setAddingCustom(false)}>Cancel</Button>
                  <Button size="xs" onClick={addCustomSkill}>Add to profile</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Preferred Roles & Collaboration Style */}
      <Card>
        <SectionHeader
          title="Roles & Working Preferences"
          subtitle="Helps the matching engine balance leadership, execution, and collaboration styles."
        />

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-2">
              Preferred Contribution Roles
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map(role => {
                const selected = (displayUser.preferredRoles || []).includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => editMode && toggleRole(role)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? 'bg-teal-pale border-teal text-teal-dark shadow-sm'
                        : 'bg-surface border-border text-ink-secondary'
                    } ${editMode ? 'cursor-pointer hover:border-teal' : 'cursor-default'}`}
                  >
                    {selected ? '✓ ' : ''}{role}
                  </button>
                );
              })}
            </div>
          </div>

          <Divider />

          <div>
            <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block mb-2">
              Working Styles & Habits
            </label>
            <div className="flex flex-wrap gap-2">
              {WORKING_STYLES.map(style => {
                const selected = (displayUser.workingStyles || []).includes(style);
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => editMode && toggleWorkingStyle(style)}
                    className={`px-3 py-1 rounded-lg text-xs border transition-all ${
                      selected
                        ? 'bg-cobalt-light/30 border-cobalt text-cobalt font-medium'
                        : 'bg-surface border-border text-ink-muted'
                    } ${editMode ? 'cursor-pointer hover:border-cobalt' : 'cursor-default'}`}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Availability */}
      <Card>
        <SectionHeader title="Time Commitment & Timezone" />
        {editMode ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Hours per week dedicated to events">
              <input
                type="number"
                className="input-base"
                value={form.availability?.hoursPerWeek || 15}
                onChange={e => setForm(f => ({
                  ...f,
                  availability: { ...f.availability, hoursPerWeek: Math.max(1, Number(e.target.value)) },
                }))}
                min={1}
                max={60}
              />
            </Field>
            <Field label="Primary Timezone">
              <input
                className="input-base"
                value={form.availability?.timezone || 'UTC+0'}
                onChange={e => setForm(f => ({
                  ...f,
                  availability: { ...f.availability, timezone: e.target.value },
                }))}
                placeholder="e.g. UTC-5, UTC+1, UTC+5:30"
              />
            </Field>
          </div>
        ) : (
          <div className="flex gap-6 text-sm text-ink-secondary">
            <span><strong className="text-ink">{displayUser.availability?.hoursPerWeek || 15}h</strong> / week</span>
            <span>Timezone: <strong className="text-ink">{displayUser.availability?.timezone || 'UTC+0'}</strong></span>
          </div>
        )}
      </Card>

      {/* Portfolio & External Evidence */}
      <Card>
        <SectionHeader
          title="Verified Links & Portfolios"
          subtitle="External proof allows teammates to see your past work."
        />
        {editMode ? (
          <div className="space-y-3">
            <Field label="GitHub URL">
              <input
                className="input-base"
                value={form.links?.github || ''}
                onChange={e => setForm(f => ({ ...f, links: { ...f.links, github: e.target.value } }))}
                placeholder="https://github.com/yourhandle"
              />
            </Field>
            <Field label="Portfolio or Website">
              <input
                className="input-base"
                value={form.links?.portfolio || ''}
                onChange={e => setForm(f => ({ ...f, links: { ...f.links, portfolio: e.target.value } }))}
                placeholder="https://yourportfolio.dev"
              />
            </Field>
            <Field label="LinkedIn or Twitter/X">
              <input
                className="input-base"
                value={form.links?.linkedin || ''}
                onChange={e => setForm(f => ({ ...f, links: { ...f.links, linkedin: e.target.value } }))}
                placeholder="https://linkedin.com/in/yourhandle"
              />
            </Field>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm">
            {displayUser.links?.github ? (
              <a href={displayUser.links.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-cobalt hover:underline">
                <ExternalLink size={14} /> GitHub
              </a>
            ) : <span className="text-ink-muted">No GitHub linked</span>}

            {displayUser.links?.portfolio && (
              <a href={displayUser.links.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-cobalt hover:underline">
                <ExternalLink size={14} /> Portfolio
              </a>
            )}

            {displayUser.links?.linkedin && (
              <a href={displayUser.links.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-cobalt hover:underline">
                <ExternalLink size={14} /> LinkedIn
              </a>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function SkillRow({ skill, editMode, onProficiencyChange, onRemove }) {
  const prof = PROFICIENCY_LEVELS.find(l => l.value === skill.proficiency);
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 border border-border rounded-xl bg-surface hover:bg-paper/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink">{skill.name}</span>
          <Badge color={categoryColor(skill.category)} size="xs">{skill.category}</Badge>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-paper border border-border text-ink-secondary">
            Level {skill.proficiency} · {prof?.label}
          </span>
        </div>
        <p className="text-xs text-ink-muted mt-0.5 truncate">{prof?.description}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {editMode ? (
          <select
            value={skill.proficiency}
            onChange={e => onProficiencyChange(Number(e.target.value))}
            className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-paper text-ink focus:outline-none focus:border-teal"
          >
            {PROFICIENCY_LEVELS.map(l => (
              <option key={l.value} value={l.value}>
                Level {l.value} — {l.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-right">
            <ProficiencyPips level={skill.proficiency} />
            <p className="text-[11px] text-ink-muted mt-0.5">{prof?.label}</p>
          </div>
        )}

        {editMode && (
          <button
            onClick={onRemove}
            className="text-ink-muted hover:text-red-500 transition-colors p-1 cursor-pointer"
            title="Remove skill"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, required = false, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-coral">*</span>}
      </label>
      {children}
    </div>
  );
}
