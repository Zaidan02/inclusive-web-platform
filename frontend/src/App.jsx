import { BrowserRouter, Routes, Route } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CandidateDashboard from "./pages/CandidateDashboard";
import EmployerDashboard from "./pages/EmployerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import VerifierDashboard from "./pages/VerifierDashboard";
import EmployersPage from "./pages/EmployersPage";
import RoleRoute from "./components/auth/RoleRoute";
import CandidateProfileSetup from "./features/candidate/profile/CandidateProfileSetup";
import VoiceNavigationControl from "./components/voice/VoiceNavigationControl";
import VoiceNavigationHelpPage from "./pages/VoiceNavigationHelpPage";
import PrivacyPage from "./pages/PrivacyPage";
import RouteAccessibility from "./components/accessibility/RouteAccessibility";
import SkipLink from "./components/accessibility/SkipLink";
import ArrowKeyFocusNavigation from "./components/accessibility/ArrowKeyFocusNavigation";
import "./styles/dashboard.css";

function App() {
  return (
    <BrowserRouter>
      <RouteAccessibility />
      <ArrowKeyFocusNavigation />
      <SkipLink />
      <VoiceNavigationControl />
      <div id="main-content" className="route-content" tabIndex="-1">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/employers" element={<EmployersPage />} />
          <Route path="/voice-help" element={<VoiceNavigationHelpPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/candidate" element={<RoleRoute role="ROLE_CANDIDATE"><CandidateDashboard /></RoleRoute>} />
          <Route path="/candidate/setup" element={<RoleRoute role="ROLE_CANDIDATE"><CandidateProfileSetup /></RoleRoute>} />
          <Route path="/employer" element={<RoleRoute role="ROLE_EMPLOYER"><EmployerDashboard /></RoleRoute>} />
          <Route path="/admin" element={<RoleRoute role="ROLE_ADMIN"><AdminDashboard /></RoleRoute>} />
          <Route path="/verifier" element={<RoleRoute role="ROLE_VERIFIER"><VerifierDashboard /></RoleRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
