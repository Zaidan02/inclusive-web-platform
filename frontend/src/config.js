function withoutTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

const browserHost = window.location.hostname || "127.0.0.1";

export const BACKEND_BASE_URL = withoutTrailingSlash(
  import.meta.env.VITE_BACKEND_URL || `http://${browserHost}:8081`,
);

export const API_BASE_URL = withoutTrailingSlash(
  import.meta.env.VITE_API_URL || `${BACKEND_BASE_URL}/api`,
);

export const VOICE_NAVIGATION_URL = withoutTrailingSlash(
  import.meta.env.VITE_VOICE_NAVIGATION_URL || `http://${browserHost}:5002`,
);

