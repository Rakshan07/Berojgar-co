import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Calendar, Users, Trophy,
  Menu, X, ChevronDown, RefreshCw, Check, ArrowRight, LogIn, LogOut, UserPlus
} from 'lucide-react';
import { BrandWordmark } from '../ui/BrandMark';
import { useApp, useCurrentUser } from '../../app/AppContext';
import { Avatar } from '../ui/Card';
import { useToast } from '../../hooks/useToast';
import { AuthModal } from '../auth/AuthModal';

const participantNav = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { to: '/profile', label: 'My Profile', icon: <User size={15} /> },
  { to: '/events', label: 'Discover Events', icon: <Calendar size={15} /> },
  { to: '/my-team', label: 'My Team', icon: <Users size={15} /> },
  { to: '/challenge', label: 'Daily Challenge', icon: <Trophy size={15} /> },
];

const organizerNav = [
  { to: '/organizer', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { to: '/organizer/events', label: 'My Events', icon: <Calendar size={15} /> },
  { to: '/organizer/create', label: 'Create Event', icon: <Calendar size={15} /> },
  { to: '/organizer/roster', label: 'Participant Roster', icon: <Users size={15} /> },
  { to: '/organizer/teams', label: 'Team Formation', icon: <Users size={15} /> },
];

export function AppShell({ children }) {
  const { state, dispatch } = useApp();
  const user = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('signin');
  const loc = useLocation();
  const isOrganizer = state.currentRole === 'organizer';
  const nav = isOrganizer ? organizerNav : participantNav;

  function switchRole(role) {
    dispatch({ type: 'SET_ROLE', payload: role });
    setRoleMenuOpen(false);
    toast.info(`Switched to ${role === 'organizer' ? 'Organizer' : 'Participant'} view`);
  }

  function resetDemo() {
    dispatch({ type: 'RESET_DEMO' });
    setRoleMenuOpen(false);
    toast.success('Demo data reset to defaults');
  }

  function handleSignOut() {
    dispatch({ type: 'LOGOUT' });
    setRoleMenuOpen(false);
    toast.info('Signed out of account');
    navigate('/');
  }

  function openAuth(tab = 'signin') {
    setAuthTab(tab);
    setAuthModalOpen(true);
    setRoleMenuOpen(false);
  }

  const NavLinks = ({ onClick }) => (
    <>
      {nav.map(item => {
        const active = loc.pathname === item.to || (item.to !== '/' && loc.pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150
              ${active
                ? 'bg-purple-600/20 text-purple-200 font-semibold border border-purple-500/40 shadow-sm shadow-purple-950/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
              }
            `}
          >
            <span className={active ? 'text-purple-300' : 'text-slate-400'}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="relative min-h-screen flex flex-col text-ink bg-[#07050D] overflow-x-hidden">
      {/* ─── Ambient Atmospheric Background Lighting across all pages ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_70%)]" />
        <div className="absolute top-[30%] -right-40 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(168,85,247,0.06),transparent_65%)]" />
        <div className="absolute bottom-0 left-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(124,58,237,0.06),transparent_60%)]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-screen">
        {/* Header - Glassmorphic floating nav with purple hairline border */}
        <header className="sticky top-0 z-40 bg-[#0C0818]/85 backdrop-blur-2xl border-b border-purple-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-5">
            {/* Brand */}
            <Link to="/" className="shrink-0 hover:opacity-90 transition-opacity">
              <BrandWordmark size={18} />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1.5 flex-1 ml-2" aria-label="Primary navigation">
              <NavLinks />
            </nav>

            {/* Right side controls */}
            <div className="ml-auto flex items-center gap-3">
              {/* Role switcher & Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(v => !v)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-purple-500/30 bg-[#140E24]/90 hover:border-purple-400/60 hover:bg-[#1A1230] text-xs font-mono uppercase tracking-wider text-slate-200 transition-all shadow-sm"
                  aria-expanded={roleMenuOpen}
                >
                  <span className={`w-2 h-2 rounded-full ${isOrganizer ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]'}`} />
                  <span>{isOrganizer ? 'Organizer' : 'Participant'}</span>
                  <ChevronDown size={13} className={`text-slate-400 transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-[#0F0A1F]/95 border border-purple-500/25 rounded-2xl shadow-2xl z-50 p-2 animate-fadeIn backdrop-blur-2xl">
                    <div className="px-3 py-2 border-b border-purple-500/15 mb-1.5">
                      <p className="text-[11px] font-mono text-purple-300 uppercase tracking-wider font-semibold">Active Profile</p>
                      <p className="text-sm font-semibold text-white truncate">{user?.name || 'Active User'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email || 'user@example.com'}</p>
                    </div>

                    <button
                      onClick={() => switchRole('participant')}
                      className={`w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 hover:bg-white/5 transition-colors cursor-pointer ${state.currentRole === 'participant' ? 'text-purple-300 font-medium bg-purple-950/40' : 'text-slate-300'}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>Participant view</span>
                      {state.currentRole === 'participant' && <Check size={14} className="ml-auto text-purple-400" />}
                    </button>
                    <button
                      onClick={() => switchRole('organizer')}
                      className={`w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 hover:bg-white/5 transition-colors cursor-pointer ${state.currentRole === 'organizer' ? 'text-purple-300 font-medium bg-purple-950/40' : 'text-slate-300'}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-violet-400" />
                      <span>Organizer view</span>
                      {state.currentRole === 'organizer' && <Check size={14} className="ml-auto text-violet-400" />}
                    </button>

                    <div className="border-t border-purple-500/15 my-1.5" />

                    <button
                      onClick={() => openAuth('signin')}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                    >
                      <LogIn size={14} className="text-purple-400" />
                      <span>Switch persona / Sign In</span>
                    </button>

                    <button
                      onClick={() => openAuth('signup')}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                    >
                      <UserPlus size={14} className="text-purple-400" />
                      <span>Create new account</span>
                    </button>

                    <button
                      onClick={resetDemo}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw size={13} />
                      <span>Reset demo state</span>
                    </button>

                    <div className="border-t border-purple-500/15 my-1.5" />

                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>

              {/* User avatar */}
              <Link to="/profile" className="shrink-0" aria-label="Your profile">
                <Avatar initials={user?.initials} size="sm" index={0} className="ring-1 ring-purple-500/30 hover:ring-2 hover:ring-purple-400/60 transition-all" />
              </Link>

              {/* Mobile toggle */}
              <button
                className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                onClick={() => setMobileOpen(v => !v)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 pt-16" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <nav
              className="relative bg-surface border-r border-white/10 h-full w-64 shadow-modal p-4 flex flex-col gap-1 animate-slideInRight overflow-y-auto"
              onClick={e => e.stopPropagation()}
              aria-label="Mobile navigation"
            >
              <NavLinks onClick={() => setMobileOpen(false)} />
            </nav>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 relative z-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-purple-500/15 bg-[#0C0818]/60 backdrop-blur-md py-6 px-6 text-center text-xs text-slate-400">
          TeamWeave — Professional Skill-Based Teaming Architecture
        </footer>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authTab}
      />
    </div>
  );
}
