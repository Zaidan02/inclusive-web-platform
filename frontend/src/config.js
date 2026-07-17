function withoutTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

export const BACKEND_BASE_URL = withoutTrailingSlash(
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000",
);

export const API_BASE_URL = withoutTrailingSlash(
  import.meta.env.VITE_API_URL || `${BACKEND_BASE_URL}/api`,
);

export const AI_SERVICE_URL = withoutTrailingSlash(
  import.meta.env.VITE_AI_SERVICE_URL || "http://127.0.0.1:5001/predict",
);
