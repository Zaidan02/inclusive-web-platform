import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

export const WEB_BASE = process.env.TEST_WEB_BASE || "http://127.0.0.1:5173";
export const API_BASE = process.env.TEST_API_BASE || "http://127.0.0.1:8081/api";
export const FIXTURE_PASSWORD = process.env.TEST_FIXTURE_PASSWORD || "Pass123!@#";
export const BROWSER_PATH = process.env.TEST_BROWSER_PATH
  || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

export const fixtureAccounts = {
  candidate: { email: "candidate@join.local", role: "ROLE_CANDIDATE", home: "/candidate" },
  employer: { email: "employer@join.local", role: "ROLE_EMPLOYER", home: "/employer" },
  admin: { email: "admin@join.local", role: "ROLE_ADMIN", home: "/admin" },
  verifier: { email: "verifier@join.local", role: "ROLE_VERIFIER", home: "/verifier" },
};

export async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

export async function login(email, password = FIXTURE_PASSWORD) {
  const { response, body } = await requestJson(`${API_BASE}/login_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok || !body.token) {
    throw new Error(`Fixture login failed for ${email}: HTTP ${response.status}`);
  }
  return body.token;
}

export function tokenHeaders(token) {
  return { "X-Auth-Token": token };
}

export async function launchBrowser() {
  try {
    await fs.access(BROWSER_PATH);
    return chromium.launch({ executablePath: BROWSER_PATH, headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

export async function writeJsonReport(output, report) {
  const target = path.resolve(output);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return target;
}

export function percentile(values, percentage) {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentage) - 1)];
}
