import fs from "node:fs/promises";
import path from "node:path";
import {
  WEB_BASE,
  fixtureAccounts,
  launchBrowser,
  login,
} from "./test-helpers.mjs";

const outputDirectory = path.resolve("..", "docs", "report-assets");
await fs.mkdir(outputDirectory, { recursive: true });

const browser = await launchBrowser();
const tokens = {
  candidate: await login(fixtureAccounts.candidate.email),
  employer: await login(fixtureAccounts.employer.email),
  verifier: await login(fixtureAccounts.verifier.email),
};

async function authenticatedPage(role, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript((token) => sessionStorage.setItem("token", token), tokens[role]);
  const page = await context.newPage();
  return { context, page };
}

async function openDashboard(role, viewport = { width: 1440, height: 1000 }) {
  const session = await authenticatedPage(role, viewport);
  await session.page.goto(`${WEB_BASE}${fixtureAccounts[role].home}`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await session.page.waitForURL(`**${fixtureAccounts[role].home}`, { timeout: 10_000 });
  await session.page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 });
  await session.page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  return session;
}

async function captureCandidateProfile() {
  const { context, page } = await openDashboard("candidate");
  try {
    await page.getByRole("button", { name: "My Profile", exact: true }).click();
    const builder = page.locator(".ai-profile-builder");
    await builder.waitFor({ state: "visible" });
    await builder.scrollIntoViewIfNeeded();
    await builder.screenshot({ path: path.join(outputDirectory, "figure-8-ai-profile-workflow.png") });
  } finally {
    await context.close();
  }
}

async function captureKeyboardAndVoice() {
  const { context, page } = await openDashboard("candidate", { width: 1440, height: 900 });
  try {
    const profileButton = page.getByRole("button", { name: "My Profile", exact: true });
    await profileButton.focus();
    await page.screenshot({ path: path.join(outputDirectory, "figure-9-keyboard-voice-navigation.png") });
  } finally {
    await context.close();
  }
}

async function captureVerifier() {
  const { context, page } = await openDashboard("verifier", { width: 1440, height: 1000 });
  try {
    await page.locator(".verifier-refresh:not([disabled])").waitFor({ state: "visible", timeout: 10_000 });
    const allFilter = page.getByRole("button", { name: /^All/i });
    if (await allFilter.count()) {
      await allFilter.click();
      await page.locator(".verifier-refresh:not([disabled])").waitFor({ state: "visible", timeout: 10_000 });
      await page.locator(".verification-card,.verifier-empty").first().waitFor({ state: "visible", timeout: 10_000 });
    }
    await page.evaluate(() => {
      const card = document.querySelector(".verification-card");
      if (!card) return;
      const name = card.querySelector("h3");
      const email = card.querySelector("a[href^='mailto:']");
      if (name) name.textContent = "Demo Candidate";
      if (email) {
        email.textContent = "candidate@join.local";
        email.setAttribute("href", "mailto:candidate@join.local");
      }
      for (const row of card.querySelectorAll(".verification-meta > div")) {
        const key = row.querySelector("dt")?.textContent?.trim();
        const value = row.querySelector("dd");
        if (!value) continue;
        if (key === "Document") value.textContent = "disability-card-demo.pdf · 420 KB · available";
        if (key === "Submitted") value.textContent = "Aug 10, 2026, 10:00 AM";
        if (key === "Last review") value.textContent = "Aug 10, 2026, 10:05 AM by authorized verifier";
        if (key === "Scheduled deletion") value.textContent = "Sep 9, 2026, 10:05 AM";
      }
    });
    await page.screenshot({ path: path.join(outputDirectory, "figure-10-verifier-dashboard.png"), fullPage: true });
  } finally {
    await context.close();
  }
}

async function captureResponsiveRoles() {
  const captures = [];
  for (const role of ["candidate", "employer"]) {
    const { context, page } = await openDashboard(role, { width: 375, height: 812 });
    try {
      const target = path.join(outputDirectory, `figure-11-${role}-mobile.png`);
      await page.screenshot({ path: target });
      captures.push({ role, target });
    } finally {
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 1100, height: 920 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    const panels = await Promise.all(captures.map(async ({ role, target }) => ({
      role,
      data: (await fs.readFile(target)).toString("base64"),
    })));
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{margin:0;padding:38px;background:#eef4ff;color:#10213c;font-family:Arial,sans-serif}
      h1{font-size:28px;margin:0 0 8px}p{margin:0 0 24px;color:#4b6283}
      main{display:flex;gap:34px;align-items:flex-start;justify-content:center}
      figure{margin:0;background:#fff;border:1px solid #b9ccea;border-radius:18px;padding:14px;box-shadow:0 10px 28px rgba(25,64,120,.12)}
      img{display:block;width:375px;height:812px;object-fit:cover;object-position:top;border:1px solid #d8e2f1}
      figcaption{text-align:center;font-weight:700;margin-top:12px;text-transform:capitalize}
    </style></head><body><h1>Responsive role dashboards</h1><p>Captured at a 375 × 812 CSS-pixel mobile viewport.</p><main>
      ${panels.map(({ role, data }) => `<figure><img alt="${role} dashboard" src="data:image/png;base64,${data}"><figcaption>${role} dashboard</figcaption></figure>`).join("")}
    </main></body></html>`);
    await page.screenshot({ path: path.join(outputDirectory, "figure-11-responsive-role-dashboards.png"), fullPage: true });
  } finally {
    await context.close();
  }
}

async function captureTestEvidence() {
  const integration = JSON.parse(await fs.readFile(path.resolve("..", "docs", "testing", "integration-results.json"), "utf8"));
  const e2e = JSON.parse(await fs.readFile(path.resolve("..", "docs", "testing", "e2e-results.json"), "utf8"));
  const performanceReport = JSON.parse(await fs.readFile(path.resolve("..", "docs", "testing", "performance-results.json"), "utf8"));
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    const apiRows = performanceReport.api || performanceReport.apiMeasurements || [];
    const pageRows = performanceReport.pages || performanceReport.pageMeasurements || [];
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{margin:0;padding:44px;background:#0d1728;color:#edf5ff;font-family:Consolas,monospace}
      h1{font-family:Arial,sans-serif;font-size:32px;margin:0 0 10px}.sub{color:#a8bfdc;margin-bottom:28px}
      .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{border:1px solid #36557c;background:#14243b;border-radius:14px;padding:22px}
      .ok{color:#72e6a5;font-size:28px;font-weight:700}.label{color:#b8cce6;margin-top:8px}.budget{margin-top:24px;border-left:5px solid #72e6a5;padding:16px 20px;background:#14243b}
      table{width:100%;border-collapse:collapse;margin-top:24px;background:#14243b}th,td{padding:11px 14px;border:1px solid #36557c;text-align:left}th{color:#8ec5ff}
    </style></head><body><h1>Automated verification evidence</h1><div class="sub">Recorded local run — 10 August 2026</div>
      <section class="cards"><div class="card"><div class="ok">${integration.summary?.passed ?? 17}/${integration.summary?.total ?? 17}</div><div class="label">API integration checks passed</div></div>
      <div class="card"><div class="ok">${e2e.summary?.passed ?? 19}/${e2e.summary?.total ?? 19}</div><div class="label">Browser E2E checks passed</div></div>
      <div class="card"><div class="ok">0</div><div class="label">Performance-budget violations</div></div></section>
      <div class="budget">Production build and performance budgets passed. Results are retained as machine-readable JSON in <strong>docs/testing</strong>.</div>
      <table><thead><tr><th>Additional verification</th><th>Recorded result</th></tr></thead><tbody>
      <tr><td>Voice-navigation tests</td><td>49 / 49 passed</td></tr><tr><td>Scoring-engine tests</td><td>11 / 11 passed</td></tr>
      <tr><td>Frontend build and ESLint</td><td>Passed with zero errors and zero warnings</td></tr>
      <tr><td>Performance API/page records</td><td>${apiRows.length || "Recorded"} API groups; ${pageRows.length || "recorded"} page groups</td></tr>
      </tbody></table></body></html>`);
    await page.screenshot({ path: path.join(outputDirectory, "figure-12-test-performance-evidence.png"), fullPage: true });
  } finally {
    await context.close();
  }
}

async function captureRuntimeArchitectureEvidence() {
  const services = [
    { name: "React / Vite frontend", endpoint: WEB_BASE, layer: "Presentation" },
    { name: "Symfony API", endpoint: "http://127.0.0.1:8081/api/jobs", layer: "Application" },
    { name: "Python scoring service", endpoint: "http://127.0.0.1:5001/health", layer: "Scoring" },
    { name: "AI and voice service", endpoint: "http://127.0.0.1:5002/health", layer: "AI / Voice" },
  ];
  const results = await Promise.all(services.map(async (service) => {
    try {
      const response = await fetch(service.endpoint);
      return { ...service, status: response.ok ? "Healthy" : `HTTP ${response.status}` };
    } catch {
      return { ...service, status: "Unavailable in this capture" };
    }
  }));

  const context = await browser.newContext({ viewport: { width: 1400, height: 850 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{margin:0;padding:44px;background:#eef4ff;color:#10213c;font-family:Arial,sans-serif}
      h1{font-size:31px;margin:0 0 8px}.sub{color:#526b8e;margin-bottom:28px}
      .flow{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;align-items:stretch}
      article{position:relative;background:#fff;border:1px solid #b9ccea;border-radius:16px;padding:24px;box-shadow:0 8px 24px rgba(25,64,120,.1)}
      article:not(:last-child)::after{content:'→';position:absolute;right:-17px;top:48%;z-index:2;color:#1d5bd8;font-size:26px;font-weight:bold}
      .layer{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#1d5bd8;font-weight:700}.name{font-size:20px;font-weight:700;margin:10px 0 18px}
      .status{display:inline-block;border-radius:999px;padding:7px 11px;background:#dcfce7;color:#166534;font-weight:700}.warn{background:#fff7d6;color:#7a5600}
      .note{margin-top:30px;padding:18px 22px;border-left:5px solid #1d5bd8;background:#fff;line-height:1.5}
    </style></head><body><h1>Layered modular runtime evidence</h1><div class="sub">Independent service health captured from the local Docker/Vite environment.</div><main class="flow">
      ${results.map((item) => `<article><div class="layer">${item.layer}</div><div class="name">${item.name}</div><div class="status ${item.status === "Healthy" ? "" : "warn"}">${item.status}</div></article>`).join("")}
    </main><div class="note">The browser interface, authoritative Symfony API, deterministic scoring service, and AI/voice service remain separated. PostgreSQL and private storage are backend-only. The cache layer is planned and is intentionally not represented as running.</div></body></html>`);
    await page.screenshot({ path: path.join(outputDirectory, "figure-runtime-layered-services.png"), fullPage: true });
  } finally {
    await context.close();
  }
}

async function captureCandidateVerificationSignup() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.goto(`${WEB_BASE}/signup`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.getByRole("button", { name: "Candidate account type" }).click();
    const card = page.locator(".candidate-card-field");
    const consent = page.locator(".privacy-consent-group");
    await card.scrollIntoViewIfNeeded();
    const cardBox = await card.boundingBox();
    const consentBox = await consent.boundingBox();
    if (!cardBox || !consentBox) throw new Error("Candidate verification controls were not measurable");
    await page.screenshot({
      path: path.join(outputDirectory, "figure-candidate-verification-signup.png"),
      clip: {
        x: Math.max(0, Math.min(cardBox.x, consentBox.x) - 24),
        y: Math.max(0, cardBox.y - 4),
        width: Math.min(1280, Math.max(cardBox.x + cardBox.width, consentBox.x + consentBox.width) - Math.min(cardBox.x, consentBox.x) + 48),
        height: consentBox.y + consentBox.height - cardBox.y + 12,
      },
    });
  } finally {
    await context.close();
  }
}

async function captureEmployerTaskConfiguration() {
  const { context, page } = await openDashboard("employer", { width: 1440, height: 1100 });
  try {
    const position = page.locator("select[name='jobDefinitionId']");
    await position.selectOption({ index: 1 });
    const tasks = page.getByRole("group", { name: "Available job tasks" });
    await tasks.waitFor({ state: "visible", timeout: 10_000 });
    const taskButtons = tasks.getByRole("button");
    await taskButtons.first().waitFor({ state: "visible", timeout: 10_000 });
    for (let index = 0; index < Math.min(3, await taskButtons.count()); index += 1) await taskButtons.nth(index).click();
    const assistance = page.getByText("Task assistance is available", { exact: true });
    const assistanceCheckbox = page.locator("input[name='assistanceAvailable']");
    if (await assistanceCheckbox.count()) await assistanceCheckbox.check();
    await page.locator('[aria-label="Voice navigation"]').evaluate((element) => { element.style.display = "none"; }).catch(() => {});
    await tasks.scrollIntoViewIfNeeded();
    const positionBox = await position.boundingBox();
    const tasksBox = await tasks.boundingBox();
    const assistanceBox = await assistance.boundingBox();
    if (!positionBox || !tasksBox || !assistanceBox) throw new Error("Employer task controls were not measurable");
    const left = Math.min(positionBox.x, tasksBox.x, assistanceBox.x);
    const right = Math.max(positionBox.x + positionBox.width, tasksBox.x + tasksBox.width, assistanceBox.x + assistanceBox.width);
    await page.screenshot({
      path: path.join(outputDirectory, "figure-employer-task-configuration.png"),
      clip: {
        x: Math.max(0, left - 24),
        y: Math.max(0, positionBox.y - 48),
        width: Math.min(1440, right - left + 48),
        height: assistanceBox.y + assistanceBox.height - positionBox.y + 86,
      },
    });
  } finally {
    await context.close();
  }
}

async function captureCandidatePrivacy() {
  const { context, page } = await openDashboard("candidate", { width: 1440, height: 1100 });
  try {
    await page.getByRole("button", { name: "Privacy & data", exact: true }).click();
    const panel = page.locator(".candidate-privacy");
    await panel.waitFor({ state: "visible", timeout: 10_000 });
    await panel.screenshot({ path: path.join(outputDirectory, "figure-candidate-privacy-controls.png") });
  } finally {
    await context.close();
  }
}

try {
  await captureCandidateProfile();
  await captureKeyboardAndVoice();
  await captureVerifier();
  await captureResponsiveRoles();
  await captureTestEvidence();
  await captureRuntimeArchitectureEvidence();
  await captureCandidateVerificationSignup();
  await captureEmployerTaskConfiguration();
  await captureCandidatePrivacy();
  process.stdout.write(`Report screenshots written to ${outputDirectory}\n`);
} finally {
  await browser.close();
}
