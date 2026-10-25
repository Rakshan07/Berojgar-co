// ─── App Router ────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './app/AppContext';
import { AppShell } from './components/layout/AppShell';
import { ToastContainer } from './components/ui/ToastContainer';

// Public
import LandingPage from './pages/public/MotionLandingPage';
import LoginPage from './pages/public/LoginPage';
import OrganizerAuthPage from './pages/public/OrganizerAuthPage';

// Participant
import ParticipantDashboard from './pages/participant/Dashboard';
import ProfilePage from './pages/participant/ProfilePage';
import EventDiscoveryPage from './pages/participant/EventDiscovery';
import EventDetailPage from './pages/participant/EventDetail';
import ParticipantTeamPage from './pages/participant/MyTeamPage';
import DailyChallengePage from './pages/participant/DailyChallenge';

// Organizer
import OrganizerDashboard from './pages/organizer/OrganizerDashboard';
import OrganizerEventsPage from './pages/organizer/OrganizerEvents';
import CreateEventWizard from './pages/organizer/CreateEventWizard';
import ParticipantRosterPage from './pages/organizer/ParticipantRoster';
import TeamFormationPage from './pages/organizer/TeamFormation';

function OrganizerGuard({ children }) {
  const { state } = useApp();
  if (state.currentRole !== 'organizer') {
    return <Navigate to="/organizer/auth" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing & Auth (no shell) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/organizer/auth" element={<OrganizerAuthPage />} />
          <Route path="/organizer/login" element={<OrganizerAuthPage />} />

          {/* App shell wraps all authenticated routes */}
          <Route
            path="/*"
            element={
              <AppShell>
                <Routes>
                  {/* Participant */}
                  <Route path="/dashboard" element={<ParticipantDashboard />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/events" element={<EventDiscoveryPage />} />
                  <Route path="/events/:eventId" element={<EventDetailPage />} />
                  <Route path="/my-team" element={<ParticipantTeamPage />} />
                  <Route path="/challenge" element={<DailyChallengePage />} />

                  {/* Organizer - guarded so only organizers can view */}
                  <Route path="/organizer" element={<OrganizerGuard><OrganizerDashboard /></OrganizerGuard>} />
                  <Route path="/organizer/events" element={<OrganizerGuard><OrganizerEventsPage /></OrganizerGuard>} />
                  <Route path="/organizer/create" element={<OrganizerGuard><CreateEventWizard /></OrganizerGuard>} />
                  <Route path="/organizer/roster" element={<OrganizerGuard><ParticipantRosterPage /></OrganizerGuard>} />
                  <Route path="/organizer/teams" element={<OrganizerGuard><TeamFormationPage /></OrganizerGuard>} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppShell>
            }
          />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}
