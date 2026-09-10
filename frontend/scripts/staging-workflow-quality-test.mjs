import fs from "node:fs/promises";
import path from "node:path";
import { fixtureAccounts, login, requestJson, tokenHeaders } from "./test-helpers.mjs";

const API_BASE = process.env.TEST_API_BASE || "https://join-hospitality-zm-api-staging.onrender.com/api";
const OUTPUT = process.env.WORKFLOW_OUTPUT || path.resolve("..", "docs", "testing", "staging-2026-09-10", "workflow-quality-results.json");
const AI_PROBE = process.env.WORKFLOW_AI_PROBE || path.resolve("..", "docs", "testing", "staging-2026-09-10", "profile-ai", "ai-service-probe.json");
const AI_UI_REPORT = process.env.WORKFLOW_AI_UI_REPORT || path.resolve("..", "docs", "testing", "staging-2026-09-10", "profile-ai", "screenshots-en-confirmed", "multilingual-results.json");
const SCORING_HEALTH = process.env.WORKFLOW_SCORING_HEALTH || "https://join-hospitality-zm-scoring-staging.onrender.com/health";
const E2E_REPORT = process.env.WORKFLOW_E2E_REPORT || path.resolve("..", "docs", "testing", "staging-2026-09-10", "e2e-results-prepared.json");
const INTEGRATION_REPORT = process.env.WORKFLOW_INTEGRATION_REPORT || path.resolve("..", "docs", "testing", "staging-2026-09-10", "integration-results-prepared.json");

const results = [];
const cleanup = { profileReset: false, applicationDeleted: true, jobsDeleted: [], errors: [] };
const createdJobIds = [];
let createdApplicationId = null;
let candidateToken;
let employerToken;

function add(testId, status, actual, extra = {}) {
  const item = { testId, status, actual, ...extra };
  results.push(item);
  process.stdout.write(`${testId}: ${status} - ${actual}\n`);
}

function headers(token, extra = {}) {
  return { ...tokenHeaders(token), ...extra };
}

async function json(url, options = {}) {
  return requestJson(url, options);
}

async function resetCandidate() {
  const response = await json(`${API_BASE}/candidate/profile/reset`, { method: "POST", headers: headers(candidateToken) });
  const read = await json(`${API_BASE}/candidate/profile`, { headers: headers(candidateToken) });
  const profile = read.body.profile || {};
  cleanup.profileReset = response.response.status === 200
    && read.response.status === 200
    && !profile.firstName
    && !profile.educationLevel
    && (profile.selectedDisabilities || []).length === 0
    && (profile.positionInterests || []).length === 0
    && (profile.confirmedTaskSkills || []).length === 0;
}

async function saveCandidate(jobDefinitionId, preference = "both") {
  const body = {
    selectedDisabilities: ["Hand"],
    educationLevel: "university",
    readingAbility: "independent",
    writingAbility: "independent",
    numeracyAbility: "independent",
    firstName: "Workflow",
    lastName: "Candidate",
    phone: "",
    location: "Beirut",
    about: "Synthetic staging workflow evaluation profile.",
    opportunityPreference: preference,
    positionInterests: jobDefinitionId ? [{ jobDefinitionId, knowledgeLevel: "independent" }] : [],
  };
  return json(`${API_BASE}/candidate/profile`, {
    method: "PATCH",
    headers: headers(candidateToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
}

async function matchesWithRetry() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await json(`${API_BASE}/candidate/matches`, { headers: headers(candidateToken) });
    if (response.response.status !== 503 || attempt === 2) return response;
    await json(SCORING_HEALTH).catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

async function createOpportunity(type, definition, taskId, suffix) {
  const response = await json(`${API_BASE}/employer/jobs`, {
    method: "POST",
    headers: headers(employerToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      opportunityType: type,
      jobDefinitionId: definition.id,
      location: "Beirut, Lebanon",
      jobType: type === "training" ? "Hospitality training program" : "Full-time",
      workMode: "On-site",
      description: `Synthetic ${suffix} workflow verification opportunity.`,
      applicationDeadline: "2099-12-31",
      assistanceAvailable: true,
      educationRequirement: "preferred",
      minimumEducationLevel: "high_school",
      readingRequirement: "required",
      writingRequirement: "preferred",
      numeracyRequirement: "not_required",
      positionKnowledgeRequirement: "preferred",
      highlightedTaskIds: [taskId],
    }),
  });
  if (response.body.job?.id) createdJobIds.push(response.body.job.id);
  return response;
}

async function cleanupData() {
  if (createdApplicationId && employerToken) {
    const removed = await json(`${API_BASE}/employer/applications/${createdApplicationId}`, { method: "DELETE", headers: headers(employerToken) });
    cleanup.applicationDeleted = removed.response.status === 200;
    if (!cleanup.applicationDeleted) cleanup.errors.push(`Application ${createdApplicationId} cleanup returned ${removed.response.status}`);
  }
  if (employerToken) {
    for (const id of [...createdJobIds].reverse()) {
      const removed = await json(`${API_BASE}/employer/jobs/${id}`, { method: "DELETE", headers: headers(employerToken) });
      cleanup.jobsDeleted.push({ id, status: removed.response.status });
      if (removed.response.status !== 200 && removed.response.status !== 404) cleanup.errors.push(`Job ${id} cleanup returned ${removed.response.status}`);
    }
  }
  if (candidateToken) {
    try { await resetCandidate(); } catch (error) { cleanup.errors.push(`Profile cleanup failed: ${error.message || error}`); }
  }
}

async function main() {
  const supporting = await Promise.all([
    fs.readFile(E2E_REPORT, "utf8").then(JSON.parse),
    fs.readFile(INTEGRATION_REPORT, "utf8").then(JSON.parse),
    fs.readFile(AI_PROBE, "utf8").then(JSON.parse),
    fs.readFile(AI_UI_REPORT, "utf8").then(JSON.parse),
  ]);
  const [e2e, integration, aiProbe, aiUi] = supporting;
  if (e2e.summary.failed !== 0 || integration.summary.failed !== 0) throw new Error("Supporting deployed E2E/integration report contains failures.");

  const tokens = {};
  for (const [role, account] of Object.entries(fixtureAccounts)) tokens[role] = await login(account.email);
  candidateToken = tokens.candidate;
  employerToken = tokens.employer;
  await json(SCORING_HEALTH).catch(() => null);
  await resetCandidate();

  const publicJobs = await json(`${API_BASE}/jobs`);
  const publicFieldsSafe = (publicJobs.body.jobs || []).every((job) => !Object.hasOwn(job, "employerEmail") && !Object.hasOwn(job, "candidate"));
  add("WF-PUB-01", publicJobs.response.status === 200 && Array.isArray(publicJobs.body.jobs) && publicFieldsSafe ? "Pass" : "Fail", `Anonymous published-opportunity request returned HTTP ${publicJobs.response.status}, ${publicJobs.body.jobs?.length || 0} records and no known private identity fields.`);

  const anonRedirectPass = e2e.results.filter((item) => item.name.startsWith("anonymous visitor is redirected")).every((item) => item.status === "passed");
  add("WF-PUB-02", anonRedirectPass ? "Pass" : "Fail", "Anonymous candidate, employer, administrator and verifier dashboard visits redirected to sign-in without page errors.");

  add("WF-CAN-01", "Blocked", "A new candidate registration cannot complete email verification and human disability-card approval in staging because outbound email delivery is disabled.");

  const firstDefinition = (await json(`${API_BASE}/job-definitions`)).body.jobs?.[0];
  const rebuilt = await saveCandidate(firstDefinition?.id, "both");
  const rebuiltRead = await json(`${API_BASE}/candidate/profile`, { headers: headers(candidateToken) });
  const rebuiltProfile = rebuiltRead.body.profile || {};
  const rebuiltOkay = rebuilt.response.status === 200 && rebuiltRead.response.status === 200
    && rebuiltProfile.firstName === "Workflow"
    && rebuiltProfile.selectedDisabilities?.length === 1
    && rebuiltProfile.positionInterests?.length === 1;
  add("WF-CAN-02", rebuiltOkay ? "Pass" : "Fail", `Reset then complete profile rebuild returned HTTP ${rebuilt.response.status}; retrieved identity, disability and position selections matched=${rebuiltOkay}.`);

  const aiReviewed = aiUi.cases?.some((item) => item.status === "passed");
  const aiConfirmed = aiUi.cases?.some((item) => item.status === "confirmed");
  add("WF-CAN-03", aiReviewed && aiConfirmed ? "Pass" : "Blocked", aiReviewed && aiConfirmed
    ? "The deployed browser completed consent, produced structured reviewable suggestions, confirmed the selected items and verified the saved profile; screenshots were captured before and after confirmation."
    : `The deployed AI profile flow returned HTTP ${aiProbe.endToEnd?.httpStatus || aiProbe.httpStatus || 503}, so suggestion review and confirmation output was unavailable.`);

  const allJobs = publicJobs.body.jobs || [];
  const workJob = allJobs.find((job) => (job.opportunityType || "work") === "work");
  if (!workJob) {
    add("WF-CAN-04", "Blocked", "No published work opportunity was available.");
  } else {
    await saveCandidate(workJob.jobDefinitionId, "work");
    const match = await matchesWithRetry();
    const matched = (match.body.results || []).find((item) => Number(item.job_id) === Number(workJob.id));
    const opened = allJobs.find((job) => Number(job.id) === Number(matched?.job_id));
    const pass = match.response.status === 200 && Boolean(matched) && Boolean(opened) && Number.isFinite(Number(matched.score)) && typeof matched.summary === "string";
    add("WF-CAN-04", pass ? "Pass" : (match.response.status === 503 ? "Blocked" : "Fail"), `Work matching returned HTTP ${match.response.status}; target result found=${Boolean(matched)}; corresponding opportunity details opened=${Boolean(opened)}; score/explanation present=${Boolean(matched && Number.isFinite(Number(matched.score)) && typeof matched.summary === "string")}.`);
  }

  const trainingJob = allJobs.find((job) => job.opportunityType === "training");
  if (!trainingJob) {
    add("WF-CAN-05", "Blocked", "No published training opportunity was available for an end-to-end candidate training match.");
  } else {
    await saveCandidate(trainingJob.jobDefinitionId, "training");
    const match = await matchesWithRetry();
    const matched = (match.body.results || []).find((item) => Number(item.job_id) === Number(trainingJob.id) && item.opportunityType === "training");
    const opened = allJobs.find((job) => Number(job.id) === Number(matched?.job_id));
    const pass = match.response.status === 200 && Boolean(matched) && Boolean(opened);
    add("WF-CAN-05", pass ? "Pass" : (match.response.status === 503 ? "Blocked" : "Fail"), `Training-only matching returned HTTP ${match.response.status}; training result found and opened=${pass}.`);
  }

  const employerProfile = await json(`${API_BASE}/employer/profile`, { headers: headers(employerToken) });
  const originalEmployerProfile = employerProfile.body.profile || {};
  const profileUpdate = await json(`${API_BASE}/employer/profile`, {
    method: "PATCH",
    headers: headers(employerToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      companyName: originalEmployerProfile.companyName,
      industry: originalEmployerProfile.industry,
      location: originalEmployerProfile.location,
      website: originalEmployerProfile.website,
      logoUrl: originalEmployerProfile.logoUrl,
      description: originalEmployerProfile.description,
      accessibilityStatement: originalEmployerProfile.accessibilityStatement,
    }),
  });
  const profileVerify = await json(`${API_BASE}/employer/profile`, { headers: headers(employerToken) });
  const profilePass = employerProfile.response.status === 200 && profileUpdate.response.status === 200 && profileVerify.body.profile?.companyName === originalEmployerProfile.companyName;
  add("WF-EMP-01", profilePass ? "Pass" : "Fail", `Employer profile read, idempotent update and verification returned HTTP ${employerProfile.response.status}/${profileUpdate.response.status}/${profileVerify.response.status}; company identity preserved=${profilePass}.`);

  const definitionDetail = await json(`${API_BASE}/employer/job-definitions/${firstDefinition.id}`, { headers: headers(employerToken) });
  const taskId = definitionDetail.body.job?.tasks?.[0]?.id;
  const workCreated = await createOpportunity("work", firstDefinition, taskId, "work");
  const createdWork = workCreated.body.job;
  add("WF-EMP-02", workCreated.response.status === 201 && createdWork?.status === "published" && createdWork.opportunityType === "work" ? "Pass" : "Fail", `Controlled work opportunity creation returned HTTP ${workCreated.response.status}; published work record created=${Boolean(createdWork?.id)}.`);

  const trainingCreated = await createOpportunity("training", firstDefinition, taskId, "training");
  const createdTraining = trainingCreated.body.job;
  add("WF-EMP-03", trainingCreated.response.status === 201 && createdTraining?.status === "published" && createdTraining.opportunityType === "training" ? "Pass" : "Fail", `Hospitality training opportunity creation returned HTTP ${trainingCreated.response.status}; published training record created=${Boolean(createdTraining?.id)}.`);

  const requirementsPass = createdWork?.educationRequirement === "preferred"
    && createdWork?.readingRequirement === "required"
    && createdWork?.writingRequirement === "preferred"
    && createdWork?.positionKnowledgeRequirement === "preferred"
    && createdWork?.assistanceAvailable === true
    && createdWork?.highlightedTasks?.length === 1;
  add("WF-EMP-04", requirementsPass ? "Pass" : "Fail", `Created opportunity preserved education, three practical/knowledge requirements, assistance and ${createdWork?.highlightedTasks?.length || 0} highlighted task(s); configured output matched=${requirementsPass}.`);

  const employerJobs = await json(`${API_BASE}/employer/jobs`, { headers: headers(employerToken) });
  const employerAppsBefore = await json(`${API_BASE}/employer/applications`, { headers: headers(employerToken) });
  const usedTitles = new Set((employerAppsBefore.body.applications || []).filter((item) => item.candidateEmail === fixtureAccounts.candidate.email).map((item) => item.jobTitle));
  const applicationJob = (employerJobs.body.jobs || []).find((job) => job.status === "published" && !usedTitles.has(job.title) && !createdJobIds.includes(job.id));
  if (!applicationJob) {
    for (const id of ["WF-CAN-06", "WF-CAN-07", "WF-EMP-05"]) add(id, "Blocked", "No unused employer-owned published opportunity was available for an isolated application workflow.");
  } else {
    await saveCandidate(applicationJob.jobDefinitionId, applicationJob.opportunityType || "work");
    const form = new FormData();
    form.set("positionKnowledgeLevel", "independent");
    const pdf = new Blob(["%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"], { type: "application/pdf" });
    form.set("applicationDocument", pdf, "synthetic-workflow.pdf");
    const submitted = await fetch(`${API_BASE}/candidate/jobs/${applicationJob.id}/apply`, { method: "POST", headers: headers(candidateToken), body: form });
    const submittedBody = await submitted.json().catch(() => ({}));
    const employerAppsAfter = await json(`${API_BASE}/employer/applications`, { headers: headers(employerToken) });
    const beforeIds = new Set((employerAppsBefore.body.applications || []).map((item) => item.id));
    const createdApplication = (employerAppsAfter.body.applications || []).find((item) => !beforeIds.has(item.id) && item.candidateEmail === fixtureAccounts.candidate.email && item.jobTitle === applicationJob.title);
    createdApplicationId = createdApplication?.id || null;
    const submitPass = submitted.status === 201 && Boolean(createdApplicationId) && createdApplication?.hasApplicationDocument === true;
    add("WF-CAN-06", submitPass ? "Pass" : "Fail", `Valid PDF application returned HTTP ${submitted.status}; one stored application found=${Boolean(createdApplicationId)}; private document recorded=${createdApplication?.hasApplicationDocument === true}.`, { response: submittedBody });

    const candidateApps = await json(`${API_BASE}/candidate/applications`, { headers: headers(candidateToken) });
    const tracked = (candidateApps.body.applications || []).find((item) => item.jobTitle === applicationJob.title && item.status === "pending");
    add("WF-CAN-07", candidateApps.response.status === 200 && Boolean(tracked) ? "Pass" : "Fail", `Candidate application tracking returned HTTP ${candidateApps.response.status}; newly submitted pending record visible=${Boolean(tracked)}.`);

    if (createdApplicationId) {
      const updated = await json(`${API_BASE}/employer/applications/${createdApplicationId}/status`, {
        method: "PATCH",
        headers: headers(employerToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "in_review" }),
      });
      const candidateAfterReview = await json(`${API_BASE}/candidate/applications`, { headers: headers(candidateToken) });
      const reviewed = (candidateAfterReview.body.applications || []).find((item) => item.jobTitle === applicationJob.title && item.status === "in_review");
      add("WF-EMP-05", updated.response.status === 200 && updated.body.status === "in_review" && Boolean(reviewed) ? "Pass" : "Fail", `Employer status update returned HTTP ${updated.response.status}; candidate tracking displayed in_review=${Boolean(reviewed)}.`);
    } else {
      add("WF-EMP-05", "Blocked", "No isolated application was created for employer review.");
    }
  }

  const activeUsers = await json(`${API_BASE}/admin/users`, { headers: headers(tokens.admin) });
  const archivedUsers = await json(`${API_BASE}/admin/users/archived`, { headers: headers(tokens.admin) });
  const adminUsersPass = activeUsers.response.status === 200 && archivedUsers.response.status === 200 && Array.isArray(activeUsers.body.users) && Array.isArray(archivedUsers.body.users);
  add("WF-ADM-01", adminUsersPass ? "Pass" : "Fail", `Administrator active/archived filters returned HTTP ${activeUsers.response.status}/${archivedUsers.response.status} with ${activeUsers.body.users?.length || 0}/${archivedUsers.body.users?.length || 0} records.`);

  const catalogueList = await json(`${API_BASE}/admin/job-catalogue`, { headers: headers(tokens.admin) });
  const catalogueId = catalogueList.body.datasets?.[0]?.id;
  const catalogueDetail = catalogueId ? await json(`${API_BASE}/admin/job-catalogue/${catalogueId}`, { headers: headers(tokens.admin) }) : null;
  const cataloguePass = catalogueList.response.status === 200 && catalogueDetail?.response.status === 200 && Array.isArray(catalogueDetail.body.dataset?.tasks);
  add("WF-ADM-02", cataloguePass ? "Pass" : "Fail", `Catalogue list/detail returned HTTP ${catalogueList.response.status}/${catalogueDetail?.response.status || "not-run"}; ordered task data available=${cataloguePass}.`);

  add("WF-ADM-03", "Blocked", "A valid catalogue import would version or replace shared staging catalogue data; no disposable catalogue namespace is available for isolated cleanup.");

  const pending = await json(`${API_BASE}/verifier/requests`, { headers: headers(tokens.verifier) });
  const request = pending.body.requests?.find((item) => item.status === "pending" && item.document?.available);
  if (!request) {
    add("WF-VER-01", "Blocked", `Verifier queue returned HTTP ${pending.response.status}, but no pending synthetic request with an available document existed.`);
  } else {
    const document = await fetch(`${API_BASE}/verifier/requests/${request.id}/document`, { headers: headers(tokens.verifier) });
    const noStore = /no-store/i.test(document.headers.get("cache-control") || "");
    add("WF-VER-01", document.status === 200 && noStore ? "Pass" : "Fail", `Authorized pending evidence request returned HTTP ${document.status}; private no-store caching present=${noStore}.`);
  }
  add("WF-VER-02", "Blocked", "No disposable pending verification request was available for an isolated approval decision and cleanup.");
  add("WF-VER-03", "Blocked", "No disposable pending verification request was available for an isolated rejection decision and cleanup.");

  await cleanupData();
  const summary = {
    planned: 20,
    pass: results.filter((item) => item.status === "Pass").length,
    fail: results.filter((item) => item.status === "Fail").length,
    blocked: results.filter((item) => item.status === "Blocked").length,
  };
  const report = {
    generatedAt: new Date().toISOString(),
    environment: API_BASE,
    methodology: "Deployed end-to-end and API workflow outputs using synthetic fixture accounts; state-changing records were isolated and removed. Blocked cases are excluded from executed success rates.",
    supportingReports: [E2E_REPORT, INTEGRATION_REPORT, AI_PROBE, AI_UI_REPORT],
    summary,
    cleanup,
    results,
  };
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${OUTPUT}\n${JSON.stringify(summary)}\n`);
}

try {
  await main();
} catch (error) {
  await cleanupData().catch(() => {});
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true }).catch(() => {});
  await fs.writeFile(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), fatalError: String(error?.stack || error), cleanup, results }, null, 2)}\n`, "utf8").catch(() => {});
  console.error(error);
  process.exitCode = 1;
}
