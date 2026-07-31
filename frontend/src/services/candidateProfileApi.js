import { API_BASE_URL, VOICE_NAVIGATION_URL } from "../config";
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

export async function requestAiProfileSuggestions(profileData) {
  const response = await fetch(`${API_BASE_URL}/candidate/profile/ai-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() },
    body: JSON.stringify(profileData),
  });
  return readJson(response);
}

export async function confirmAiProfileSuggestions(confirmedSuggestions) {
  const response = await fetch(`${API_BASE_URL}/candidate/profile/ai-confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() },
    body: JSON.stringify(confirmedSuggestions),
  });
  return readJson(response);
}

export async function transcribeProfileAudio(audioBlob, language) {
  const body = new FormData();
  const extension = audioBlob.type.includes("ogg") ? "ogg" : "webm";
  body.append("audio", audioBlob, `candidate-profile.${extension}`);
  body.append("language", language);
  const response = await fetch(`${VOICE_NAVIGATION_URL}/api/profile/transcribe`, {
    method: "POST",
    body,
  });
  return readJson(response);
}
