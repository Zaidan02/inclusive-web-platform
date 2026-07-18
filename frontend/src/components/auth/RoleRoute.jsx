import { Navigate } from "react-router-dom";
import { getPrimaryRole, getToken } from "../../services/tokenService";

const roleHomes = { ROLE_ADMIN: "/admin", ROLE_EMPLOYER: "/employer", ROLE_USER: "/candidate" };

export default function RoleRoute({ role, children }) {
  const token = getToken();
  if (!token) return <Navigate to="/signin" replace />;
  const currentRole = getPrimaryRole(token);
  if (currentRole !== role) return <Navigate to={roleHomes[currentRole] || "/signin"} replace />;
  return children;
}
