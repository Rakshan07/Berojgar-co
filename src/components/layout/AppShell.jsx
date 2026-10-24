import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Calendar, Users, Trophy,
  Menu, X, ChevronDown, RefreshCw, Check, ArrowRight, LogIn, LogOut, UserPlus, Sparkles, Plus
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
                ? 'bg-[#a31c1b]/20 text-[#F7FAF8] font-semibold border border-[#a31c1b]/50 shadow-sm shadow-black/60'
                : 'text-[#C8D1CC] hover:text-[#F7FAF8] hover:bg-white/5'
              }
            `}
          >
            <span className={active ? 'text-[#E56E6D]' : 'text-[#8F9E97]'}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="relative min-h-screen flex flex-col text-[#F7FAF8] bg-[#06110C] overflow-x-hidden">
      {/* ─── Ambient Atmospheric Background Lighting across all pages ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(163,28,27,0.18),transparent_70%)]" />
        <div className="absolute top-[30%] -right-40 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(23,23,23,0.85),transparent_65%)]" />
        <div className="absolute bottom-0 left-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(6,17,12,0.8),transparent_60%)]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-screen">
        {/* Header - Glassmorphic floating nav with crisp border */}
        <header className="sticky top-0 z-40 bg-[#171717]/92 backdrop-blur-2xl border-b border-[#333D38]/80 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
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
              {/* Unified Account & Avatar Button */}
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(v => !v)}
                  className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full border border-[#333D38] bg-[#171717]/95 hover:border-[#a31c1b] hover:bg-[#222624] text-xs text-[#F7FAF8] transition-all shadow-sm cursor-pointer focus-visible:outline-[#a31c1b] group"
                  aria-expanded={roleMenuOpen}
                >
                  <Avatar
                    initials={user?.initials}
                    size="sm"
                    index={0}
                    className="w-7 h-7 text-[11px] ring-1 ring-[#333D38] group-hover:ring-[#a31c1b] transition-all"
                  />
                  <div className="flex flex-col text-left leading-tight hidden sm:flex">
                    <span className="font-semibold text-xs text-[#F7FAF8] max-w-[110px] truncate group-hover:text-[#E56E6D] transition-colors">
                      {user?.name || 'Account'}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8F9E97] flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${isOrganizer ? 'bg-[#a31c1b]' : 'bg-[#10B981]'}`} />
                      {isOrganizer ? 'Host' : 'Participant'}
                    </span>
                  </div>
                  <ChevronDown size={13} className={`text-[#8F9E97] transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#171717] border border-[#333D38] rounded-2xl shadow-2xl z-50 p-2 animate-fadeIn backdrop-blur-2xl">
                    <div className="px-3 py-2.5 border-b border-[#333D38]/60 mb-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-[#E56E6D] uppercase tracking-wider font-semibold">Account Profile</span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold ${isOrganizer ? 'bg-[#a31c1b]/20 text-[#E56E6D] border border-[#a31c1b]/50' : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'}`}>
                          {isOrganizer ? 'Organizer Account' : 'Participant Account'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#F7FAF8] truncate">{user?.name || 'Active User'}</p>
                      <p className="text-[11px] text-[#8F9E97] truncate">{user?.email || 'user@example.com'}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setRoleMenuOpen(false)}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-[#F7FAF8] hover:bg-white/5 transition-colors"
                    >
                      <User size={14} className="text-[#E56E6D]" />
                      <span>My Profile</span>
                    </Link>

                    {isOrganizer ? (
                      <>
                        <Link
                          to="/organizer"
                          onClick={() => setRoleMenuOpen(false)}
                          className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-[#F7FAF8] hover:bg-white/5 transition-colors"
                        >
                          <LayoutDashboard size={14} className="text-[#E56E6D]" />
                          <span>Organizer Workspace</span>
                        </Link>
                        <Link
                          to="/organizer/create"
                          onClick={() => setRoleMenuOpen(false)}
                          className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-[#F7FAF8] hover:bg-white/5 transition-colors"
                        >
                          <Plus size={14} className="text-[#E56E6D]" />
                          <span>Create New Event</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/dashboard"
                          onClick={() => setRoleMenuOpen(false)}
                          className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-[#F7FAF8] hover:bg-white/5 transition-colors"
                        >
                          <LayoutDashboard size={14} className="text-[#E56E6D]" />
                          <span>Participant Dashboard</span>
                        </Link>
                        <Link
                          to="/organizer/auth"
                          onClick={() => setRoleMenuOpen(false)}
                          className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-[#E56E6D] bg-[#222624] hover:bg-[#2A302C] border border-[#333D38] transition-colors"
                        >
                          <Sparkles size={14} className="text-[#a31c1b]" />
                          <span>Host an Event / Organizer Portal</span>
                        </Link>
                      </>
                    )}

                    <div className="border-t border-[#333D38]/50 my-1.5" />

                    <button
                      onClick={() => openAuth('signin')}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-[#C8D1CC] hover:bg-white/5 hover:text-[#F7FAF8] transition-colors cursor-pointer"
                    >
                      <LogIn size={14} className="text-[#E56E6D]" />
                      <span>Switch account / Sign in</span>
                    </button>

                    <button
                      onClick={() => openAuth('signup')}
                      className="w-full text-left px-3 py-2 text-sm rounded-xl flex items-center gap-2 text-[#C8D1CC] hover:bg-white/5 hover:text-[#F7FAF8] transition-colors cursor-pointer"
                    >
                      <UserPlus size={14} className="text-[#E56E6D]" />
                      <span>Create new account</span>
                    </button>

                    <div className="border-t border-[#333D38]/50 my-1.5" />

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

              {/* Mobile toggle */}
              <button
                className="md:hidden text-[#9EAAA4] hover:text-[#F7FAF8] p-1 rounded-lg hover:bg-white/5"
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
              className="relative bg-[#171717] border-r border-[#333D38] h-full w-64 shadow-modal p-4 flex flex-col gap-1 animate-slideInRight overflow-y-auto"
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
        <footer className="border-t border-[#333D38]/40 bg-[#171717]/60 backdrop-blur-md py-6 px-6 text-center text-xs text-[#9EAAA4]">
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
