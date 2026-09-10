import path from "node:path";
import {
  API_BASE,
  FIXTURE_PASSWORD,
  fixtureAccounts,
  login,
  percentile,
  tokenHeaders,
  writeJsonReport,
} from "./test-helpers.mjs";

const OUTPUT = process.env.LOAD_OUTPUT
  || path.resolve("..", "docs", "testing", "staging-2026-09-10", "safe-load-results.json");
const ROUNDS = Number(process.env.LOAD_ROUNDS || 3);
const LOADS = [1, 5, 10];
const thresholds = { 1: 1500, 5: 3000, 10: 5000 };

const health = await fetch(`${API_BASE.replace(/\/api$/, "")}/health`);
if (!health.ok) throw new Error(`API health precondition failed with HTTP ${health.status}`);
const token = await login(fixtureAccounts.candidate.email);

const operations = [
  {
    name: "Sign in",
    request: () => fetch(`${API_BASE}/login_check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fixtureAccounts.candidate.email, password: FIXTURE_PASSWORD }),
    }),
  },
  {
    name: "Load profile",
    request: () => fetch(`${API_BASE}/candidate/profile`, { headers: tokenHeaders(token), cache: "no-store" }),
  },
  {
    name: "Load opportunities",
    request: () => fetch(`${API_BASE}/jobs`, { cache: "no-store" }),
  },
];

function rounded(value) {
  return Math.round(value * 10) / 10;
}

const cases = [];
for (const operation of operations) {
  for (const load of LOADS) {
    const samples = [];
    const statuses = [];
    for (let round = 0; round < ROUNDS; round += 1) {
      const batch = Array.from({ length: load }, async () => {
        const started = performance.now();
        const response = await operation.request();
        await response.arrayBuffer();
        samples.push(performance.now() - started);
        statuses.push(response.status);
      });
      await Promise.all(batch);
    }
    const successful = statuses.filter((status) => status >= 200 && status < 300).length;
    const serverErrors = statuses.filter((status) => status >= 500).length;
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
      serverErrors,
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

const summary = {
  passed: cases.filter((item) => item.status === "passed").length,
  failed: cases.filter((item) => item.status === "failed").length,
  total: cases.length,
};
summary.successRate = Math.round((summary.passed / summary.total) * 10000) / 100;

const report = await writeJsonReport(OUTPUT, {
  generatedAt: new Date().toISOString(),
  environment: { apiBase: API_BASE, rounds: ROUNDS, healthStatus: health.status },
  method: "Safe non-destructive concurrent requests at loads 1, 5 and 10.",
  thresholds,
  summary,
  cases,
});
process.stdout.write(`Safe load summary: ${JSON.stringify(summary)}\n`);
process.stdout.write(`Report: ${report}\n`);
if (summary.failed) process.exitCode = 1;
