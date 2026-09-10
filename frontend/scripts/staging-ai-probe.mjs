import fs from "node:fs/promises";
import path from "node:path";
import { API_BASE, fixtureAccounts, login, requestJson, tokenHeaders } from "./test-helpers.mjs";

const OUTPUT = process.env.AI_PROBE_OUTPUT || path.resolve("..", "docs", "testing", "staging-2026-09-10", "profile-ai", "ai-service-probe-latest.json");
const token = await login(fixtureAccounts.candidate.email);
const healthUrl = API_BASE.replace(/\/api$/, "/health");
const health = await requestJson(healthUrl);
const started = performance.now();
const response = await requestJson(`${API_BASE}/candidate/profile/ai-suggestions`, {
  method: "POST",
  headers: { ...tokenHeaders(token), "Content-Type": "application/json" },
  body: JSON.stringify({
    narrative: "My name is Maya Haddad. I live in Beirut. I completed high school and can read, write and count independently. I am interested in cashier work and training.",
    language: "en",
    consent: true,
    consentVersion: "2026-08-03",
  }),
});
const report = {
  generatedAt: new Date().toISOString(),
  apiBase: API_BASE,
  healthStatus: health.response.status,
  httpStatus: response.response.status,
  durationMs: Math.round((performance.now() - started) * 10) / 10,
  body: response.body,
};
await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ healthStatus: report.healthStatus, httpStatus: report.httpStatus, durationMs: report.durationMs, message: report.body?.message || null })}\n`);
process.stdout.write(`Wrote ${OUTPUT}\n`);
