import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckCircle, Users, Zap, Shield, Sparkles, ChevronDown, LogIn, UserPlus
} from 'lucide-react';
import { BrandWordmark } from '../../components/ui/BrandMark';
import { Button } from '../../components/ui/Button';
import { LivingWeaveViz } from '../../components/teams/LivingWeaveViz';
import { TeamBlueprint } from '../../components/teams/TeamBlueprint';
import { EventCard } from '../../components/events/EventCard';
import LightRays from '../../components/ui/LightRays';
import PeekRating from '../../components/ui/PeekRating';
import { AuthModal } from '../../components/auth/AuthModal';
import { PARTICIPANTS, EVENTS, TEAMS, EVENT_CATEGORIES } from '../../data/demoData';

const demoTeam = TEAMS[0];
const demoEvent = EVENTS[0];
const demoParticipants = PARTICIPANTS;

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Build your profile',
    description: 'Add your skills and proficiency levels once. Reuse them across every event you join.',
    accent: '#C5ADE5',
    badge: 'bg-[var(--sf-panel)] text-[var(--sf-accent-text)] border-[var(--sf-border)]',
  },
  {
    step: '02',
    title: 'Join an event',
    description: 'Browse events across dozens of categories. Your existing profile answers most questions automatically.',
    accent: '#B69BD8',
    badge: 'bg-[var(--sf-panel)] text-[var(--sf-accent-text)] border-[var(--sf-border)]',
  },
  {
    step: '03',
    title: 'Get a balanced team',
    description: 'The formation engine reads actual skills and requirements — not random groupings.',
    accent: '#590f0e',
    badge: 'bg-[var(--sf-panel)] text-[var(--sf-accent-text)] border-[var(--sf-border)]',
  },
  {
    step: '04',
    title: 'Understand your team',
    description: 'The Team Blueprint shows every skill contribution and every coverage gap before work begins.',
    accent: 'var(--sf-accent-text)',
    badge: 'bg-[var(--sf-panel)] text-[var(--sf-text)] border-[#C5ADE5]',
  },
];

const VALUE_PROPS = [
  { icon: <CheckCircle size={18} />, label: 'Requirements-first', desc: 'Every recommendation traces to a specific event requirement, not an opaque score.', color: 'text-[var(--sf-accent-text)]', bg: 'bg-[var(--sf-panel)] border-[var(--sf-border)]' },
  { icon: <Shield size={18} />, label: 'Transparent gaps', desc: 'A missing critical skill is never hidden behind a high overall match percentage.', color: 'text-[var(--sf-accent-text)]', bg: 'bg-[var(--sf-panel)] border-[#C5ADE5]' },
  { icon: <Zap size={18} />, label: 'Reusable profiles', desc: 'Participants fill in their skills once. Every future event reuses verified profile data.', color: 'text-[var(--sf-text)]', bg: 'bg-[var(--sf-panel)] border-[var(--sf-border)]' },
  { icon: <Users size={18} />, label: 'Any event type', desc: 'Hackathons, debates, research sprints, creative jams — configurable for any scale.', color: 'text-[var(--sf-accent-text)]', bg: 'bg-[var(--sf-panel)] border-[var(--sf-border)]' },
];

export default function LandingPage() {
  const [feedbackScore, setFeedbackScore] = useState(4);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('signin');
  const navigate = useNavigate();

  function openAuth(tab = 'signin') {
    setAuthTab(tab);
    setAuthOpen(true);
  }

  return (
    <div className="relative min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text)] overflow-x-hidden">
      {/* ─── Content ─── */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ─── FULL VIEWPORT HERO WITH WINE+GARNET LIGHT RAYS ─── */}
        {/* ─── FULL VIEWPORT HERO WITH OBSIDIAN + CRIMSON LIGHT RAYS ─── */}
        <div className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden border-b border-[var(--sf-border)]/60 bg-[var(--sf-bg)]">
          {/* LightRays atmospheric canvas in Crimson #C5ADE5 tone */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <LightRays
              raysOrigin="top-center"
              raysColor="#C5ADE5"
              raysSpeed={0.9}
              lightSpread={0.52}
              rayLength={3.2}
              glow={0.55}
              haze={0.3}
              followMouse
              mouseInfluence={0.12}
              rayDensity={1.1}
              tilt={0}
              raySharpness={0.35}
              atmosphere={0.9}
              intensity={0.95}
              fadeDistance={1}
              saturation={1}
              noiseAmount={0}
              distortion={0}
              pulsating={false}
              cursorShadow
              clickPulse
              intro
              lightMode={false}
            />
          </div>

          {/* ─── Floating Transparent Navigation ─── */}
          <div className="relative z-50 w-full">
            <header className="bg-transparent border-b border-[var(--sf-border)]/40 backdrop-blur-[2px]">
              <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
                <BrandWordmark size={18} />
                <nav className="hidden md:flex items-center gap-8 text-sm">
                  <a href="#how-it-works" className="text-[var(--sf-secondary)] hover:text-[var(--sf-accent-text)] transition-colors font-medium">How it works</a>
                  <a href="#blueprint"    className="text-[var(--sf-secondary)] hover:text-[var(--sf-accent-text)] transition-colors font-medium">Blueprint</a>
                  <a href="#event-types"  className="text-[var(--sf-secondary)] hover:text-[var(--sf-accent-text)] transition-colors font-medium">Event types</a>
                  <Link to="/organizer/auth" className="text-[var(--sf-accent-text)] hover:text-[var(--sf-text)] transition-colors font-medium">
                    For Organizers
                  </Link>
                </nav>
                <div className="flex items-center gap-3">
                  <Link to="/organizer/auth" className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[var(--sf-accent-text)] hover:text-[var(--sf-text)] px-3 py-1.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-panel)] hover:bg-[var(--sf-surface)] hover:border-[#C5ADE5]/60 transition-all">
                    <span>Host an Event</span>
                  </Link>

                  <Link to="/events" className="text-sm font-medium text-[var(--sf-secondary)] hover:text-[var(--sf-text)] transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                    Browse events
                  </Link>

                  <Link
                    to="/login"
                    className="text-xs sm:text-sm font-medium text-[var(--sf-secondary)] hover:text-[var(--sf-text)] px-3.5 py-1.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-panel)] hover:bg-[var(--sf-surface)] transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-[#C5ADE5]"
                  >
                    <LogIn size={13} className="text-[#C5ADE5]" />
                    <span>Login</span>
                  </Link>

                  <Link
                    to="/login?tab=signup"
                    className="text-xs sm:text-sm font-semibold text-ink px-4 py-1.5 rounded-xl bg-[#C5ADE5] hover:bg-[#B69BD8] shadow-lg shadow-[#C5ADE5]/30 hover:shadow-[#B69BD8]/40 transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-[#C5ADE5]"
                  >
                    <UserPlus size={13} />
                    <span>Get Started</span>
                  </Link>
                </div>
              </div>
            </header>
          </div>

          {/* Hero Center Content with Obsidian + Crimson Aesthetics */}
          <div className="relative z-10 max-w-4xl mx-auto px-5 text-center pointer-events-auto my-auto py-8">
            {/* Eyebrow tag */}
            <div className="inline-flex items-center gap-2 flex-wrap mb-5 justify-center">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-mono tracking-wider uppercase font-semibold bg-[var(--sf-panel)] text-[var(--sf-secondary)] border border-[var(--sf-border)] shadow-sm shadow-black/60">
                <Sparkles size={11} className="text-[#C5ADE5]" /> Skill-Based Teaming Architecture
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black leading-[1.08] tracking-tight mb-5">
              <span className="text-[var(--sf-text)] tracking-tight">BETTER-BALANCED</span>
              <br />
              <span className="text-gradient-purple tracking-tight">TEAMS THAT WORK</span>
            </h1>

            <p className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto mb-8 text-[var(--sf-secondary)]">
              <strong className="text-[var(--sf-text)] font-semibold">Skillfy</strong> forms teams by reading participant skills and event requirements — not random groupings.
              Every recommendation comes with an <span className="text-[var(--sf-accent-text)] font-semibold">explanation</span>. Every gap is <span className="text-[var(--sf-text)] font-semibold">shown, not hidden</span>.
            </p>

            <div className="flex flex-wrap gap-4 justify-center items-center">
              <Link
                to="/login?tab=signup"
                className="py-3 px-6 rounded-xl font-semibold text-sm text-ink bg-[#C5ADE5] hover:bg-[#B69BD8] shadow-lg shadow-[#C5ADE5]/40 hover:shadow-[#B69BD8]/50 transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-[#C5ADE5]"
              >
                <span>Find Your Team</span>
                <ArrowRight size={15} />
              </Link>

              <Link to="/events">
                <Button variant="secondary" size="md">
                  Explore Events
                </Button>
              </Link>
            </div>
          </div>

          {/* Scroll Down Indicator */}
          <a
            href="#how-it-works"
            className="relative z-10 pb-6 flex flex-col items-center gap-1.5 text-xs text-[var(--sf-muted)] hover:text-[var(--sf-accent-text)] transition-colors group cursor-pointer"
          >
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-80 group-hover:opacity-100">Explore Process</span>
            <ChevronDown size={16} className="animate-bounce text-[#C5ADE5]" />
          </a>
        </div>

        {/* ─── How it works ─── */}
        <section id="how-it-works" className="py-20 border-b border-[var(--sf-border)]/60 bg-[var(--sf-panel)]/40">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-[var(--sf-accent-text)] uppercase mb-3">The Process</p>
              <h2 className="text-3xl font-heading font-bold text-ink">How team formation works</h2>
              <p className="mt-3 max-w-xl mx-auto text-[var(--sf-secondary)]">Four steps from profile to a team you can trust.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PROCESS_STEPS.map(step => (
                <div key={step.step} className="p-5 rounded-2xl border border-[var(--sf-border)] bg-[var(--sf-panel)]/80 backdrop-blur-sm shadow-card">
                  <div className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded-md border mb-4 ${step.badge}`}>{step.step}</div>
                  <h3 className="font-heading font-semibold text-ink mb-2 text-[15px]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--sf-secondary)]">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Team Blueprint & LivingWeave ─── */}
        <section id="blueprint" className="max-w-6xl mx-auto px-5 py-20 grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[var(--sf-panel)] text-[var(--sf-accent-text)] border border-[var(--sf-border)]">
                Living Weave Algorithm
              </span>
              <span className="text-xs text-[var(--sf-muted)]">Real-time skill balance</span>
            </div>
            <h2 className="text-3xl font-heading font-bold text-ink">
              The Team<br /><span className="text-[var(--sf-accent-text)]">Blueprint</span>
            </h2>
            <p className="leading-relaxed text-[var(--sf-secondary)]">
              Every proposed team includes a Blueprint: who contributes what, which requirements are met,
              and what gaps remain. No black-box scores. Full visibility before work starts.
            </p>

            <div className="rounded-2xl border border-[var(--sf-border)] overflow-hidden bg-[var(--sf-panel)]/90 p-4 shadow-card">
              <LivingWeaveViz team={demoTeam} participants={demoParticipants} />
            </div>

            <div className="space-y-2.5">
              {[
                { title: 'Coverage at a glance', desc: 'See instantly whether the team meets required capabilities.', col: 'text-[var(--sf-accent-text)]' },
                { title: 'Individual role clarity', desc: 'Every member knows why they were placed on the team.', col: 'text-[var(--sf-accent-text)]' },
                { title: 'Explicit gap callouts', desc: 'Missing skills are highlighted so teams can plan around them.', col: 'text-rose-400' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-panel)]/70 backdrop-blur-sm">
                  <CheckCircle size={15} className={`${item.col} shrink-0 mt-0.5`} />
                  <div>
                    <h4 className={`text-sm font-semibold ${item.col}`}>{item.title}</h4>
                    <p className="text-xs mt-0.5 text-[var(--sf-secondary)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-5 border border-[var(--sf-border)] bg-[var(--sf-panel)]/85 backdrop-blur-md shadow-card">
            <TeamBlueprint team={demoTeam} participants={demoParticipants} event={demoEvent} showReasons />
          </div>
        </section>

        {/* ─── Event types ─── */}
        <section id="event-types" className="py-20 border-y border-[var(--sf-border)]/60 bg-[var(--sf-bg)]/60">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-amber-400 uppercase mb-3">Event Types</p>
              <h2 className="text-3xl font-heading font-bold text-ink">Built for any collaboration format</h2>
              <p className="mt-3 max-w-xl mx-auto text-[var(--sf-secondary)]">
                Configure requirement templates, evaluation rules, and team sizes for each event type.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {EVENT_CATEGORIES.map(cat => (
                <div key={cat.id} className="p-4 rounded-xl flex items-center justify-between border border-[var(--sf-border)] bg-[var(--sf-panel)]/90 backdrop-blur-sm hover:border-[#C5ADE5]/60 transition-colors shadow-card">
                  <div>
                    <h3 className="font-medium text-ink text-sm">{cat.label}</h3>
                    <p className="text-xs mt-0.5 text-[var(--sf-muted)]">Custom requirement profiles</p>
                  </div>
                  <Link to={`/events?category=${cat.id}`} className="text-xs text-[var(--sf-accent-text)] hover:text-[var(--sf-text)] flex items-center gap-1 font-medium transition-colors">
                    Explore <ArrowRight size={11} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Sample events ─── */}
        <section className="max-w-6xl mx-auto px-5 py-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[11px] font-mono tracking-widest text-[var(--sf-accent-text)] uppercase mb-1">Live Demo Data</p>
              <h2 className="text-2xl font-heading font-bold text-ink">Sample events</h2>
            </div>
            <Link to="/events" className="text-sm text-[var(--sf-secondary)] hover:text-ink flex items-center gap-1 font-medium transition-colors">
              All events <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EVENTS.slice(0, 3).map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>

        {/* ─── Design principles ─── */}
        <section className="py-20 border-t border-[var(--sf-border)]/60 bg-[var(--sf-panel)]/40">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-[var(--sf-accent-text)] uppercase mb-3">Philosophy</p>
              <h2 className="text-2xl font-heading font-bold text-ink">Design principles</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {VALUE_PROPS.map(vp => (
                <div key={vp.label} className="text-center space-y-3 p-4 rounded-2xl bg-[var(--sf-panel)]/60 border border-[var(--sf-border)]">
                  <div className={`w-11 h-11 rounded-xl ${vp.bg} ${vp.color} flex items-center justify-center mx-auto border`}>{vp.icon}</div>
                  <h3 className={`font-heading font-semibold text-sm ${vp.color}`}>{vp.label}</h3>
                  <p className="text-xs leading-relaxed text-[var(--sf-secondary)]">{vp.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Community & Teaming Feedback ─── */}
        <section className="py-16 border-t border-[var(--sf-border)]/60 bg-[var(--sf-panel)]/30">
          <div className="max-w-xl mx-auto px-5 text-center">
            <div className="p-8 rounded-3xl border border-[var(--sf-border)] bg-[var(--sf-panel)]/80 backdrop-blur-md shadow-card space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Experience Feedback
              </span>
              <h3 className="text-2xl font-heading font-bold text-ink">
                How would you rate the teaming flow?
              </h3>
              <p className="text-sm text-[var(--sf-secondary)] max-w-md mx-auto">
                Test the interactive PeekRating component below. Hover and click to submit your impression.
              </p>

              <div className="pt-2 flex justify-center">
                <PeekRating
                  defaultValue={4}
                  count={5}
                  shape="star"
                  labels={['Poor', 'Fair', 'Good', 'Great', 'Superb']}
                  activeColor="#f5b400"
                  idleColor="var(--sf-border)"
                  tipColor="var(--sf-panel)"
                  tipTextColor="var(--sf-text)"
                  size={40}
                  lift={8}
                  magnify={1.15}
                  riseDuration={320}
                  popScale={1.3}
                  showTip
                  allowClear
                  onChange={value => setFeedbackScore(value)}
                  showLabels
                  readOnly={false}
                />
              </div>

              {feedbackScore > 0 && (
                <p className="text-xs text-[var(--sf-accent-text)] font-medium animate-fadeIn">
                  Feedback recorded: {feedbackScore}/5 · Thanks for helping calibrate team balance!
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="max-w-4xl mx-auto px-5 py-20 text-center space-y-6 my-12">
          <h2 className="text-4xl font-heading font-bold">
            <span className="text-ink">Ready to </span>
            <span style={{ background: 'linear-gradient(135deg,var(--sf-text) 10%,var(--sf-accent-text) 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>transform teaming?</span>
          </h2>
          <p className="max-w-md mx-auto text-[var(--sf-secondary)]">
            Create your account once or sign in to start forming balanced, explainable teams.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/login?tab=signup"
              className="py-3 px-6 rounded-xl font-semibold text-sm text-[var(--sf-text)] bg-[#C5ADE5] hover:bg-[#B69BD8] shadow-lg shadow-[#C5ADE5]/30 hover:shadow-[#B69BD8]/40 transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-[#C5ADE5]"
            >
              <span>Create Free Account</span>
              <ArrowRight size={15} />
            </Link>
            <Link to="/events">
              <Button variant="secondary" size="lg">
                Browse public events
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[var(--sf-border)]/40 py-6 text-center text-xs text-[var(--sf-muted)] bg-[var(--sf-panel)]/80 backdrop-blur-md">
          Skillfy — Professional Skill-Based Teaming Architecture
        </footer>
      </div>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialTab={authTab}
      />
    </div>
  );
}
