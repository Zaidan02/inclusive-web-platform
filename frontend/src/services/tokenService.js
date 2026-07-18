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
  if (roles.includes("ROLE_ADMIN")) return "ROLE_ADMIN";
  if (roles.includes("ROLE_EMPLOYER")) return "ROLE_EMPLOYER";
  return roles[0] || null;
}

export function saveToken(token) { localStorage.setItem("token", token); }
export function getToken() { return localStorage.getItem("token"); }
export function clearToken() { localStorage.removeItem("token"); }
