// ─── App Router ────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './app/AppContext';
import { AppShell } from './components/layout/AppShell';
import { ToastContainer } from './components/ui/ToastContainer';

// Public
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';

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

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing & Auth (no shell) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* App shell wraps all authenticated-ish routes */}
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

                  {/* Organizer */}
                  <Route path="/organizer" element={<OrganizerDashboard />} />
                  <Route path="/organizer/events" element={<OrganizerEventsPage />} />
                  <Route path="/organizer/create" element={<CreateEventWizard />} />
                  <Route path="/organizer/roster" element={<ParticipantRosterPage />} />
                  <Route path="/organizer/teams" element={<TeamFormationPage />} />

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
