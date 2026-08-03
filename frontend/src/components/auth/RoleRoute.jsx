import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import { clearToken, getPrimaryRole, getPrimaryRoleFromRoles, getToken } from "../../services/tokenService";

const roleHomes = { ROLE_ADMIN: "/admin", ROLE_VERIFIER: "/verifier", ROLE_EMPLOYER: "/employer", ROLE_CANDIDATE: "/candidate" };

export default function RoleRoute({ role, children }) {
  const token = getToken();
  const [session, setSession] = useState({ state: "checking", role: null });

  const validateSession = useCallback(async () => {
    if (!token) {
      setSession({ state: "anonymous", role: null });
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/session`, {
        headers: { "X-Auth-Token": token },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Invalid session");
      const data = await response.json();
      const serverRole = getPrimaryRoleFromRoles(data.user?.roles || []);
      if (getPrimaryRole(token) !== serverRole) {
        clearToken();
        setSession({ state: "anonymous", role: null });
        return;
      }
      setSession({ state: serverRole === role ? "authorized" : "wrong-role", role: serverRole });
    } catch {
      clearToken();
      setSession({ state: "anonymous", role: null });
    }
  }, [role, token]);

  useEffect(() => {
    validateSession();
    const interval = window.setInterval(validateSession, 60_000);
    window.addEventListener("focus", validateSession);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", validateSession);
    };
  }, [validateSession]);

  if (session.state === "checking") {
    return <p role="status" style={{ padding: "2rem", textAlign: "center" }}>Checking secure session…</p>;
  }
  if (session.state === "anonymous") return <Navigate to="/signin" replace />;
  if (session.state === "wrong-role") return <Navigate to={roleHomes[session.role] || "/signin"} replace />;
  return children;
}
