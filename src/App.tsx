import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Dashboard from './pages/Dashboard';
import BriefBuilder from './pages/BriefBuilder';
import VettingPage from './pages/VettingPage';
import ProjectDetails from './pages/ProjectDetails';
import ProviderProfile from './pages/ProviderProfile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" expand={false} richColors />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/brief-builder" element={<BriefBuilder />} />
          <Route path="/vetting" element={<VettingPage />} />
          <Route path="/project/:id" element={<ProjectDetails />} />
          <Route path="/provider/:id" element={<ProviderProfile />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
