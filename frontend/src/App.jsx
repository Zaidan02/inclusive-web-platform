import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RoleRoute from "./components/auth/RoleRoute";
import VoiceNavigationControl from "./components/voice/VoiceNavigationControl";
import RouteAccessibility from "./components/accessibility/RouteAccessibility";
import SkipLink from "./components/accessibility/SkipLink";
import ArrowKeyFocusNavigation from "./components/accessibility/ArrowKeyFocusNavigation";
import LanguageSwitcher from "./components/localization/LanguageSwitcher";
import "./styles/dashboard.css";

const WelcomePage = lazy(() => import("./pages/WelcomePage"));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const CandidateDashboard = lazy(() => import("./pages/CandidateDashboard"));
const EmployerDashboard = lazy(() => import("./pages/EmployerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const VerifierDashboard = lazy(() => import("./pages/VerifierDashboard"));
const EmployersPage = lazy(() => import("./pages/EmployersPage"));
const CandidateProfileSetup = lazy(() => import("./features/candidate/profile/CandidateProfileSetup"));
const VoiceNavigationHelpPage = lazy(() => import("./pages/VoiceNavigationHelpPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));

function AppContent() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const hasInlineLanguageSwitcher = location.pathname === "/";

  return (
    <>
      <RouteAccessibility />
      <ArrowKeyFocusNavigation />
      <SkipLink />
      {!hasInlineLanguageSwitcher && <LanguageSwitcher />}
      <VoiceNavigationControl />
      <div id="main-content" className="route-content" tabIndex="-1">
        <Suspense fallback={<p className="route-loading" role="status">{t("loadingPage")}</p>}>
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
        </Suspense>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
