import assert from "node:assert/strict";
import path from "node:path";
import {
  API_BASE,
  fixtureAccounts,
  login,
  requestJson,
  tokenHeaders,
  writeJsonReport,
} from "./test-helpers.mjs";

const OUTPUT = process.env.INTEGRATION_OUTPUT
  || path.resolve("..", "docs", "testing", "integration-results.json");
const results = [];

async function check(name, operation) {
  const started = performance.now();
  try {
    const detail = await operation();
    results.push({ name, status: "passed", durationMs: Math.round((performance.now() - started) * 10) / 10, detail });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    results.push({ name, status: "failed", durationMs: Math.round((performance.now() - started) * 10) / 10, error: String(error.message || error) });
    process.stderr.write(`FAIL ${name}: ${error.message || error}\n`);
  }
}

await check("anonymous session is rejected", async () => {
  const { response } = await requestJson(`${API_BASE}/session`);
  assert.equal(response.status, 401);
  return { httpStatus: response.status };
});

for (const endpoint of ["jobs", "job-definitions"]) {
  await check(`public ${endpoint} catalogue is available`, async () => {
    const { response, body } = await requestJson(`${API_BASE}/${endpoint}`);
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.jobs));
    return { httpStatus: response.status, recordCount: body.jobs.length };
  });
}

await check("public overview returns aggregates and safe published-job fields", async () => {
  const { response, body } = await requestJson(`${API_BASE}/public-overview`);
  assert.equal(response.status, 200);
  for (const key of ["registeredCandidates", "publishedJobPosts", "activeJobDescriptions"]) {
    assert.ok(Number.isInteger(body.stats?.[key]));
    assert.ok(body.stats[key] >= 0);
  }
  assert.ok(Array.isArray(body.latestJobs));
  assert.ok(body.latestJobs.length <= 6);

  const allowedJobFields = new Set(["id", "title", "companyName", "location", "jobType", "workMode", "createdAt"]);
  for (const job of body.latestJobs) {
    assert.ok(Object.keys(job).every((key) => allowedJobFields.has(key)));
  }

  return {
    httpStatus: response.status,
    stats: body.stats,
    latestJobCount: body.latestJobs.length,
  };
});

const tokens = {};
for (const [name, account] of Object.entries(fixtureAccounts)) {
  await check(`${name} fixture authenticates and opens its session`, async () => {
    const token = await login(account.email);
    tokens[name] = token;
    const { response, body } = await requestJson(`${API_BASE}/session`, { headers: tokenHeaders(token) });
    assert.equal(response.status, 200);
    assert.ok(body.user?.roles?.includes(account.role));
    return { httpStatus: response.status, role: account.role };
  });
}

const authorizedReads = [
  ["candidate", "/candidate/profile"],
  ["candidate", "/candidate/applications"],
  ["employer", "/employer/jobs"],
  ["employer", "/employer/applications"],
  ["admin", "/admin/users"],
  ["verifier", "/verifier/requests?status=all"],
];
for (const [role, endpoint] of authorizedReads) {
  await check(`${role} can read ${endpoint}`, async () => {
    const { response } = await requestJson(`${API_BASE}${endpoint}`, { headers: tokenHeaders(tokens[role]) });
    assert.equal(response.status, 200);
    return { httpStatus: response.status };
  });
}

const forbiddenReads = [
  ["candidate", "/admin/users"],
  ["candidate", "/verifier/requests"],
  ["employer", "/candidate/applications"],
  ["verifier", "/employer/applications"],
];
for (const [role, endpoint] of forbiddenReads) {
  await check(`${role} is blocked from ${endpoint}`, async () => {
    const { response } = await requestJson(`${API_BASE}${endpoint}`, { headers: tokenHeaders(tokens[role]) });
    assert.equal(response.status, 403);
    return { httpStatus: response.status };
  });
}

const failed = results.filter((result) => result.status === "failed");
const reportPath = await writeJsonReport(OUTPUT, {
  generatedAt: new Date().toISOString(),
  apiBase: API_BASE,
  summary: { passed: results.length - failed.length, failed: failed.length, total: results.length },
  results,
});
process.stdout.write(`Integration report: ${reportPath}\n`);
if (failed.length) process.exitCode = 1;
