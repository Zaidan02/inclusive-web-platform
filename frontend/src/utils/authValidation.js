export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function getPasswordChecks(value) {
  const password = String(value || "");
  return {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    symbol: /[\W_]/.test(password),
  };
}

export function isStrongPassword(value) {
  return Object.values(getPasswordChecks(value)).every(Boolean);
}
