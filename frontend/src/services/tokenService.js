export function decodeJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = decodeURIComponent(atob(base64).split("").map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`).join(""));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function getRolesFromToken(token) {
  const decoded = decodeJwt(token);
  if (!decoded) return [];
  if (Array.isArray(decoded.roles)) return decoded.roles;
  return decoded.role ? [decoded.role] : [];
}

export function getPrimaryRole(token) {
  const roles = getRolesFromToken(token);
  return getPrimaryRoleFromRoles(roles);
}

export function getPrimaryRoleFromRoles(roles) {
  if (roles.includes("ROLE_ADMIN")) return "ROLE_ADMIN";
  if (roles.includes("ROLE_VERIFIER")) return "ROLE_VERIFIER";
  if (roles.includes("ROLE_EMPLOYER")) return "ROLE_EMPLOYER";
  if (roles.includes("ROLE_CANDIDATE")) return "ROLE_CANDIDATE";
  return null;
}

export function saveToken(token) {
  localStorage.removeItem("token");
  sessionStorage.setItem("token", token);
}

export function getToken() {
  // Remove tokens created by older builds; persistent browser storage made a
  // reopened dashboard look like an unauthenticated bypass.
  localStorage.removeItem("token");
  return sessionStorage.getItem("token");
}

export function clearToken() {
  sessionStorage.removeItem("token");
  localStorage.removeItem("token");
}
