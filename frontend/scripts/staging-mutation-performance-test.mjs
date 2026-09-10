import path from "node:path";
import {
  API_BASE,
  fixtureAccounts,
  login,
  percentile,
  requestJson,
  tokenHeaders,
  writeJsonReport,
} from "./test-helpers.mjs";

const OUTPUT = process.env.MUTATION_PERFORMANCE_OUTPUT
  || path.resolve("..", "docs", "testing", "staging-2026-09-10", "mutation-performance-results.json");
const LOADS = [1, 5, 10];
const ROUNDS = Number(process.env.MUTATION_PERFORMANCE_ROUNDS || 3);
const THRESHOLD_MS = 1000;
const createdJobs = new Set();
const createdApplications = new Set();

const [candidateToken, employerToken] = await Promise.all([
  login(fixtureAccounts.candidate.email),
  login(fixtureAccounts.employer.email),
]);
const candidateHeaders = (extra = {}) => ({ ...tokenHeaders(candidateToken), ...extra });
const employerHeaders = (extra = {}) => ({ ...tokenHeaders(employerToken), ...extra });
const health = await requestJson(`${API_BASE.replace(/\/api$/, "")}/health`);
if (health.response.status !== 200) throw new Error(`API health precondition failed with HTTP ${health.response.status}`);
const definitions = await requestJson(`${API_BASE}/job-definitions`);
const definition = definitions.body.jobs?.[0];
const detail = await requestJson(`${API_BASE}/employer/job-definitions/${definition?.id}`, { headers: employerHeaders() });
const taskId = detail.body.job?.tasks?.[0]?.id;
if (!definition || !taskId) throw new Error("Controlled job definition and task are required");

function rounded(value) { return Math.round(value * 10) / 10; }

function jobPayload(suffix) {
  return {
    opportunityType: "work",
    jobDefinitionId: definition.id,
    location: "Beirut, Lebanon",
    jobType: "Full-time",
    workMode: "On-site",
    description: `Disposable performance fixture ${suffix}.`,
    applicationDeadline: "2099-12-31",
    assistanceAvailable: true,
    educationRequirement: "preferred",
    minimumEducationLevel: "high_school",
    readingRequirement: "preferred",
    writingRequirement: "not_required",
    numeracyRequirement: "not_required",
    positionKnowledgeRequirement: "preferred",
    highlightedTaskIds: [taskId],
  };
}

async function publishOne(suffix) {
  const started = performance.now();
  const response = await requestJson(`${API_BASE}/employer/jobs`, {
    method: "POST",
    headers: employerHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(jobPayload(suffix)),
  });
  if (response.body.job?.id) createdJobs.add(response.body.job.id);
  return { status: response.response.status, durationMs: performance.now() - started, valid: Boolean(response.body.job?.id) };
}

async function createApplicationFixture(suffix) {
  const response = await requestJson(`${API_BASE}/employer/jobs`, {
    method: "POST",
    headers: employerHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(jobPayload(`application-${suffix}`)),
  });
  if (response.response.status !== 201 || !response.body.job?.id) throw new Error(`Application fixture creation failed: HTTP ${response.response.status}`);
  createdJobs.add(response.body.job.id);
  return response.body.job.id;
}

async function applyOne(jobId) {
  const form = new FormData();
  form.set("positionKnowledgeLevel", "independent");
  const started = performance.now();
  const response = await fetch(`${API_BASE}/candidate/jobs/${jobId}/apply`, { method: "POST", headers: candidateHeaders(), body: form });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, durationMs: performance.now() - started, valid: body.message === "Application submitted successfully." };
}

async function removeTrackedState() {
  const applications = await requestJson(`${API_BASE}/employer/applications`, { headers: employerHeaders() });
  for (const item of applications.body.applications || []) {
    if (!createdApplications.has(item.id)) continue;
    const removed = await requestJson(`${API_BASE}/employer/applications/${item.id}`, { method: "DELETE", headers: employerHeaders() });
    if (![200, 404].includes(removed.response.status)) throw new Error(`Application ${item.id} cleanup HTTP ${removed.response.status}`);
    createdApplications.delete(item.id);
  }
  for (const id of [...createdJobs]) {
    const removed = await requestJson(`${API_BASE}/employer/jobs/${id}`, { method: "DELETE", headers: employerHeaders() });
    if (![200, 404].includes(removed.response.status)) throw new Error(`Job ${id} cleanup HTTP ${removed.response.status}`);
    createdJobs.delete(id);
  }
}

function summarize(operation, load, observations) {
  const durations = observations.map((item) => item.durationMs);
  const expectedStatus = operation === "Publish opportunity" ? 201 : 201;
  const successful = observations.filter((item) => item.status === expectedStatus && item.valid).length;
  const p50Ms = rounded(percentile(durations, 0.5));
  const p95Ms = rounded(percentile(durations, 0.95));
  return {
    operation, load, rounds: ROUNDS, requests: observations.length, successful,
    failed: observations.length - successful,
    serverErrors: observations.filter((item) => item.status >= 500).length,
    p50Ms, p95Ms, thresholdMs: THRESHOLD_MS,
    status: successful === observations.length && p95Ms < THRESHOLD_MS ? "passed" : "failed",
    httpStatuses: Object.fromEntries([...new Set(observations.map((item) => item.status))].map((code) => [code, observations.filter((item) => item.status === code).length])),
  };
}

const cases = [];
try {
  for (const load of LOADS) {
    const observations = [];
    for (let round = 0; round < ROUNDS; round += 1) {
      observations.push(...await Promise.all(Array.from({ length: load }, (_, index) => publishOne(`${load}-${round}-${index}-${Date.now()}`))));
    }
    const item = summarize("Publish opportunity", load, observations);
    cases.push(item);
    process.stdout.write(`${item.status.toUpperCase()} publish L${load}: ${item.successful}/${item.requests}, p95=${item.p95Ms}ms\n`);
    await removeTrackedState();
  }

  await requestJson(`${API_BASE}/candidate/profile`, {
    method: "PATCH",
    headers: candidateHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      selectedDisabilities: ["Hand"], educationLevel: "high_school", readingAbility: "independent",
      writingAbility: "independent", numeracyAbility: "independent", firstName: "Load", lastName: "Candidate",
      phone: "", location: "Beirut", about: "Disposable performance profile.", opportunityPreference: "work",
      positionInterests: [{ jobDefinitionId: definition.id, knowledgeLevel: "independent" }],
    }),
  });
  for (const load of LOADS) {
    const observations = [];
    for (let round = 0; round < ROUNDS; round += 1) {
      const before = await requestJson(`${API_BASE}/employer/applications`, { headers: employerHeaders() });
      const beforeIds = new Set((before.body.applications || []).map((item) => item.id));
      const jobs = [];
      for (let index = 0; index < load; index += 1) jobs.push(await createApplicationFixture(`${load}-${round}-${index}-${Date.now()}`));
      observations.push(...await Promise.all(jobs.map((id) => applyOne(id))));
      const after = await requestJson(`${API_BASE}/employer/applications`, { headers: employerHeaders() });
      for (const item of after.body.applications || []) {
        if (!beforeIds.has(item.id) && item.candidateEmail === fixtureAccounts.candidate.email) createdApplications.add(item.id);
      }
      await removeTrackedState();
    }
    const item = summarize("Submit application", load, observations);
    cases.push(item);
    process.stdout.write(`${item.status.toUpperCase()} application L${load}: ${item.successful}/${item.requests}, p95=${item.p95Ms}ms\n`);
  }
} finally {
  await removeTrackedState();
  await requestJson(`${API_BASE}/candidate/profile/reset`, { method: "POST", headers: candidateHeaders() });
}

const summary = { passed: cases.filter((item) => item.status === "passed").length, failed: cases.filter((item) => item.status === "failed").length, total: cases.length };
const report = await writeJsonReport(OUTPUT, {
  generatedAt: new Date().toISOString(), environment: { apiBase: API_BASE, healthStatus: health.response.status },
  method: "Three rounds at concurrency 1, 5 and 10 with a unique disposable record per request. Setup is excluded from timings; all jobs/applications and the synthetic profile are removed after every batch.",
  thresholdMs: THRESHOLD_MS, summary, cleanup: { jobsRemaining: createdJobs.size, applicationsRemaining: createdApplications.size, profileReset: true }, cases,
});
process.stdout.write(`Mutation performance summary: ${JSON.stringify(summary)}\nReport: ${report}\n`);
if (summary.failed) process.exitCode = 1;
