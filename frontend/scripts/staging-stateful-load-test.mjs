import assert from "node:assert/strict";
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

const OUTPUT = process.env.STATEFUL_LOAD_OUTPUT
  || path.resolve("..", "docs", "testing", "staging-2026-09-10", "stateful-load-results.json");
const ROUNDS = Number(process.env.LOAD_ROUNDS || 3);
const LOADS = [1, 5, 10];
const thresholds = { 1: 1000, 5: 3000, 10: 5000 };

const apiRoot = API_BASE.replace(/\/api$/, "");
const apiHealth = await fetch(`${apiRoot}/health`);
assert.equal(apiHealth.status, 200, "API must be healthy before performance evaluation");
const scoringHealth = await fetch("https://join-hospitality-zm-scoring-staging.onrender.com/health");
assert.equal(scoringHealth.status, 200, "scoring service must be healthy before performance evaluation");

const token = await login(fixtureAccounts.candidate.email);
const definitions = await requestJson(`${API_BASE}/job-definitions`);
assert.equal(definitions.response.status, 200);
const cashier = (definitions.body.jobs || []).find((item) => item.slug === "cashier");
assert.ok(cashier?.id, "Cashier catalogue definition is required");

const profilePayload = {
  selectedDisabilities: ["Hand"],
  educationLevel: "high_school",
  readingAbility: "independent",
  writingAbility: "independent",
  numeracyAbility: "independent",
  firstName: "Performance",
  lastName: "Tester",
  phone: "",
  location: "Staging",
  about: "Synthetic performance profile.",
  opportunityPreference: "both",
  positionInterests: [{ jobDefinitionId: cashier.id, knowledgeLevel: "independent" }],
};

const operations = [
  {
    name: "Save profile",
    request: () => fetch(`${API_BASE}/candidate/profile`, {
      method: "PATCH",
      headers: { ...tokenHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(profilePayload),
      signal: AbortSignal.timeout(60_000),
    }),
  },
  {
    name: "Matching",
    request: () => fetch(`${API_BASE}/candidate/matches`, {
      headers: tokenHeaders(token),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    }),
  },
];

function rounded(value) {
  return Math.round(value * 10) / 10;
}

const cases = [];
try {
  const prepared = await requestJson(`${API_BASE}/candidate/profile`, {
    method: "PATCH",
    headers: { ...tokenHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(profilePayload),
  });
  assert.equal(prepared.response.status, 200, "synthetic profile preparation failed");

  for (const operation of operations) {
    for (const load of LOADS) {
      const samples = [];
      const statuses = [];
      for (let round = 0; round < ROUNDS; round += 1) {
        await Promise.all(Array.from({ length: load }, async () => {
          const started = performance.now();
          try {
            const response = await operation.request();
            await response.arrayBuffer();
            statuses.push(response.status);
          } catch {
            statuses.push(0);
          } finally {
            samples.push(performance.now() - started);
          }
        }));
      }
      const successful = statuses.filter((status) => status >= 200 && status < 300).length;
      const p50Ms = rounded(percentile(samples, 0.5));
      const p95Ms = rounded(percentile(samples, 0.95));
      const status = successful === statuses.length && p95Ms <= thresholds[load] ? "passed" : "failed";
      const result = {
        operation: operation.name,
        load,
        rounds: ROUNDS,
        requests: statuses.length,
        successful,
        failed: statuses.length - successful,
        serverErrors: statuses.filter((code) => code >= 500).length,
        clientTimeouts: statuses.filter((code) => code === 0).length,
        p50Ms,
        p95Ms,
        thresholdMs: thresholds[load],
        status,
        httpStatuses: Object.fromEntries([...new Set(statuses)].map((code) => [code, statuses.filter((item) => item === code).length])),
      };
      cases.push(result);
      process.stdout.write(`${status.toUpperCase()} ${operation.name} L${load}: ${successful}/${statuses.length}, p95=${p95Ms}ms\n`);
    }
  }
} finally {
  const reset = await requestJson(`${API_BASE}/candidate/profile/reset`, {
    method: "POST",
    headers: tokenHeaders(token),
  });
  assert.equal(reset.response.status, 200, "synthetic performance profile cleanup failed");
}

const summary = {
  passed: cases.filter((item) => item.status === "passed").length,
  failed: cases.filter((item) => item.status === "failed").length,
  total: cases.length,
};
summary.successRate = Math.round((summary.passed / summary.total) * 10000) / 100;
const report = await writeJsonReport(OUTPUT, {
  generatedAt: new Date().toISOString(),
  environment: { apiBase: API_BASE, rounds: ROUNDS, apiHealth: apiHealth.status, scoringHealth: scoringHealth.status },
  method: "Idempotent synthetic profile writes and matching reads at loads 1, 5 and 10; temporary profile reset after execution.",
  thresholds,
  summary,
  cases,
});
process.stdout.write(`Stateful load summary: ${JSON.stringify(summary)}\n`);
process.stdout.write(`Report: ${report}\n`);
if (summary.failed) process.exitCode = 1;
