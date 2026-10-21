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
    accent: '#B92345',
    badge: 'bg-[#3A1524] text-[#F7C5D2] border-[#633044]',
  },
  {
    step: '02',
    title: 'Join an event',
    description: 'Browse events across dozens of categories. Your existing profile answers most questions automatically.',
    accent: '#D23357',
    badge: 'bg-[#3A1524] text-[#F28BA8] border-[#8C3B58]',
  },
  {
    step: '03',
    title: 'Get a balanced team',
    description: 'The formation engine reads actual skills and requirements — not random groupings.',
    accent: '#8C1538',
    badge: 'bg-[#2C101C] text-[#F7C5D2] border-[#633044]',
  },
  {
    step: '04',
    title: 'Understand your team',
    description: 'The Team Blueprint shows every skill contribution and every coverage gap before work begins.',
    accent: '#F28BA8',
    badge: 'bg-[#3A1524] text-[#FFF4F6] border-[#8C3B58]',
  },
];

const VALUE_PROPS = [
  { icon: <CheckCircle size={18} />, label: 'Requirements-first', desc: 'Every recommendation traces to a specific event requirement, not an opaque score.', color: 'text-[#F28BA8]', bg: 'bg-[#2C101C] border-[#633044]' },
  { icon: <Shield size={18} />, label: 'Transparent gaps', desc: 'A missing critical skill is never hidden behind a high overall match percentage.', color: 'text-[#F7C5D2]', bg: 'bg-[#3A1524] border-[#8C3B58]' },
  { icon: <Zap size={18} />, label: 'Reusable profiles', desc: 'Participants fill in their skills once. Every future event reuses verified profile data.', color: 'text-[#FFF4F6]', bg: 'bg-[#2C101C] border-[#633044]' },
  { icon: <Users size={18} />, label: 'Any event type', desc: 'Hackathons, debates, research sprints, creative jams — configurable for any scale.', color: 'text-[#F28BA8]', bg: 'bg-[#3A1524] border-[#633044]' },
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
    <div className="relative min-h-screen bg-[#17080F] text-[#FFF4F6] overflow-x-hidden">
      {/* ─── Content ─── */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ─── FULL VIEWPORT HERO WITH WINE+GARNET LIGHT RAYS ─── */}
        <div className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden border-b border-[#633044]/60 bg-[#17080F]">
          {/* LightRays atmospheric canvas in Wine + Garnet tone */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <LightRays
              raysOrigin="top-center"
              raysColor="#B92345"
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
            <header className="bg-transparent border-b border-[#633044]/40 backdrop-blur-[2px]">
              <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
                <BrandWordmark size={18} />
                <nav className="hidden md:flex items-center gap-8 text-sm">
                  <a href="#how-it-works" className="text-[#D7B7C2] hover:text-[#F28BA8] transition-colors font-medium">How it works</a>
                  <a href="#blueprint"    className="text-[#D7B7C2] hover:text-[#F28BA8] transition-colors font-medium">Blueprint</a>
                  <a href="#event-types"  className="text-[#D7B7C2] hover:text-[#F28BA8] transition-colors font-medium">Event types</a>
                </nav>
                <div className="flex items-center gap-3">
                  <Link to="/events" className="text-sm font-medium text-[#D7B7C2] hover:text-[#FFF4F6] transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                    Browse events
                  </Link>

                  <Link
                    to="/login"
                    className="text-xs sm:text-sm font-medium text-[#D7B7C2] hover:text-[#FFF4F6] px-3.5 py-1.5 rounded-xl border border-[#633044] bg-[#2C101C]/70 hover:bg-[#3A1524] transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-[#F7A5BD]"
                  >
                    <LogIn size={13} className="text-[#F28BA8]" />
                    <span>Login</span>
                  </Link>

                  <Link
                    to="/login?tab=signup"
                    className="text-xs sm:text-sm font-semibold text-[#FFF4F6] px-4 py-1.5 rounded-xl bg-[#B92345] hover:bg-[#D23357] shadow-lg shadow-[#B92345]/30 hover:shadow-[#D23357]/40 transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-[#F7A5BD]"
                  >
                    <UserPlus size={13} />
                    <span>Get Started</span>
                  </Link>
                </div>
              </div>
            </header>
          </div>

          {/* Hero Center Content with Wine + Garnet Aesthetics */}
          <div className="relative z-10 max-w-4xl mx-auto px-5 text-center pointer-events-auto my-auto py-8">
            {/* Eyebrow tag */}
            <div className="inline-flex items-center gap-2 flex-wrap mb-5 justify-center">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-mono tracking-wider uppercase font-semibold bg-[#3A1524] text-[#F7C5D2] border border-[#633044] shadow-sm shadow-[#17080F]/50">
                <Sparkles size={11} className="text-[#F28BA8]" /> Skill-Based Teaming Architecture
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black leading-[1.08] tracking-tight mb-5">
              <span className="text-[#FFF4F6] tracking-tight">BETTER-BALANCED</span>
              <br />
              <span className="text-gradient-purple tracking-tight">TEAMS THAT WORK</span>
            </h1>

            <p className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto mb-8 text-[#D7B7C2]">
              <strong className="text-[#FFF4F6] font-semibold">TeamWeave</strong> forms teams by reading participant skills and event requirements — not random groupings.
              Every recommendation comes with an <span className="text-[#F28BA8] font-semibold">explanation</span>. Every gap is <span className="text-[#FFF4F6] font-semibold">shown, not hidden</span>.
            </p>

            <div className="flex flex-wrap gap-4 justify-center items-center">
              <Link
                to="/login?tab=signup"
                className="py-3 px-6 rounded-xl font-semibold text-sm text-[#FFF4F6] bg-[#B92345] hover:bg-[#D23357] shadow-lg shadow-[#B92345]/30 hover:shadow-[#D23357]/40 transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-[#F7A5BD]"
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
            className="relative z-10 pb-6 flex flex-col items-center gap-1.5 text-xs text-[#B68F9E] hover:text-[#F28BA8] transition-colors group cursor-pointer"
          >
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-80 group-hover:opacity-100">Explore Process</span>
            <ChevronDown size={16} className="animate-bounce text-[#F28BA8]" />
          </a>
        </div>

        {/* ─── How it works ─── */}
        <section id="how-it-works" className="py-20 border-b border-[#633044]/60 bg-[#220B15]/40">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-[#F28BA8] uppercase mb-3">The Process</p>
              <h2 className="text-3xl font-heading font-bold text-white">How team formation works</h2>
              <p className="mt-3 max-w-xl mx-auto text-[#D7B7C2]">Four steps from profile to a team you can trust.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PROCESS_STEPS.map(step => (
                <div key={step.step} className="p-5 rounded-2xl border border-[#633044] bg-[#2C101C]/80 backdrop-blur-sm shadow-card">
                  <div className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded-md border mb-4 ${step.badge}`}>{step.step}</div>
                  <h3 className="font-heading font-semibold text-white mb-2 text-[15px]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-[#D7B7C2]">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Team Blueprint & LivingWeave ─── */}
        <section id="blueprint" className="max-w-6xl mx-auto px-5 py-20 grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#3A1524] text-[#F7C5D2] border border-[#633044]">
                Living Weave Algorithm
              </span>
              <span className="text-xs text-[#B68F9E]">Real-time skill balance</span>
            </div>
            <h2 className="text-3xl font-heading font-bold text-white">
              The Team<br /><span className="text-[#F28BA8]">Blueprint</span>
            </h2>
            <p className="leading-relaxed text-[#D7B7C2]">
              Every proposed team includes a Blueprint: who contributes what, which requirements are met,
              and what gaps remain. No black-box scores. Full visibility before work starts.
            </p>

            <div className="rounded-2xl border border-[#633044] overflow-hidden bg-[#2C101C]/90 p-4 shadow-card">
              <LivingWeaveViz team={demoTeam} participants={demoParticipants} />
            </div>

            <div className="space-y-2.5">
              {[
                { title: 'Coverage at a glance', desc: 'See instantly whether the team meets required capabilities.', col: 'text-[#F28BA8]' },
                { title: 'Individual role clarity', desc: 'Every member knows why they were placed on the team.', col: 'text-[#F7C5D2]' },
                { title: 'Explicit gap callouts', desc: 'Missing skills are highlighted so teams can plan around them.', col: 'text-rose-400' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl border border-[#633044] bg-[#2C101C]/70 backdrop-blur-sm">
                  <CheckCircle size={15} className={`${item.col} shrink-0 mt-0.5`} />
                  <div>
                    <h4 className={`text-sm font-semibold ${item.col}`}>{item.title}</h4>
                    <p className="text-xs mt-0.5 text-[#D7B7C2]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-5 border border-[#633044] bg-[#2C101C]/85 backdrop-blur-md shadow-card">
            <TeamBlueprint team={demoTeam} participants={demoParticipants} event={demoEvent} showReasons />
          </div>
        </section>

        {/* ─── Event types ─── */}
        <section id="event-types" className="py-20 border-y border-[#633044]/60 bg-[#220B15]/40">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-amber-400 uppercase mb-3">Event Types</p>
              <h2 className="text-3xl font-heading font-bold text-white">Built for any collaboration format</h2>
              <p className="mt-3 max-w-xl mx-auto text-[#D7B7C2]">
                Configure requirement templates, evaluation rules, and team sizes for each event type.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {EVENT_CATEGORIES.map(cat => (
                <div key={cat.id} className="p-4 rounded-xl flex items-center justify-between border border-[#633044] bg-[#2C101C]/80 backdrop-blur-sm hover:border-[#B92345]/50 transition-colors shadow-card">
                  <div>
                    <h3 className="font-medium text-white text-sm">{cat.label}</h3>
                    <p className="text-xs mt-0.5 text-[#B68F9E]">Custom requirement profiles</p>
                  </div>
                  <Link to={`/events?category=${cat.id}`} className="text-xs text-[#F28BA8] hover:text-[#FFF4F6] flex items-center gap-1 font-medium transition-colors">
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
              <p className="text-[11px] font-mono tracking-widest text-[#F28BA8] uppercase mb-1">Live Demo Data</p>
              <h2 className="text-2xl font-heading font-bold text-white">Sample events</h2>
            </div>
            <Link to="/events" className="text-sm text-[#D7B7C2] hover:text-white flex items-center gap-1 font-medium transition-colors">
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
        <section className="py-20 border-t border-[#633044]/60 bg-[#220B15]/40">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[11px] font-mono tracking-widest text-[#F28BA8] uppercase mb-3">Philosophy</p>
              <h2 className="text-2xl font-heading font-bold text-white">Design principles</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {VALUE_PROPS.map(vp => (
                <div key={vp.label} className="text-center space-y-3 p-4 rounded-2xl bg-[#2C101C]/60 border border-[#633044]">
                  <div className={`w-11 h-11 rounded-xl ${vp.bg} ${vp.color} flex items-center justify-center mx-auto border`}>{vp.icon}</div>
                  <h3 className={`font-heading font-semibold text-sm ${vp.color}`}>{vp.label}</h3>
                  <p className="text-xs leading-relaxed text-[#D7B7C2]">{vp.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Community & Teaming Feedback ─── */}
        <section className="py-16 border-t border-[#633044]/60 bg-[#220B15]/30">
          <div className="max-w-xl mx-auto px-5 text-center">
            <div className="p-8 rounded-3xl border border-[#633044] bg-[#2C101C]/80 backdrop-blur-md shadow-card space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Experience Feedback
              </span>
              <h3 className="text-2xl font-heading font-bold text-white">
                How would you rate the teaming flow?
              </h3>
              <p className="text-sm text-[#D7B7C2] max-w-md mx-auto">
                Test the interactive PeekRating component below. Hover and click to submit your impression.
              </p>

              <div className="pt-2 flex justify-center">
                <PeekRating
                  defaultValue={4}
                  count={5}
                  shape="star"
                  labels={['Poor', 'Fair', 'Good', 'Great', 'Superb']}
                  activeColor="#f5b400"
                  idleColor="#633044"
                  tipColor="#2C101C"
                  tipTextColor="#FFF4F6"
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
                <p className="text-xs text-[#F28BA8] font-medium animate-fadeIn">
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
            <span style={{ background: 'linear-gradient(135deg,#FFF4F6 10%,#F28BA8 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>transform teaming?</span>
          </h2>
          <p className="max-w-md mx-auto text-[#D7B7C2]">
            Create your account once or sign in to start forming balanced, explainable teams.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/login?tab=signup"
              className="py-3 px-6 rounded-xl font-semibold text-sm text-[#FFF4F6] bg-[#B92345] hover:bg-[#D23357] shadow-lg shadow-[#B92345]/30 hover:shadow-[#D23357]/40 transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-[#F7A5BD]"
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
        <footer className="border-t border-[#633044]/40 py-6 text-center text-xs text-[#B68F9E] bg-[#220B15]/80 backdrop-blur-md">
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
