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

const OUTPUT = process.env.AI_PERFORMANCE_OUTPUT
  || path.resolve("..", "docs", "testing", "staging-2026-09-10", "ai-performance-results.json");
const LOADS = [1, 5, 10];
const ROUNDS = Number(process.env.AI_PERFORMANCE_ROUNDS || 3);
const THRESHOLD_MS = 30000;
const CONSENT_VERSION = "2026-08-03";
const narrative = "I am Maya Haddad from Beirut. I completed high school, can read, write and count independently, and I want both paid cashier work and hospitality training.";

const health = await requestJson(`${API_BASE.replace(/\/api$/, "")}/health`);
if (health.response.status !== 200) throw new Error(`API health precondition failed with HTTP ${health.response.status}`);
const token = await login(fixtureAccounts.candidate.email);
await requestJson(`${API_BASE}/candidate/profile/reset`, { method: "POST", headers: tokenHeaders(token) });

function rounded(value) {
  return Math.round(value * 10) / 10;
}

async function generateSuggestion() {
  const started = performance.now();
  const response = await requestJson(`${API_BASE}/candidate/profile/ai-suggestions`, {
    method: "POST",
    headers: { ...tokenHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ narrative, language: "en", consent: true, consentVersion: CONSENT_VERSION }),
  });
  return {
    status: response.response.status,
    durationMs: performance.now() - started,
    structuredOutput: Boolean(response.body?.suggestions),
    message: response.body?.message || null,
  };
}

const cases = [];
try {
  for (const load of LOADS) {
    const observations = [];
    for (let round = 0; round < ROUNDS; round += 1) {
      observations.push(...await Promise.all(Array.from({ length: load }, () => generateSuggestion())));
    }
    const durations = observations.map((item) => item.durationMs);
    const successful = observations.filter((item) => item.status === 200 && item.structuredOutput).length;
    const serverErrors = observations.filter((item) => item.status >= 500).length;
    const p50Ms = rounded(percentile(durations, 0.5));
    const p95Ms = rounded(percentile(durations, 0.95));
    const status = successful === observations.length && p95Ms < THRESHOLD_MS ? "passed" : "failed";
    const item = {
      operation: "Generate AI suggestions",
      load,
      rounds: ROUNDS,
      requests: observations.length,
      successful,
      failed: observations.length - successful,
      serverErrors,
      p50Ms,
      p95Ms,
      thresholdMs: THRESHOLD_MS,
      status,
      httpStatuses: Object.fromEntries([...new Set(observations.map((entry) => entry.status))].map((code) => [code, observations.filter((entry) => entry.status === code).length])),
    };
    cases.push(item);
    process.stdout.write(`${status.toUpperCase()} AI suggestions L${load}: ${successful}/${observations.length}, p95=${p95Ms}ms\n`);
  }
} finally {
  await requestJson(`${API_BASE}/candidate/profile/reset`, { method: "POST", headers: tokenHeaders(token) });
}

const summary = {
  passed: cases.filter((item) => item.status === "passed").length,
  failed: cases.filter((item) => item.status === "failed").length,
  blocked: 0,
  total: cases.length,
};
const report = await writeJsonReport(OUTPUT, {
  generatedAt: new Date().toISOString(),
  environment: { apiBase: API_BASE, healthStatus: health.response.status },
  method: "Three rounds of deployed structured AI-suggestion requests at concurrency levels 1, 5 and 10. Suggestions are not confirmed or saved; the synthetic profile is reset before and after execution.",
  thresholdMs: THRESHOLD_MS,
  summary,
  cases,
});
process.stdout.write(`AI performance summary: ${JSON.stringify(summary)}\nReport: ${report}\n`);
if (summary.failed) process.exitCode = 1;
