import { BrowserRouter, Routes, Route } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CandidateDashboard from "./pages/CandidateDashboard";
import EmployerDashboard from "./pages/EmployerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import EmployersPage from "./pages/EmployersPage";
import RoleRoute from "./components/auth/RoleRoute";
import CandidateProfileSetup from "./features/candidate/profile/CandidateProfileSetup";
import "./styles/dashboard.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/employers" element={<EmployersPage />} />
        <Route path="/candidate" element={<RoleRoute role="ROLE_USER"><CandidateDashboard /></RoleRoute>} />
        <Route path="/candidate/setup" element={<RoleRoute role="ROLE_USER"><CandidateProfileSetup /></RoleRoute>} />
        <Route path="/employer" element={<RoleRoute role="ROLE_EMPLOYER"><EmployerDashboard /></RoleRoute>} />
        <Route path="/admin" element={<RoleRoute role="ROLE_ADMIN"><AdminDashboard /></RoleRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
