import { API_BASE_URL } from "../config";
import { getToken } from "./tokenService";

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Candidate profile request failed.");
  return data;
}

export async function getCandidateProfile() {
  const response = await fetch(`${API_BASE_URL}/candidate/profile`, {
    headers: { "X-Auth-Token": getToken() },
  });
  return readJson(response);
}

export async function updateCandidateProfile(profileData) {
  const response = await fetch(`${API_BASE_URL}/candidate/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() },
    body: JSON.stringify(profileData),
  });
  return readJson(response);
}
