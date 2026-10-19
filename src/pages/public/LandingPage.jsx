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
    accent: '#8B5CF6',
    badge: 'bg-purple-950/50 text-purple-300 border-purple-500/30',
  },
  {
    step: '02',
    title: 'Join an event',
    description: 'Browse events across dozens of categories. Your existing profile answers most questions automatically.',
    accent: '#A855F7',
    badge: 'bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-500/30',
  },
  {
    step: '03',
    title: 'Get a balanced team',
    description: 'The formation engine reads actual skills and requirements — not random groupings.',
    accent: '#6366F1',
    badge: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30',
  },
  {
    step: '04',
    title: 'Understand your team',
    description: 'The Team Blueprint shows every skill contribution and every coverage gap before work begins.',
    accent: '#C084FC',
    badge: 'bg-purple-900/40 text-purple-200 border-purple-400/30',
  },
];

const VALUE_PROPS = [
  { icon: <CheckCircle size={18} />, label: 'Requirements-first', desc: 'Every recommendation traces to a specific event requirement, not an opaque score.', color: 'text-purple-300', bg: 'bg-purple-950/30 border-purple-500/30' },
  { icon: <Shield size={18} />, label: 'Transparent gaps', desc: 'A missing critical skill is never hidden behind a high overall match percentage.', color: 'text-violet-300', bg: 'bg-violet-950/30 border-violet-500/30' },
  { icon: <Zap size={18} />, label: 'Reusable profiles', desc: 'Participants fill in their skills once. Every future event reuses verified profile data.', color: 'text-indigo-300', bg: 'bg-indigo-950/30 border-indigo-500/30' },
  { icon: <Users size={18} />, label: 'Any event type', desc: 'Hackathons, debates, research sprints, creative jams — configurable for any scale.', color: 'text-lavender', bg: 'bg-purple-950/30 border-purple-500/30' },
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
    <div className="relative min-h-screen bg-[#07050D] text-ink overflow-x-hidden">
      {/* ─── Content ─── */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ─── FULL VIEWPORT HERO WITH PURPLE LIGHT RAYS REACHING THE VERY TOP ─── */}
        <div className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden border-b border-purple-500/20 bg-[#07050D]">
          {/* LightRays Canvas starting from absolute top (0,0) */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <LightRays
              raysOrigin="top-center"
              raysColor="#8B5CF6"
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

          {/* ─── Completely Transparent Floating Navigation (Directly on Light Rays) ─── */}
          <div className="relative z-50 w-full">
            <header className="bg-transparent border-b border-white/10 backdrop-blur-[2px]">
              <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
                <BrandWordmark size={18} />
                <nav className="hidden md:flex items-center gap-8 text-sm">
                  <a href="#how-it-works" className="text-slate-300 hover:text-purple-300 transition-colors font-medium">How it works</a>
                  <a href="#blueprint"    className="text-slate-300 hover:text-purple-300 transition-colors font-medium">Blueprint</a>
                  <a href="#event-types"  className="text-slate-300 hover:text-purple-300 transition-colors font-medium">Event types</a>
                </nav>
                <div className="flex items-center gap-3">
                  <Link to="/events" className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                    Browse events
                  </Link>

                  <button
                    onClick={() => openAuth('signin')}
                    className="text-xs sm:text-sm font-medium text-purple-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/40 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <LogIn size={13} />
                    <span>Sign In</span>
                  </button>

                  <button
                    onClick={() => openAuth('signup')}
                    className="text-xs sm:text-sm font-semibold text-white px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus size={13} />
                    <span>Get Started</span>
                  </button>
                </div>
              </div>
            </header>
          </div>

          {/* Hero Center Content with Sophisticated Purple & Obsidian Aesthetics */}
          <div className="relative z-10 max-w-4xl mx-auto px-5 text-center pointer-events-auto my-auto py-8">
            {/* Eyebrow tag */}
            <div className="inline-flex items-center gap-2 flex-wrap mb-5 justify-center">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-mono tracking-wider uppercase font-semibold bg-purple-950/50 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-950/50">
                <Sparkles size={11} className="text-purple-400" /> Skill-Based Teaming Architecture
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black leading-[1.08] tracking-tight mb-5">
              <span className="text-white tracking-tight">BETTER-BALANCED</span>
              <br />
              <span className="text-gradient-purple tracking-tight">TEAMS THAT WORK</span>
            </h1>

            <p className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto mb-8 text-slate-300">
              <strong className="text-white font-semibold">TeamWeave</strong> forms teams by reading participant skills and event requirements — not random groupings.
              Every recommendation comes with an <span className="text-purple-300 font-semibold">explanation</span>. Every gap is <span className="text-white font-semibold">shown, not hidden</span>.
            </p>

            <div className="flex flex-wrap gap-4 justify-center items-center">
              <button
                onClick={() => openAuth('signup')}
                className="py-3 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Get Started Free</span>
                <ArrowRight size={15} />
              </button>

              <Link to="/events">
                <Button variant="secondary" size="md" className="border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 text-white font-semibold hover:border-purple-400/50 transition-all">
                  Browse events
                </Button>
              </Link>
            </div>
          </div>

          {/* Scroll Down Indicator */}
          <a
            href="#how-it-works"
            className="relative z-10 pb-6 flex flex-col items-center gap-1.5 text-xs text-slate-400 hover:text-purple-300 transition-colors group cursor-pointer"
          >
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-80 group-hover:opacity-100">Explore Process</span>
            <ChevronDown size={16} className="animate-bounce text-purple-400" />
          </a>
        </div>

        {/* ─── How it works ─── */}
        <section id="how-it-works" className="py-20 border-b border-border/60 bg-surface/40">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-teal uppercase mb-3">The Process</p>
              <h2 className="text-3xl font-heading font-bold text-white">How team formation works</h2>
              <p className="mt-3 max-w-xl mx-auto text-slate-300">Four steps from profile to a team you can trust.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PROCESS_STEPS.map(step => (
                <div key={step.step} className="p-5 rounded-2xl border border-border/80 bg-surface/80 backdrop-blur-sm shadow-card">
                  <div className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded-md border mb-4 ${step.badge}`}>{step.step}</div>
                  <h3 className="font-heading font-semibold text-white mb-2 text-[15px]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-300">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Team Blueprint & LivingWeave ─── */}
        <section id="blueprint" className="max-w-6xl mx-auto px-5 py-20 grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-teal/15 text-teal border border-teal/30">
                Living Weave Algorithm
              </span>
              <span className="text-xs text-slate-400">Real-time skill balance</span>
            </div>
            <h2 className="text-3xl font-heading font-bold text-white">
              The Team<br /><span className="text-teal">Blueprint</span>
            </h2>
            <p className="leading-relaxed text-slate-300">
              Every proposed team includes a Blueprint: who contributes what, which requirements are met,
              and what gaps remain. No black-box scores. Full visibility before work starts.
            </p>

            <div className="rounded-2xl border border-border/80 overflow-hidden bg-surface/90 p-4 shadow-card">
              <LivingWeaveViz team={demoTeam} participants={demoParticipants} />
            </div>

            <div className="space-y-2.5">
              {[
                { title: 'Coverage at a glance', desc: 'See instantly whether the team meets required capabilities.', col: 'text-teal' },
                { title: 'Individual role clarity', desc: 'Every member knows why they were placed on the team.', col: 'text-indigo-400' },
                { title: 'Explicit gap callouts', desc: 'Missing skills are highlighted so teams can plan around them.', col: 'text-rose-400' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-surface/70 backdrop-blur-sm">
                  <CheckCircle size={15} className={`${item.col} shrink-0 mt-0.5`} />
                  <div>
                    <h4 className={`text-sm font-semibold ${item.col}`}>{item.title}</h4>
                    <p className="text-xs mt-0.5 text-slate-300">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-5 border border-border/80 bg-surface/85 backdrop-blur-md shadow-card">
            <TeamBlueprint team={demoTeam} participants={demoParticipants} event={demoEvent} showReasons />
          </div>
        </section>

        {/* ─── Event types ─── */}
        <section id="event-types" className="py-20 border-y border-border/60 bg-surface/40">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-amber-400 uppercase mb-3">Event Types</p>
              <h2 className="text-3xl font-heading font-bold text-white">Built for any collaboration format</h2>
              <p className="mt-3 max-w-xl mx-auto text-slate-300">
                Configure requirement templates, evaluation rules, and team sizes for each event type.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {EVENT_CATEGORIES.map(cat => (
                <div key={cat.id} className="p-4 rounded-xl flex items-center justify-between border border-border/80 bg-surface/80 backdrop-blur-sm hover:border-teal/50 transition-colors shadow-card">
                  <div>
                    <h3 className="font-medium text-white text-sm">{cat.label}</h3>
                    <p className="text-xs mt-0.5 text-slate-400">Custom requirement profiles</p>
                  </div>
                  <Link to={`/events?category=${cat.id}`} className="text-xs text-teal hover:text-teal-light flex items-center gap-1 font-medium transition-colors">
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
              <p className="text-[11px] font-mono tracking-widest text-teal uppercase mb-1">Live Demo Data</p>
              <h2 className="text-2xl font-heading font-bold text-white">Sample events</h2>
            </div>
            <Link to="/events" className="text-sm text-slate-300 hover:text-white flex items-center gap-1 font-medium transition-colors">
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
        <section className="py-20 border-t border-border/60 bg-surface/40">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-teal uppercase mb-3">Philosophy</p>
              <h2 className="text-2xl font-heading font-bold text-white">Design principles</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {VALUE_PROPS.map(vp => (
                <div key={vp.label} className="text-center space-y-3 p-4 rounded-2xl bg-surface/60 border border-border/70">
                  <div className={`w-11 h-11 rounded-xl ${vp.bg} ${vp.color} flex items-center justify-center mx-auto border`}>{vp.icon}</div>
                  <h3 className={`font-heading font-semibold text-sm ${vp.color}`}>{vp.label}</h3>
                  <p className="text-xs leading-relaxed text-slate-300">{vp.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Community & Teaming Feedback ─── */}
        <section className="py-16 border-t border-border/60 bg-surface/30">
          <div className="max-w-xl mx-auto px-5 text-center">
            <div className="p-8 rounded-3xl border border-border/80 bg-surface/80 backdrop-blur-md shadow-card space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Experience Feedback
              </span>
              <h3 className="text-2xl font-heading font-bold text-white">
                How would you rate the teaming flow?
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Test the interactive PeekRating component below. Hover and click to submit your impression.
              </p>

              <div className="pt-2 flex justify-center">
                <PeekRating
                  defaultValue={4}
                  count={5}
                  shape="star"
                  labels={['Poor', 'Fair', 'Good', 'Great', 'Superb']}
                  activeColor="#f5b400"
                  idleColor="#52525b"
                  tipColor="#1e293b"
                  tipTextColor="#f8fafc"
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
                <p className="text-xs text-teal font-medium animate-fadeIn">
                  Feedback recorded: {feedbackScore}/5 · Thanks for helping calibrate team balance!
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="max-w-4xl mx-auto px-5 py-20 text-center space-y-6 my-12">
          <h2 className="text-4xl font-heading font-bold">
            <span className="text-white">Ready to </span>
            <span style={{ background: 'linear-gradient(135deg,#FFFFFF 10%,#A855F7 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>transform teaming?</span>
          </h2>
          <p className="max-w-md mx-auto text-slate-300">
            Create your account once or sign in to start forming balanced, explainable teams.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => openAuth('signup')}
              className="py-3 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Create Free Account</span>
              <ArrowRight size={15} />
            </button>
            <Link to="/events"><Button variant="secondary" size="lg" className="border-purple-500/30 bg-purple-950/20 text-white hover:bg-purple-900/30">Browse public events</Button></Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-purple-500/20 py-6 text-center text-xs text-slate-400 bg-[#0A0714]/80 backdrop-blur-md">
          TeamWeave — Professional Skill-Based Teaming Architecture
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
