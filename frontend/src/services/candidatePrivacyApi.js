import { API_BASE_URL } from "../config";
import { getToken } from "./tokenService";

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Privacy request failed.");
  return data;
}

function authHeaders(extra = {}) {
  return { "X-Auth-Token": getToken(), ...extra };
}

export async function getPrivacySummary() {
  return readJson(await fetch(`${API_BASE_URL}/candidate/privacy`, { headers: authHeaders() }));
}

export async function exportCandidateData() {
  const response = await fetch(`${API_BASE_URL}/candidate/privacy/export`, { headers: authHeaders() });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Data export failed.");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "candidate-data-export.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function withdrawAiConsent() {
  return readJson(await fetch(`${API_BASE_URL}/candidate/privacy/ai-consent`, {
    method: "DELETE",
    headers: authHeaders(),
  }));
}
export async function deleteCandidateAccount(password, confirmation) {
  return readJson(await fetch(`${API_BASE_URL}/candidate/privacy/account`, {
    method: "DELETE",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ password, confirmation }),
  }));
}
