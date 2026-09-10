import { API_BASE_URL } from "../config";
import { clearToken, decodeJwt, getPrimaryRole, getToken, saveToken } from "./tokenService";

export async function registerUser(userData) {
  const isFormData = userData instanceof FormData;
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    body: isFormData ? userData : JSON.stringify(userData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }

  return data;
}

export async function loginUser(credentials) {
  const response = await fetch(`${API_BASE_URL}/login_check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}

export async function requestPasswordReset(email) {
  const response = await fetch(`${API_BASE_URL}/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to request password reset.");
  }

  return data;
}

export async function resendVerificationEmail(email) {
  const response = await fetch(`${API_BASE_URL}/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Failed to resend the verification email.");
    error.status = response.status;
    error.retryAfterSeconds = data.retryAfterSeconds;
    throw error;
  }
  return data;
}

export async function verifyEmail(token) {
  const response = await fetch(`${API_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Email verification failed.");
  return data;
}

export async function resetPassword(token, newPassword) {
  const response = await fetch(`${API_BASE_URL}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, newPassword }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to reset password.");
  }

  return data;
}

export function getRoleFromToken(token) {
  return getPrimaryRole(token);
}

export function logout() {
  clearToken();
}

export { decodeJwt, getToken, saveToken };

export async function createEmployerJob(jobData) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/employer/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": token,
    },
    body: JSON.stringify(jobData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to create job.");
  }

  return data;
}

export async function getJobDefinitions() {
  const response = await fetch(`${API_BASE_URL}/job-definitions`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to load the job catalogue.");
  return data;
}

export async function getEmployerJobDefinition(jobDefinitionId) {
  const response = await fetch(`${API_BASE_URL}/employer/job-definitions/${jobDefinitionId}`, { headers: { "X-Auth-Token": getToken() } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to load job tasks.");
  return data;
}

export async function getEmployerJobs() {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/employer/jobs`, {
    method: "GET",
    headers: {
      "X-Auth-Token": token,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to load jobs.");
  }

  return data;
}

export async function updateEmployerJob(jobId, jobData) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/employer/jobs/${jobId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": token,
    },
    body: JSON.stringify(jobData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to update job.");
  }

  return data;
}

export async function deleteEmployerJob(jobId) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/employer/jobs/${jobId}`, {
    method: "DELETE",
    headers: {
      "X-Auth-Token": token,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete job.");
  }

  return data;
}

export async function applyToJob(jobId, applicationDocument, recommendationLetter, positionKnowledgeLevel) {
  const token = getToken();

  const formData = new FormData();
  formData.append("positionKnowledgeLevel", positionKnowledgeLevel);

  if (applicationDocument) {
    formData.append("applicationDocument", applicationDocument);
  }

  if (recommendationLetter) {
    formData.append("recommendationLetter", recommendationLetter);
  }

  const response = await fetch(`${API_BASE_URL}/candidate/jobs/${jobId}/apply`, {
    method: "POST",
    headers: {
      "X-Auth-Token": token,
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to submit application.");
  }

  return data;
}

export async function getCandidateApplications() {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/candidate/applications`, {
    method: "GET",
    headers: {
      "X-Auth-Token": token,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to load applications.");
  }

  return data;
}

export async function getCandidateMatches() {
  const response = await fetch(`${API_BASE_URL}/candidate/matches`, {
    headers: { "X-Auth-Token": getToken() },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to calculate job matches.");
  return data;
}

export async function getEmployerApplications() {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/employer/applications`, {
    method: "GET",
    headers: {
      "X-Auth-Token": token,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to load applications.");
  }

  return data;
}

export async function updateApplicationStatus(applicationId, status) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/employer/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": token,
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to update application status.");
  }

  return data;
}

export async function deleteEmployerApplication(applicationId) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/employer/applications/${applicationId}`, {
    method: "DELETE",
    headers: {
      "X-Auth-Token": token,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete application.");
  }

  return data;
}

export async function getEmployerProfile() {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/employer/profile`, {
    method: "GET",
    headers: {
      "X-Auth-Token": token,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to load employer profile.");
  }

  return data;
}

export async function updateEmployerProfile(profileData) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/employer/profile`, {
    method: "POST",
    headers: {
      "X-Auth-Token": token,
    },
    body: profileData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to save employer profile.");
  }

  return data;
}

export async function getAdminApplications() {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/admin/applications`, {
    method: "GET",
    headers: {
      "X-Auth-Token": token,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to load admin applications.");
  }

  return data;
}

export async function openAdminApplicationFile(applicationId, type, download = false) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/admin/applications/${applicationId}/download/${type}${download ? "?download=1" : ""}`,
    {
      method: "GET",
      headers: {
        "X-Auth-Token": token,
      },
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to open file.");
  }

  const blob = await response.blob();
  const fileUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = fileUrl;
  link.target = download ? "_self" : "_blank";
  link.rel = "noopener noreferrer";
  if (download) link.download = "application-document";
  link.click();
  window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60_000);
}
