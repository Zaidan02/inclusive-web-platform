import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright-core";

const API_BASE = process.env.SECURITY_API_BASE || "https://join-hospitality-zm-api-staging.onrender.com/api";
const WEB_BASE = process.env.SECURITY_WEB_BASE || "https://join-hospitality-zm-staging.onrender.com";
const VOICE_BASE = process.env.SECURITY_VOICE_BASE || "https://join-hospitality-zm-voice-staging.onrender.com";
const FIXTURE_PASSWORD = process.env.SECURITY_FIXTURE_PASSWORD || "Pass123!@#";
const EDGE_PATH = process.env.SECURITY_BROWSER_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT = process.env.SECURITY_OUTPUT || path.resolve("..", "docs", "testing", "staging-2026-09-10", "security-quality-results.json");
const JWT_PRIVATE_KEY_PATH = process.env.SECURITY_JWT_PRIVATE_KEY || path.resolve("..", "backend", "config", "jwt", "private.pem");
const BACKEND_ENV_PATH = process.env.SECURITY_BACKEND_ENV || path.resolve("..", "backend", ".env");

const results = [];
const cleanup = { profileReset: false, applicationDeleted: false, errors: [] };

function add(testId, status, actual, extra = {}) {
  const item = { testId, status, actual, ...extra };
  results.push(item);
  process.stdout.write(`${testId}: ${status} - ${actual}\n`);
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: response.status, body, headers: Object.fromEntries(response.headers.entries()) };
}

function tokenHeaders(token, extra = {}) {
  return { "X-Auth-Token": token, ...extra };
}

async function login(email) {
  const result = await jsonRequest(`${API_BASE}/login_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: FIXTURE_PASSWORD }),
  });
  if (result.status !== 200 || !result.body?.token) throw new Error(`Fixture login failed for ${email}: ${result.status}`);
  return result.body.token;
}

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function parseEnvValue(text, name) {
  const line = text.split(/\r?\n/).find((entry) => entry.trim().startsWith(`${name}=`));
  if (!line) return "";
  return line.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
}

async function makeExpiredToken(validToken) {
  const [encodedHeader, encodedPayload] = validToken.split(".");
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  payload.iat = now - 3600;
  payload.exp = now - 60;
  const signingInput = `${encodedHeader}.${b64url(JSON.stringify(payload))}`;
  const [pem, envText] = await Promise.all([
    fs.readFile(JWT_PRIVATE_KEY_PATH, "utf8"),
    fs.readFile(BACKEND_ENV_PATH, "utf8"),
  ]);
  const passphrase = parseEnvValue(envText, "JWT_PASSPHRASE");
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), { key: pem, passphrase });
  return `${signingInput}.${signature.toString("base64url")}`;
}

function tamperToken(validToken) {
  const [header, encodedPayload, signature] = validToken.split(".");
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  payload.username = `tampered-${payload.username || "subject"}`;
  return `${header}.${b64url(JSON.stringify(payload))}.${signature}`;
}

async function profile(token) {
  return jsonRequest(`${API_BASE}/candidate/profile`, { headers: tokenHeaders(token) });
}

async function resetProfile(token) {
  return jsonRequest(`${API_BASE}/candidate/profile/reset`, { method: "POST", headers: tokenHeaders(token) });
}

function validProfile(jobDefinitionId = null, about = "Synthetic security test profile.") {
  return {
    selectedDisabilities: [],
    educationLevel: "university",
    readingAbility: "independent",
    writingAbility: "independent",
    numeracyAbility: "independent",
    firstName: "Security",
    lastName: "Candidate",
    phone: "",
    location: "Beirut",
    about,
    opportunityPreference: "both",
    positionInterests: jobDefinitionId ? [{ jobDefinitionId, knowledgeLevel: "independent" }] : [],
  };
}

async function saveProfile(token, body) {
  return jsonRequest(`${API_BASE}/candidate/profile`, {
    method: "PATCH",
    headers: tokenHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
}

async function applyWithFile(candidateToken, jobId, blob = null, filename = "document.pdf") {
  const form = new FormData();
  form.set("positionKnowledgeLevel", "independent");
  if (blob) form.set("applicationDocument", blob, filename);
  return jsonRequest(`${API_BASE}/candidate/jobs/${jobId}/apply`, {
    method: "POST",
    headers: tokenHeaders(candidateToken),
    body: form,
  });
}

async function employerApplications(employerToken) {
  return jsonRequest(`${API_BASE}/employer/applications`, { headers: tokenHeaders(employerToken) });
}

async function deleteNewApplications(employerToken, beforeIds) {
  const current = await employerApplications(employerToken);
  const created = (current.body?.applications || []).filter((application) =>
    !beforeIds.has(application.id) && application.candidateEmail === "candidate@join.local");
  const outcomes = [];
  for (const application of created) {
    const removed = await jsonRequest(`${API_BASE}/employer/applications/${application.id}`, {
      method: "DELETE",
      headers: tokenHeaders(employerToken),
    });
    outcomes.push({ id: application.id, status: removed.status });
  }
  return { created, outcomes, allDeleted: outcomes.every((item) => item.status === 200) };
}

async function main() {
  const [candidateToken, employerToken] = await Promise.all([
    login("candidate@join.local"),
    login("employer@join.local"),
  ]);

  const initialProfile = await profile(candidateToken);
  if (initialProfile.status !== 200) throw new Error(`Candidate profile precondition failed: ${initialProfile.status}`);
  await resetProfile(candidateToken);

  const sec01 = await jsonRequest(`${API_BASE}/candidate/profile`);
  add("SEC-01", sec01.status === 401 ? "Pass" : "Fail", `Protected candidate profile returned HTTP ${sec01.status} without a JWT.`, { httpStatus: sec01.status });

  const sec02 = await jsonRequest(`${API_BASE}/candidate/profile`, { headers: tokenHeaders("not-a-jwt") });
  add("SEC-02", sec02.status === 401 ? "Pass" : "Fail", `Malformed JWT returned HTTP ${sec02.status}.`, { httpStatus: sec02.status });

  try {
    const expiredToken = await makeExpiredToken(candidateToken);
    const sec03 = await jsonRequest(`${API_BASE}/candidate/profile`, { headers: tokenHeaders(expiredToken) });
    add("SEC-03", sec03.status === 401 ? "Pass" : "Fail", `Correctly signed expired JWT returned HTTP ${sec03.status}.`, { httpStatus: sec03.status });
  } catch (error) {
    add("SEC-03", "Blocked", "A correctly signed expired staging token could not be prepared from the local deployment key.", { blocker: String(error?.message || error) });
  }

  const sec04 = await jsonRequest(`${API_BASE}/candidate/profile`, { headers: tokenHeaders(tamperToken(candidateToken)) });
  add("SEC-04", sec04.status === 401 ? "Pass" : "Fail", `JWT with modified payload and original signature returned HTTP ${sec04.status}.`, { httpStatus: sec04.status });

  const sec05 = await jsonRequest(`${API_BASE}/employer/jobs`, { headers: tokenHeaders(candidateToken) });
  add("SEC-05", sec05.status === 403 ? "Pass" : "Fail", `Candidate token on employer endpoint returned HTTP ${sec05.status}.`, { httpStatus: sec05.status });

  const sec06 = await jsonRequest(`${API_BASE}/admin/users`, { headers: tokenHeaders(employerToken) });
  add("SEC-06", sec06.status === 403 ? "Pass" : "Fail", `Employer token on administrator endpoint returned HTTP ${sec06.status}.`, { httpStatus: sec06.status });

  const sec07 = await jsonRequest(`${API_BASE}/candidate/profile/999999`, { headers: tokenHeaders(candidateToken) });
  add("SEC-07", [403, 404].includes(sec07.status) ? "Pass" : "Fail", `No cross-candidate profile-ID route was exposed; attempted object path returned HTTP ${sec07.status}.`, { httpStatus: sec07.status });

  const sec08 = await jsonRequest(`${API_BASE}/admin/applications/999999/download/application`);
  add("SEC-08", [401, 403].includes(sec08.status) ? "Pass" : "Fail", `Anonymous private-document request returned HTTP ${sec08.status} before object access.`, { httpStatus: sec08.status });

  const invalidPayload = { ...validProfile(), educationLevel: "doctoral_injection" };
  const sec09 = await saveProfile(candidateToken, invalidPayload);
  const afterInvalid = await profile(candidateToken);
  const invalidPersisted = afterInvalid.body?.profile?.educationLevel === "doctoral_injection";
  add("SEC-09", sec09.status === 400 && !invalidPersisted ? "Pass" : "Fail", `Unexpected education enum returned HTTP ${sec09.status}; invalid value persisted=${invalidPersisted}.`, { httpStatus: sec09.status });

  const sec10 = await jsonRequest(`${API_BASE}/login_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "' OR 1=1 --@example.test", password: "' OR 1=1 --" }),
  });
  const healthAfterInjection = await jsonRequest(API_BASE.replace(/\/api$/, "/health"));
  add("SEC-10", sec10.status === 401 && healthAfterInjection.status === 200 ? "Pass" : "Fail", `SQL-style login text returned HTTP ${sec10.status}; API health afterward was HTTP ${healthAfterInjection.status}.`, { httpStatus: sec10.status });

  const xssPayload = '<img src=x onerror="window.__joinSecurityXss=true">';
  const xssSave = await saveProfile(candidateToken, validProfile(null, xssPayload));
  let xssExecuted = null;
  let xssPreservedAsValue = false;
  let xssBrowserError = null;
  if (xssSave.status === 200) {
    const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.addInitScript((token) => {
        window.__joinSecurityXss = false;
        sessionStorage.setItem("token", token);
      }, candidateToken);
      const page = await context.newPage();
      await page.goto(`${WEB_BASE}/candidate`, { waitUntil: "networkidle", timeout: 45000 });
      const profileButton = page.getByRole("button", { name: /my profile/i });
      if (await profileButton.count()) {
        await profileButton.first().click();
        await page.waitForTimeout(750);
      }
      xssExecuted = await page.evaluate(() => window.__joinSecurityXss === true);
      xssPreservedAsValue = await page.locator("textarea").evaluateAll((items, expected) => items.some((item) => item.value === expected), xssPayload);
      await context.close();
    } catch (error) {
      xssBrowserError = String(error?.message || error);
    } finally {
      await browser.close();
    }
  }
  const sec11Status = xssBrowserError ? "Blocked" : (xssSave.status === 200 && xssExecuted === false && xssPreservedAsValue ? "Pass" : "Fail");
  add("SEC-11", sec11Status, xssBrowserError
    ? "The stored-output browser check could not complete."
    : `HTML payload saved as editable text=${xssPreservedAsValue}; script executed=${xssExecuted}.`,
  { httpStatus: xssSave.status, blocker: xssBrowserError });

  const employerJobs = await jsonRequest(`${API_BASE}/employer/jobs`, { headers: tokenHeaders(employerToken) });
  const employerAppsBefore = await jsonRequest(`${API_BASE}/employer/applications`, { headers: tokenHeaders(employerToken) });
  const candidateAppTitles = new Set((employerAppsBefore.body?.applications || [])
    .filter((application) => application.candidateEmail === "candidate@join.local")
    .map((application) => application.jobTitle));
  const unusedJobs = (employerJobs.body?.jobs || []).filter((item) => item.status === "published" && !candidateAppTitles.has(item.title));
  let createdApplicationId = null;

  if (unusedJobs.length < 4) {
    for (const id of ["SEC-12", "SEC-13", "SEC-14", "SEC-15"]) add(id, "Blocked", "No unused published opportunity owned by the synthetic employer was available.");
  } else {
    const [oversizeJob, unsupportedJob, disguisedJob, duplicateJob] = unusedJobs;
    const profileForUpload = await saveProfile(candidateToken, validProfile(oversizeJob.jobDefinitionId));
    if (profileForUpload.status !== 200) throw new Error(`Upload/application profile setup failed: ${profileForUpload.status}`);

    let currentApps = await employerApplications(employerToken);
    let beforeIds = new Set((currentApps.body?.applications || []).map((application) => application.id));
    const oversized = new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "application/pdf" });
    const sec12 = await applyWithFile(candidateToken, oversizeJob.id, oversized, "oversized.pdf");
    const sec12Cleanup = await deleteNewApplications(employerToken, beforeIds);
    const sec12Rejected = [400, 413].includes(sec12.status) && sec12Cleanup.created.length === 0;
    add("SEC-12", sec12Rejected ? "Pass" : "Fail", `10 MB + 1 byte upload returned HTTP ${sec12.status}; application created=${sec12Cleanup.created.length > 0}.`, { httpStatus: sec12.status, response: sec12.body, cleanup: sec12Cleanup.outcomes });

    await saveProfile(candidateToken, validProfile(unsupportedJob.jobDefinitionId));
    currentApps = await employerApplications(employerToken);
    beforeIds = new Set((currentApps.body?.applications || []).map((application) => application.id));
    const plain = new Blob(["synthetic unsupported document"], { type: "text/plain" });
    const sec13 = await applyWithFile(candidateToken, unsupportedJob.id, plain, "unsupported.txt");
    const sec13Cleanup = await deleteNewApplications(employerToken, beforeIds);
    const sec13Message = String(sec13.body?.message || "");
    const sec13Rejected = sec13.status === 400 && /validated|allowed|document/i.test(sec13Message) && sec13Cleanup.created.length === 0;
    add("SEC-13", sec13Rejected ? "Pass" : "Fail", `Unsupported text/plain upload returned HTTP ${sec13.status}; application created=${sec13Cleanup.created.length > 0}; message=${sec13Message || "none"}.`, { httpStatus: sec13.status, response: sec13.body, cleanup: sec13Cleanup.outcomes });

    await saveProfile(candidateToken, validProfile(disguisedJob.jobDefinitionId));
    currentApps = await employerApplications(employerToken);
    beforeIds = new Set((currentApps.body?.applications || []).map((application) => application.id));
    const disguised = new Blob(["this is not a PDF"], { type: "application/pdf" });
    const sec14 = await applyWithFile(candidateToken, disguisedJob.id, disguised, "renamed.pdf");
    const sec14Cleanup = await deleteNewApplications(employerToken, beforeIds);
    const sec14Message = String(sec14.body?.message || "");
    const sec14Rejected = sec14.status === 400 && /validated|allowed|document/i.test(sec14Message) && sec14Cleanup.created.length === 0;
    add("SEC-14", sec14Rejected ? "Pass" : "Fail", `Non-PDF content renamed and declared as PDF returned HTTP ${sec14.status}; application created=${sec14Cleanup.created.length > 0}; message=${sec14Message || "none"}.`, { httpStatus: sec14.status, response: sec14.body, cleanup: sec14Cleanup.outcomes });

    await saveProfile(candidateToken, validProfile(duplicateJob.jobDefinitionId));
    const duplicateAppsBefore = await employerApplications(employerToken);
    const duplicateBeforeIds = new Set((duplicateAppsBefore.body?.applications || []).map((application) => application.id));
    const firstApply = await applyWithFile(candidateToken, duplicateJob.id);
    const duplicateApply = await applyWithFile(candidateToken, duplicateJob.id);
    const employerAppsAfter = await jsonRequest(`${API_BASE}/employer/applications`, { headers: tokenHeaders(employerToken) });
    const created = (employerAppsAfter.body?.applications || []).find((application) =>
      !duplicateBeforeIds.has(application.id) && application.candidateEmail === "candidate@join.local" && application.jobTitle === duplicateJob.title);
    createdApplicationId = created?.id || null;
    const sec15Pass = firstApply.status === 201 && duplicateApply.status === 400 && Boolean(createdApplicationId);
    add("SEC-15", sec15Pass ? "Pass" : "Fail", `First submission HTTP ${firstApply.status}; duplicate HTTP ${duplicateApply.status}; one new application located=${Boolean(createdApplicationId)}.`, { firstStatus: firstApply.status, firstResponse: firstApply.body, duplicateStatus: duplicateApply.status, duplicateResponse: duplicateApply.body });
  }

  add("SEC-16", "Blocked", "Password-reset token reuse requires delivery or controlled retrieval of a real staging reset token; staging mail delivery is disabled.");

  const sec17 = await jsonRequest(`${API_BASE}/candidate/profile/ai-suggestions`, {
    method: "POST",
    headers: tokenHeaders(candidateToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({ narrative: "I can read, write and count independently.", language: "en", consent: false }),
  });
  add("SEC-17", sec17.status === 400 ? "Pass" : "Fail", `AI profile request without consent returned HTTP ${sec17.status}.`, { httpStatus: sec17.status });

  const sec18 = await jsonRequest(`${API_BASE}/candidate/profile/ai-confirm`, {
    method: "POST",
    headers: tokenHeaders(candidateToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({ profileFields: {}, practicalAbilities: {}, disabilities: [], positionInterests: [], taskSkills: [{ taskId: 2147483647 }], replaceDisabilities: false, language: "en" }),
  });
  add("SEC-18", sec18.status === 400 ? "Pass" : "Fail", `Invented task identifier confirmation returned HTTP ${sec18.status}.`, { httpStatus: sec18.status });

  const sec19 = await jsonRequest(`${VOICE_BASE}/api/voice/interpret`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: "Delete an administrator account", currentContext: "candidate-dashboard", currentView: "jobs", history: [], pageContext: { role: "candidate" } }),
  });
  if ([502, 503].includes(sec19.status)) {
    add("SEC-19", "Blocked", `Voice interpretation service returned HTTP ${sec19.status}, so wrong-role action authorization could not be evaluated.`, { httpStatus: sec19.status });
  } else {
    const action = sec19.body?.route?.action || sec19.body?.proposal;
    const routeStatus = sec19.body?.route?.status || sec19.body?.route?.decision || null;
    const denied = sec19.status === 400 || routeStatus === "rejected" || routeStatus === "denied" || !action;
    add("SEC-19", denied ? "Pass" : "Fail", `Wrong-role voice action returned HTTP ${sec19.status}; route status=${routeStatus || "none"}; action object present=${Boolean(action)}.`, { httpStatus: sec19.status, response: sec19.body });
  }

  if (createdApplicationId) {
    const deleted = await jsonRequest(`${API_BASE}/employer/applications/${createdApplicationId}`, {
      method: "DELETE",
      headers: tokenHeaders(employerToken),
    });
    cleanup.applicationDeleted = deleted.status === 200;
    if (!cleanup.applicationDeleted) cleanup.errors.push(`Application cleanup returned ${deleted.status}`);
  } else {
    cleanup.applicationDeleted = true;
  }

  const reset = await resetProfile(candidateToken);
  const afterReset = await profile(candidateToken);
  const resetProfileBody = afterReset.body?.profile || {};
  const cleared = reset.status === 200
    && afterReset.status === 200
    && (resetProfileBody.selectedDisabilities || []).length === 0
    && (resetProfileBody.positionInterests || []).length === 0
    && (resetProfileBody.confirmedTaskSkills || []).length === 0
    && !resetProfileBody.firstName
    && !resetProfileBody.lastName
    && !resetProfileBody.location
    && !resetProfileBody.educationLevel;
  cleanup.profileReset = cleared;
  add("SEC-20", cleared ? "Pass" : "Fail", `Reset HTTP ${reset.status}; retrieved profile cleared=${cleared}.`, { resetStatus: reset.status, retrieveStatus: afterReset.status });

  const summary = {
    planned: 20,
    pass: results.filter((item) => item.status === "Pass").length,
    fail: results.filter((item) => item.status === "Fail").length,
    blocked: results.filter((item) => item.status === "Blocked").length,
  };
  const report = {
    generatedAt: new Date().toISOString(),
    environment: { api: API_BASE, web: WEB_BASE, voice: VOICE_BASE },
    methodology: "Negative security and privacy checks against healthy staging services using synthetic fixture accounts. Blocked cases are excluded from the executed-output success rate.",
    summary,
    cleanup,
    results,
  };
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${OUTPUT}\n`);
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

main().catch(async (error) => {
  try { await fs.mkdir(path.dirname(OUTPUT), { recursive: true }); } catch {}
  try {
    await fs.writeFile(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), fatalError: String(error?.stack || error), cleanup, results }, null, 2)}\n`, "utf8");
  } catch {}
  console.error(error);
  process.exitCode = 1;
});
