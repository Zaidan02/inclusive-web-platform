import { API_BASE_URL } from "../config";
import { getToken } from "./tokenService";

async function readJson(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || fallback);
  return data;
}

export async function getVerificationRequests(status = "pending") {
  const response = await fetch(`${API_BASE_URL}/verifier/requests?status=${encodeURIComponent(status)}`, {
    headers: { "X-Auth-Token": getToken() },
  });
  return readJson(response, "Failed to load candidate verification requests.");
}

export async function updateVerificationRequest(id, status, note = "") {
  const response = await fetch(`${API_BASE_URL}/verifier/requests/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": getToken(),
    },
    body: JSON.stringify({ status, note }),
  });
  return readJson(response, "Failed to update the verification request.");
}

export async function openVerificationDocument(id, originalName, download = false) {
  const response = await fetch(
    `${API_BASE_URL}/verifier/requests/${id}/document${download ? "?download=1" : ""}`,
    { headers: { "X-Auth-Token": getToken() } }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to open the verification document.");
  }

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.target = download ? "_self" : "_blank";
  link.rel = "noopener noreferrer";
  if (download) link.download = originalName || "disability-card";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
