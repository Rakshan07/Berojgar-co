import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './app/AppContext';
import { ToastContainer } from './components/ui/ToastContainer';
import LandingPage from './pages/public/MotionLandingPage';
import LoginPage from './pages/public/LoginPage';
import PasswordRecovery from './pages/public/PasswordRecovery';
import CompleteProfile from './pages/public/CompleteProfile';
import OrganizerAuthPage from './pages/public/OrganizerAuthPage';
const Workspace = lazy(() => import('./workspace/Workspace').then(module => ({ default: module.WorkspaceShell })));

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/forgot-password" element={<PasswordRecovery key="forgot" />} />
          <Route path="/reset-password" element={<PasswordRecovery key="reset" reset />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/organizer/auth" element={<OrganizerAuthPage />} />
          <Route path="/organizer/login" element={<OrganizerAuthPage />} />
          <Route path="/*" element={<Suspense fallback={<div role="status" style={{minHeight:'100vh',background:'#13080e',color:'#f7faf8',padding:40}}>Opening your workspace…</div>}><Workspace /></Suspense>} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}
