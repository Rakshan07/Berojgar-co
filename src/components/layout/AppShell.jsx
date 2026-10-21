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
import { logoutApi } from '../../services/authApi';

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
    navigate(role === 'organizer' ? '/organizer' : '/dashboard');
    toast.info(`Switched to ${role === 'organizer' ? 'Organizer' : 'Participant'} view`);
  }

  function resetDemo() {
    dispatch({ type: 'RESET_DEMO' });
    setRoleMenuOpen(false);
    toast.success('Demo data reset to defaults');
  }

  function handleSignOut() {
    logoutApi();
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
                ? 'bg-[#B92345]/20 text-[#FFF4F6] font-semibold border border-[#B92345]/50 shadow-sm shadow-[#17080F]/50'
                : 'text-[#D7B7C2] hover:text-[#FFF4F6] hover:bg-white/5'
              }
            `}
          >
            <span className={active ? 'text-[#F28BA8]' : 'text-[#B68F9E]'}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="relative min-h-screen flex flex-col text-[#FFF4F6] bg-[#17080F] overflow-x-hidden">
      {/* ─── Ambient Atmospheric Background Lighting across all pages ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(185,35,69,0.12),transparent_70%)]" />
        <div className="absolute top-[30%] -right-40 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(99,48,68,0.15),transparent_65%)]" />
        <div className="absolute bottom-0 left-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(140,21,56,0.10),transparent_60%)]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-screen">
        {/* Header - Glassmorphic floating nav with garnet hairline border */}
        <header className="sticky top-0 z-40 bg-[#220B15]/90 backdrop-blur-2xl border-b border-[#633044]/80 shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#633044] bg-[#2C101C]/90 hover:border-[#8C3B58] hover:bg-[#3A1524] text-xs font-mono uppercase tracking-wider text-[#FFF4F6] transition-all shadow-sm cursor-pointer focus-visible:outline-[#F7A5BD]"
                  aria-expanded={roleMenuOpen}
                >
                  <span className={`w-2 h-2 rounded-full ${isOrganizer ? 'bg-[#D23357] shadow-[0_0_8px_rgba(210,51,87,0.8)]' : 'bg-[#B92345] shadow-[0_0_8px_rgba(185,35,69,0.8)]'}`} />
                  <span>{isOrganizer ? 'Organizer' : 'Participant'}</span>
                  <ChevronDown size={13} className={`text-[#B68F9E] transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-[#2C101C] border border-[#633044] rounded-2xl shadow-2xl z-50 p-2 animate-fadeIn backdrop-blur-2xl">
                    <div className="px-3 py-2 border-b border-[#633044]/50 mb-1.5">
                      <p className="text-[11px] font-mono text-[#F28BA8] uppercase tracking-wider font-semibold">Active Profile</p>
                      <p className="text-sm font-semibold text-[#FFF4F6] truncate">{user?.name || 'Active User'}</p>
                      <p className="text-[11px] text-[#B68F9E] truncate">{user?.email || 'user@example.com'}</p>
                    </div>

                    <button
                      onClick={() => switchRole('participant')}
                      className={`w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 hover:bg-white/5 transition-colors cursor-pointer ${state.currentRole === 'participant' ? 'text-[#F28BA8] font-medium bg-[#3A1524]' : 'text-[#D7B7C2]'}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#B92345]" />
                      <span>Participant view</span>
                      {state.currentRole === 'participant' && <Check size={14} className="ml-auto text-[#F28BA8]" />}
                    </button>
                    <button
                      onClick={() => switchRole('organizer')}
                      className={`w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 hover:bg-white/5 transition-colors cursor-pointer ${state.currentRole === 'organizer' ? 'text-[#F28BA8] font-medium bg-[#3A1524]' : 'text-[#D7B7C2]'}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#D23357]" />
                      <span>Organizer view</span>
                      {state.currentRole === 'organizer' && <Check size={14} className="ml-auto text-[#F28BA8]" />}
                    </button>

                    <div className="border-t border-[#633044]/50 my-1.5" />

                    <button
                      onClick={() => openAuth('signin')}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-[#D7B7C2] hover:bg-white/5 hover:text-[#FFF4F6] transition-colors cursor-pointer"
                    >
                      <LogIn size={14} className="text-[#F28BA8]" />
                      <span>Switch persona / Sign In</span>
                    </button>

                    <button
                      onClick={() => openAuth('signup')}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-[#D7B7C2] hover:bg-white/5 hover:text-[#FFF4F6] transition-colors cursor-pointer"
                    >
                      <UserPlus size={14} className="text-[#F28BA8]" />
                      <span>Create new account</span>
                    </button>

                    <button
                      onClick={resetDemo}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-[#B68F9E] hover:bg-white/5 hover:text-[#FFF4F6] transition-colors cursor-pointer"
                    >
                      <RefreshCw size={13} />
                      <span>Reset demo state</span>
                    </button>

                    <div className="border-t border-[#633044]/50 my-1.5" />

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
                <Avatar initials={user?.initials} size="sm" index={0} className="ring-1 ring-[#633044] hover:ring-2 hover:ring-[#F28BA8] transition-all" />
              </Link>

              {/* Mobile toggle */}
              <button
                className="md:hidden text-[#B68F9E] hover:text-[#FFF4F6] p-1 rounded-lg hover:bg-white/5"
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
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <nav
              className="relative bg-[#220B15] border-r border-[#633044] h-full w-64 shadow-modal p-4 flex flex-col gap-1 animate-slideInRight overflow-y-auto"
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
        <footer className="border-t border-[#633044]/40 bg-[#220B15]/60 backdrop-blur-md py-6 px-6 text-center text-xs text-[#B68F9E]">
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
