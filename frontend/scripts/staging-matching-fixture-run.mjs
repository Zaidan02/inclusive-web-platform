import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  API_BASE,
  fixtureAccounts,
  login,
  requestJson,
  tokenHeaders,
} from "./test-helpers.mjs";

const TARGET_DEFINITION_IDS = new Set([1, 2, 3]);
const createdJobIds = [];
const employerToken = await login(fixtureAccounts.employer.email);
const headers = (extra = {}) => ({ ...tokenHeaders(employerToken), ...extra });

async function createFixture(definition) {
  const detail = await requestJson(`${API_BASE}/employer/job-definitions/${definition.id}`, {
    headers: headers(),
  });
  const taskId = detail.body.job?.tasks?.[0]?.id;
  if (detail.response.status !== 200 || !taskId) {
    throw new Error(`No controlled task found for ${definition.name}`);
  }
  const response = await requestJson(`${API_BASE}/employer/jobs`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      opportunityType: "work",
      jobDefinitionId: definition.id,
      location: "Beirut, Lebanon",
      jobType: "Full-time",
      workMode: "On-site",
      description: "Disposable matching-quality fixture with an explicit eligibility gate and offered support.",
      applicationDeadline: "2099-12-31",
      assistanceAvailable: true,
      educationRequirement: "required",
      minimumEducationLevel: "high_school",
      readingRequirement: "required",
      writingRequirement: "not_required",
      numeracyRequirement: "not_required",
      positionKnowledgeRequirement: "not_required",
      highlightedTaskIds: [taskId],
    }),
  });
  if (response.response.status !== 201 || !response.body.job?.id) {
    throw new Error(`Fixture creation failed for ${definition.name}: HTTP ${response.response.status}`);
  }
  createdJobIds.push(response.body.job.id);
  process.stdout.write(`Created disposable job ${response.body.job.id} for ${definition.name}\n`);
}

async function runMatchingMatrix() {
  const script = fileURLToPath(new URL("./staging-matching-quality-test.mjs", import.meta.url));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      stdio: "inherit",
      env: process.env,
    });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Matching matrix exited with ${code}`)));
  });
}

try {
  const definitions = await requestJson(`${API_BASE}/job-definitions`);
  const selected = (definitions.body.jobs || []).filter((item) => TARGET_DEFINITION_IDS.has(Number(item.id)));
  if (selected.length !== TARGET_DEFINITION_IDS.size) {
    throw new Error(`Expected ${TARGET_DEFINITION_IDS.size} target definitions, found ${selected.length}`);
  }
  for (const definition of selected) await createFixture(definition);
  await runMatchingMatrix();
} finally {
  for (const id of createdJobIds.reverse()) {
    const removed = await requestJson(`${API_BASE}/employer/jobs/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    process.stdout.write(`Deleted disposable job ${id}: HTTP ${removed.response.status}\n`);
  }
}
