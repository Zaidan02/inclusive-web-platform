import { API_BASE_URL } from "../config";

export async function registerUser(userData) {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
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

export function decodeJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(
          (char) =>
            "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2)
        )
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function getRoleFromToken(token) {
  const decoded = decodeJwt(token);

  if (!decoded) return null;

  if (decoded.roles && Array.isArray(decoded.roles) && decoded.roles.length > 0) {
    return decoded.roles[0];
  }

  return decoded.role || null;
}

export function saveToken(token) {
  localStorage.setItem("token", token);
}

export function getToken() {
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
}

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

export async function applyToJob(jobId, applicationDocument, recommendationLetter) {
  const token = getToken();

  const formData = new FormData();

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

export function getEmployerApplicationDownloadUrl(applicationId, type) {
  const token = getToken();
  return `${API_BASE_URL}/employer/applications/${applicationId}/download/${type}?token=${token}`;
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

export function getAdminApplicationFileUrl(applicationId, type, download = false) {
  const token = getToken();
  const downloadParam = download ? "&download=1" : "";

  return `${API_BASE_URL}/admin/applications/${applicationId}/download/${type}?token=${token}${downloadParam}`;
}

export async function openAdminApplicationFile(applicationId, type) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/admin/applications/${applicationId}/download/${type}`,
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
  window.open(fileUrl, "_blank");
}
