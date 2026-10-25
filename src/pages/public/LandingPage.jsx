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
    accent: '#B6264D',
    badge: 'bg-[#210B16] text-[#F4A7BB] border-[#5E2A3D]',
  },
  {
    step: '02',
    title: 'Join an event',
    description: 'Browse events across dozens of categories. Your existing profile answers most questions automatically.',
    accent: '#D13D65',
    badge: 'bg-[#210B16] text-[#F4A7BB] border-[#5E2A3D]',
  },
  {
    step: '03',
    title: 'Get a balanced team',
    description: 'The formation engine reads actual skills and requirements — not random groupings.',
    accent: '#590f0e',
    badge: 'bg-[#210B16] text-[#F4A7BB] border-[#5E2A3D]',
  },
  {
    step: '04',
    title: 'Understand your team',
    description: 'The Team Blueprint shows every skill contribution and every coverage gap before work begins.',
    accent: '#F4A7BB',
    badge: 'bg-[#210B16] text-[#F7FAF8] border-[#B6264D]',
  },
];

const VALUE_PROPS = [
  { icon: <CheckCircle size={18} />, label: 'Requirements-first', desc: 'Every recommendation traces to a specific event requirement, not an opaque score.', color: 'text-[#F4A7BB]', bg: 'bg-[#210B16] border-[#5E2A3D]' },
  { icon: <Shield size={18} />, label: 'Transparent gaps', desc: 'A missing critical skill is never hidden behind a high overall match percentage.', color: 'text-[#F4A7BB]', bg: 'bg-[#210B16] border-[#B6264D]' },
  { icon: <Zap size={18} />, label: 'Reusable profiles', desc: 'Participants fill in their skills once. Every future event reuses verified profile data.', color: 'text-[#F7FAF8]', bg: 'bg-[#210B16] border-[#5E2A3D]' },
  { icon: <Users size={18} />, label: 'Any event type', desc: 'Hackathons, debates, research sprints, creative jams — configurable for any scale.', color: 'text-[#F4A7BB]', bg: 'bg-[#210B16] border-[#5E2A3D]' },
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
    <div className="relative min-h-screen bg-[#13080E] text-[#F7FAF8] overflow-x-hidden">
      {/* ─── Content ─── */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ─── FULL VIEWPORT HERO WITH WINE+GARNET LIGHT RAYS ─── */}
        {/* ─── FULL VIEWPORT HERO WITH OBSIDIAN + CRIMSON LIGHT RAYS ─── */}
        <div className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden border-b border-[#5E2A3D]/60 bg-[#13080E]">
          {/* LightRays atmospheric canvas in Crimson #B6264D tone */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <LightRays
              raysOrigin="top-center"
              raysColor="#B6264D"
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
            <header className="bg-transparent border-b border-[#5E2A3D]/40 backdrop-blur-[2px]">
              <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
                <BrandWordmark size={18} />
                <nav className="hidden md:flex items-center gap-8 text-sm">
                  <a href="#how-it-works" className="text-[#E0CAD3] hover:text-[#F4A7BB] transition-colors font-medium">How it works</a>
                  <a href="#blueprint"    className="text-[#E0CAD3] hover:text-[#F4A7BB] transition-colors font-medium">Blueprint</a>
                  <a href="#event-types"  className="text-[#E0CAD3] hover:text-[#F4A7BB] transition-colors font-medium">Event types</a>
                  <Link to="/organizer/auth" className="text-[#F4A7BB] hover:text-[#F7FAF8] transition-colors font-medium">
                    For Organizers
                  </Link>
                </nav>
                <div className="flex items-center gap-3">
                  <Link to="/organizer/auth" className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#F4A7BB] hover:text-[#F7FAF8] px-3 py-1.5 rounded-xl border border-[#5E2A3D] bg-[#210B16] hover:bg-[#32111F] hover:border-[#B6264D]/60 transition-all">
                    <span>Host an Event</span>
                  </Link>

                  <Link to="/events" className="text-sm font-medium text-[#E0CAD3] hover:text-[#F7FAF8] transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                    Browse events
                  </Link>

                  <Link
                    to="/login"
                    className="text-xs sm:text-sm font-medium text-[#E0CAD3] hover:text-[#F7FAF8] px-3.5 py-1.5 rounded-xl border border-[#5E2A3D] bg-[#210B16] hover:bg-[#32111F] transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-[#B6264D]"
                  >
                    <LogIn size={13} className="text-[#B6264D]" />
                    <span>Login</span>
                  </Link>

                  <Link
                    to="/login?tab=signup"
                    className="text-xs sm:text-sm font-semibold text-white px-4 py-1.5 rounded-xl bg-[#B6264D] hover:bg-[#D13D65] shadow-lg shadow-[#B6264D]/30 hover:shadow-[#D13D65]/40 transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-[#B6264D]"
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
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-mono tracking-wider uppercase font-semibold bg-[#210B16] text-[#E0CAD3] border border-[#5E2A3D] shadow-sm shadow-black/60">
                <Sparkles size={11} className="text-[#B6264D]" /> Skill-Based Teaming Architecture
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black leading-[1.08] tracking-tight mb-5">
              <span className="text-[#F7FAF8] tracking-tight">BETTER-BALANCED</span>
              <br />
              <span className="text-gradient-purple tracking-tight">TEAMS THAT WORK</span>
            </h1>

            <p className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto mb-8 text-[#E0CAD3]">
              <strong className="text-[#F7FAF8] font-semibold">TeamWeave</strong> forms teams by reading participant skills and event requirements — not random groupings.
              Every recommendation comes with an <span className="text-[#F4A7BB] font-semibold">explanation</span>. Every gap is <span className="text-[#F7FAF8] font-semibold">shown, not hidden</span>.
            </p>

            <div className="flex flex-wrap gap-4 justify-center items-center">
              <Link
                to="/login?tab=signup"
                className="py-3 px-6 rounded-xl font-semibold text-sm text-white bg-[#B6264D] hover:bg-[#D13D65] shadow-lg shadow-[#B6264D]/40 hover:shadow-[#D13D65]/50 transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-[#B6264D]"
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
            className="relative z-10 pb-6 flex flex-col items-center gap-1.5 text-xs text-[#BCA2AD] hover:text-[#F4A7BB] transition-colors group cursor-pointer"
          >
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-80 group-hover:opacity-100">Explore Process</span>
            <ChevronDown size={16} className="animate-bounce text-[#B6264D]" />
          </a>
        </div>

        {/* ─── How it works ─── */}
        <section id="how-it-works" className="py-20 border-b border-[#5E2A3D]/60 bg-[#210B16]/40">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-[#F4A7BB] uppercase mb-3">The Process</p>
              <h2 className="text-3xl font-heading font-bold text-white">How team formation works</h2>
              <p className="mt-3 max-w-xl mx-auto text-[#E0CAD3]">Four steps from profile to a team you can trust.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PROCESS_STEPS.map(step => (
                <div key={step.step} className="p-5 rounded-2xl border border-[#5E2A3D] bg-[#210B16]/80 backdrop-blur-sm shadow-card">
                  <div className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded-md border mb-4 ${step.badge}`}>{step.step}</div>
                  <h3 className="font-heading font-semibold text-white mb-2 text-[15px]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-[#E0CAD3]">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Team Blueprint & LivingWeave ─── */}
        <section id="blueprint" className="max-w-6xl mx-auto px-5 py-20 grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#210B16] text-[#F4A7BB] border border-[#5E2A3D]">
                Living Weave Algorithm
              </span>
              <span className="text-xs text-[#BCA2AD]">Real-time skill balance</span>
            </div>
            <h2 className="text-3xl font-heading font-bold text-white">
              The Team<br /><span className="text-[#F4A7BB]">Blueprint</span>
            </h2>
            <p className="leading-relaxed text-[#E0CAD3]">
              Every proposed team includes a Blueprint: who contributes what, which requirements are met,
              and what gaps remain. No black-box scores. Full visibility before work starts.
            </p>

            <div className="rounded-2xl border border-[#5E2A3D] overflow-hidden bg-[#210B16]/90 p-4 shadow-card">
              <LivingWeaveViz team={demoTeam} participants={demoParticipants} />
            </div>

            <div className="space-y-2.5">
              {[
                { title: 'Coverage at a glance', desc: 'See instantly whether the team meets required capabilities.', col: 'text-[#F4A7BB]' },
                { title: 'Individual role clarity', desc: 'Every member knows why they were placed on the team.', col: 'text-[#F4A7BB]' },
                { title: 'Explicit gap callouts', desc: 'Missing skills are highlighted so teams can plan around them.', col: 'text-rose-400' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl border border-[#5E2A3D] bg-[#210B16]/70 backdrop-blur-sm">
                  <CheckCircle size={15} className={`${item.col} shrink-0 mt-0.5`} />
                  <div>
                    <h4 className={`text-sm font-semibold ${item.col}`}>{item.title}</h4>
                    <p className="text-xs mt-0.5 text-[#E0CAD3]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-5 border border-[#5E2A3D] bg-[#210B16]/85 backdrop-blur-md shadow-card">
            <TeamBlueprint team={demoTeam} participants={demoParticipants} event={demoEvent} showReasons />
          </div>
        </section>

        {/* ─── Event types ─── */}
        <section id="event-types" className="py-20 border-y border-[#5E2A3D]/60 bg-[#13080E]/60">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-amber-400 uppercase mb-3">Event Types</p>
              <h2 className="text-3xl font-heading font-bold text-white">Built for any collaboration format</h2>
              <p className="mt-3 max-w-xl mx-auto text-[#E0CAD3]">
                Configure requirement templates, evaluation rules, and team sizes for each event type.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {EVENT_CATEGORIES.map(cat => (
                <div key={cat.id} className="p-4 rounded-xl flex items-center justify-between border border-[#5E2A3D] bg-[#210B16]/90 backdrop-blur-sm hover:border-[#B6264D]/60 transition-colors shadow-card">
                  <div>
                    <h3 className="font-medium text-white text-sm">{cat.label}</h3>
                    <p className="text-xs mt-0.5 text-[#BCA2AD]">Custom requirement profiles</p>
                  </div>
                  <Link to={`/events?category=${cat.id}`} className="text-xs text-[#F4A7BB] hover:text-[#F7FAF8] flex items-center gap-1 font-medium transition-colors">
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
              <p className="text-[11px] font-mono tracking-widest text-[#F4A7BB] uppercase mb-1">Live Demo Data</p>
              <h2 className="text-2xl font-heading font-bold text-white">Sample events</h2>
            </div>
            <Link to="/events" className="text-sm text-[#E0CAD3] hover:text-white flex items-center gap-1 font-medium transition-colors">
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
        <section className="py-20 border-t border-[#5E2A3D]/60 bg-[#210B16]/40">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-[#F4A7BB] uppercase mb-3">Philosophy</p>
              <h2 className="text-2xl font-heading font-bold text-white">Design principles</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {VALUE_PROPS.map(vp => (
                <div key={vp.label} className="text-center space-y-3 p-4 rounded-2xl bg-[#210B16]/60 border border-[#5E2A3D]">
                  <div className={`w-11 h-11 rounded-xl ${vp.bg} ${vp.color} flex items-center justify-center mx-auto border`}>{vp.icon}</div>
                  <h3 className={`font-heading font-semibold text-sm ${vp.color}`}>{vp.label}</h3>
                  <p className="text-xs leading-relaxed text-[#E0CAD3]">{vp.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Community & Teaming Feedback ─── */}
        <section className="py-16 border-t border-[#5E2A3D]/60 bg-[#210B16]/30">
          <div className="max-w-xl mx-auto px-5 text-center">
            <div className="p-8 rounded-3xl border border-[#5E2A3D] bg-[#210B16]/80 backdrop-blur-md shadow-card space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Experience Feedback
              </span>
              <h3 className="text-2xl font-heading font-bold text-white">
                How would you rate the teaming flow?
              </h3>
              <p className="text-sm text-[#E0CAD3] max-w-md mx-auto">
                Test the interactive PeekRating component below. Hover and click to submit your impression.
              </p>

              <div className="pt-2 flex justify-center">
                <PeekRating
                  defaultValue={4}
                  count={5}
                  shape="star"
                  labels={['Poor', 'Fair', 'Good', 'Great', 'Superb']}
                  activeColor="#f5b400"
                  idleColor="#5E2A3D"
                  tipColor="#210B16"
                  tipTextColor="#F7FAF8"
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
                <p className="text-xs text-[#F4A7BB] font-medium animate-fadeIn">
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
            <span style={{ background: 'linear-gradient(135deg,#F7FAF8 10%,#F4A7BB 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>transform teaming?</span>
          </h2>
          <p className="max-w-md mx-auto text-[#E0CAD3]">
            Create your account once or sign in to start forming balanced, explainable teams.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/login?tab=signup"
              className="py-3 px-6 rounded-xl font-semibold text-sm text-[#F7FAF8] bg-[#B6264D] hover:bg-[#D13D65] shadow-lg shadow-[#B6264D]/30 hover:shadow-[#D13D65]/40 transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-[#B6264D]"
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
        <footer className="border-t border-[#5E2A3D]/40 py-6 text-center text-xs text-[#BCA2AD] bg-[#210B16]/80 backdrop-blur-md">
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
