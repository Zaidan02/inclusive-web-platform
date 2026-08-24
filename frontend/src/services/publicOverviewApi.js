import { API_BASE_URL } from "../config";

export async function getPublicOverview(signal) {
  const response = await fetch(`${API_BASE_URL}/public-overview`, { signal });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to load the public opportunity overview.");
  }

  return data;
}
