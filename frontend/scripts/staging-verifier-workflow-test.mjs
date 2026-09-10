import fs from "node:fs/promises";
import path from "node:path";
import { API_BASE, fixtureAccounts, login, requestJson, tokenHeaders } from "./test-helpers.mjs";

const OUTPUT = process.env.VERIFIER_WORKFLOW_OUTPUT || path.resolve("..", "docs", "testing", "staging-2026-09-10", "verifier-workflow-results.json");
const PASSWORD = "Synthetic9!Test";
const PRIVACY_VERSION = "2026-08-03";
const results = [];
const cleanup = [];
const createdUserIds = [];

function add(testId, status, actual, extra = {}) {
  results.push({ testId, status, actual, ...extra });
  process.stdout.write(`${testId}: ${status} - ${actual}\n`);
}

async function registerCandidate(suffix) {
  const email = `workflow-${suffix}-${Date.now()}@example.test`;
  const username = `workflow_${suffix}_${Date.now()}`;
  const form = new FormData();
  form.set("username", username);
  form.set("email", email);
  form.set("password", PASSWORD);
  form.set("accountType", "candidate");
  form.set("privacyAccepted", "true");
  form.set("privacyVersion", PRIVACY_VERSION);
  form.set("disabilityVerificationConsent", "true");
  form.set("sendVerificationEmail", "false");
  const pdf = new Blob(["%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"], { type: "application/pdf" });
  form.set("disabilityCard", pdf, `synthetic-${suffix}.pdf`);
  const response = await fetch(`${API_BASE}/register`, { method: "POST", body: form });
  const body = await response.json().catch(() => ({}));
  return { email, username, status: response.status, body };
}

const [adminToken, verifierToken] = await Promise.all([
  login(fixtureAccounts.admin.email),
  login(fixtureAccounts.verifier.email),
]);

async function activeUsers() {
  return requestJson(`${API_BASE}/admin/users`, { headers: tokenHeaders(adminToken) });
}

async function findAndTrackUser(email) {
  const users = await activeUsers();
  const user = (users.body.users || []).find((item) => item.email === email);
  if (user?.id && !createdUserIds.includes(user.id)) createdUserIds.push(user.id);
  return user;
}

async function findRequest(email, status = "all") {
  const response = await requestJson(`${API_BASE}/verifier/requests?status=${status}`, { headers: tokenHeaders(verifierToken) });
  const item = (response.body.requests || []).find((request) => request.candidate?.email === email);
  return { response, item };
}

try {
  const approvalCandidate = await registerCandidate("approve");
  const approvalUser = await findAndTrackUser(approvalCandidate.email);
  const pendingApproval = await findRequest(approvalCandidate.email, "pending");
  let documentStatus = null;
  let cacheControl = null;
  if (pendingApproval.item?.id) {
    const document = await fetch(`${API_BASE}/verifier/requests/${pendingApproval.item.id}/document`, { headers: tokenHeaders(verifierToken) });
    documentStatus = document.status;
    cacheControl = document.headers.get("cache-control");
  }
  const openPass = approvalCandidate.status === 201
    && Boolean(approvalUser?.id)
    && pendingApproval.response.response.status === 200
    && pendingApproval.item?.document?.available === true
    && documentStatus === 200
    && /no-store/i.test(cacheControl || "");
  add("WF-VER-01", openPass ? "Pass" : "Fail", `Synthetic candidate registration HTTP ${approvalCandidate.status}; pending request found=${Boolean(pendingApproval.item)}; authorized document HTTP ${documentStatus}; private no-store caching=${/no-store/i.test(cacheControl || "")}.`);

  if (pendingApproval.item?.id) {
    const approved = await requestJson(`${API_BASE}/verifier/requests/${pendingApproval.item.id}`, {
      method: "PATCH",
      headers: { ...tokenHeaders(verifierToken), "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", note: "Synthetic valid evidence approved during isolated workflow testing." }),
    });
    const approvedRead = await findRequest(approvalCandidate.email, "approved");
    const approvePass = approved.response.status === 200
      && approved.body.request?.status === "approved"
      && approvedRead.item?.status === "approved"
      && Boolean(approvedRead.item?.reviewer)
      && Boolean(approvedRead.item?.reviewedAt);
    add("WF-VER-02", approvePass ? "Pass" : "Fail", `Approval returned HTTP ${approved.response.status}; approved status, reviewer and timestamp persisted=${approvePass}.`);
  } else {
    add("WF-VER-02", "Blocked", "The disposable pending approval request was not created.");
  }

  const rejectionCandidate = await registerCandidate("reject");
  await findAndTrackUser(rejectionCandidate.email);
  const pendingRejection = await findRequest(rejectionCandidate.email, "pending");
  if (pendingRejection.item?.id) {
    const reason = "Synthetic card is intentionally unsuitable for this rejection workflow test.";
    const rejected = await requestJson(`${API_BASE}/verifier/requests/${pendingRejection.item.id}`, {
      method: "PATCH",
      headers: { ...tokenHeaders(verifierToken), "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", note: reason }),
    });
    const rejectedRead = await findRequest(rejectionCandidate.email, "rejected");
    const rejectPass = rejectionCandidate.status === 201
      && rejected.response.status === 200
      && rejected.body.request?.status === "rejected"
      && rejectedRead.item?.reviewerNote === reason
      && Boolean(rejectedRead.item?.reviewer)
      && Boolean(rejectedRead.item?.reviewedAt);
    add("WF-VER-03", rejectPass ? "Pass" : "Fail", `Rejection returned HTTP ${rejected.response.status}; reason, reviewer and timestamp persisted=${rejectPass}.`);
  } else {
    add("WF-VER-03", "Blocked", `Synthetic rejection candidate registration returned HTTP ${rejectionCandidate.status}, but no pending request was found.`);
  }
} finally {
  for (const userId of createdUserIds.reverse()) {
    const removed = await requestJson(`${API_BASE}/admin/users/${userId}`, { method: "DELETE", headers: tokenHeaders(adminToken) });
    cleanup.push({ userId, status: removed.response.status });
  }
}

const summary = {
  planned: 3,
  pass: results.filter((item) => item.status === "Pass").length,
  fail: results.filter((item) => item.status === "Fail").length,
  blocked: results.filter((item) => item.status === "Blocked").length,
  cleanupSuccessful: cleanup.length === 2 && cleanup.every((item) => item.status === 200),
};
await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), apiBase: API_BASE, methodology: "Disposable candidate accounts and synthetic PDF cards; one approval and one rejection; all accounts and private documents deleted afterward.", summary, cleanup, results }, null, 2)}\n`, "utf8");
process.stdout.write(`Wrote ${OUTPUT}\n${JSON.stringify(summary)}\n`);
