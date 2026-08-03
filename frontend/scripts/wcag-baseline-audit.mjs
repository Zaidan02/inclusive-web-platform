import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";

const WEB_BASE = process.env.WCAG_WEB_BASE || "http://127.0.0.1:5173";
const API_BASE = process.env.WCAG_API_BASE || "http://127.0.0.1:8081/api";
const EDGE_PATH = process.env.WCAG_BROWSER_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const FIXTURE_PASSWORD = process.env.WCAG_FIXTURE_PASSWORD || "Pass123!@#";
const OUTPUT = process.env.WCAG_OUTPUT || path.resolve("..", "docs", "wcag-audit", "baseline-results.json");
const ROUTE_FILTER = (process.env.WCAG_ROUTE_FILTER || "").split(",").filter(Boolean);
const SCENARIO_FILTER = (process.env.WCAG_SCENARIO_FILTER || "").split(",").filter(Boolean);
const SCREENSHOT_DIR = process.env.WCAG_SCREENSHOT_DIR || "";
const INCLUDE_DASHBOARD_STATES = process.env.WCAG_INCLUDE_DASHBOARD_STATES === "true";

const routes = [
  { path: "/", name: "Welcome", area: "public" },
  { path: "/signin", name: "Sign in", area: "authentication" },
  { path: "/signup", name: "Sign up", area: "authentication" },
  { path: "/forgot-password", name: "Forgot password", area: "authentication" },
  { path: "/reset-password", name: "Reset password", area: "authentication" },
  { path: "/employers", name: "Employers", area: "public" },
  { path: "/voice-help", name: "Voice help", area: "public" },
  { path: "/privacy", name: "Privacy notice", area: "public" },
  { path: "/candidate", name: "Candidate dashboard", area: "candidate", role: "candidate" },
  { path: "/candidate/setup", name: "Candidate setup", area: "candidate", role: "candidate" },
  { path: "/employer", name: "Employer dashboard", area: "employer", role: "employer" },
  { path: "/admin", name: "Administrator dashboard", area: "administrator", role: "admin" },
  { path: "/verifier", name: "Verifier dashboard", area: "verifier", role: "verifier" },
];

const dashboardStateRoutes = [
  { path: "/candidate", name: "Candidate applications", area: "candidate", role: "candidate", activateLabel: "My Applications" },
  { path: "/candidate", name: "Candidate profile", area: "candidate", role: "candidate", activateLabel: "My Profile" },
  { path: "/candidate", name: "Candidate privacy", area: "candidate", role: "candidate", activateLabel: "Privacy & data" },
  { path: "/employer", name: "Employer jobs", area: "employer", role: "employer", activateLabel: "My Jobs" },
  { path: "/employer", name: "Employer applications", area: "employer", role: "employer", activateLabel: "Applications" },
  { path: "/employer", name: "Employer company profile", area: "employer", role: "employer", activateLabel: "Company Profile" },
  { path: "/admin", name: "Archived users", area: "administrator", role: "admin", activateLabel: "Archived Users" },
  { path: "/admin", name: "Admin applications", area: "administrator", role: "admin", activateLabel: "Applications" },
  { path: "/admin", name: "Candidate profiles", area: "administrator", role: "admin", activateLabel: "User Profiles" },
  { path: "/verifier", name: "Approved verifications", area: "verifier", role: "verifier", activateLabel: "Approved", activateExact: false },
];

const scenarios = [
  { name: "width-320", width: 320, height: 800 },
  { name: "width-375", width: 375, height: 812 },
  { name: "width-768", width: 768, height: 1024 },
  { name: "width-1024", width: 1024, height: 768 },
  { name: "width-1440", width: 1440, height: 900 },
  { name: "landscape-667x375", width: 667, height: 375, landscape: true },
  { name: "zoom-200", width: 640, height: 900, zoom: 2 },
  { name: "text-spacing-375", width: 375, height: 812, textSpacing: true },
];

const roleEmails = {
  candidate: "candidate@join.local",
  employer: "employer@join.local",
  admin: "admin@join.local",
  verifier: "verifier@join.local",
};

async function login(email) {
  const response = await fetch(`${API_BASE}/login_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: FIXTURE_PASSWORD }),
  });
  if (!response.ok) throw new Error(`Fixture login failed for ${email}: ${response.status}`);
  return (await response.json()).token;
}

function compactAxeViolation(violation) {
  return {
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    tags: violation.tags.filter((tag) => tag.startsWith("wcag")),
    nodes: violation.nodes.slice(0, 8).map((node) => ({
      target: node.target,
      html: node.html.slice(0, 500),
      failureSummary: node.failureSummary,
    })),
    nodeCount: violation.nodes.length,
  };
}

async function inspectLayout(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;
    const selectors = "a[href],button,input,select,textarea,summary,[tabindex]";
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const overflowElements = [...document.querySelectorAll("body *")]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.classList.length ? `.${[...element.classList].slice(0, 2).join(".")}` : ""}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          text: (element.getAttribute("aria-label") || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
          html: element.outerHTML.slice(0, 500),
        };
      })
      .filter((item) => item.left < -2 || item.right > viewportWidth + 2)
      .slice(0, 20);
    const interactiveCount = [...document.querySelectorAll(selectors)].filter((element) => {
      if (!visible(element)) return false;
      if (element.matches("[disabled],[tabindex='-1']")) return false;
      return true;
    }).length;
    return {
      title: document.title,
      lang: root.lang,
      viewportWidth,
      scrollWidth: root.scrollWidth,
      horizontalOverflow: root.scrollWidth > viewportWidth + 2,
      overflowElements,
      h1Count: document.querySelectorAll("h1").length,
      mainCount: document.querySelectorAll("main,[role='main']").length,
      navCount: document.querySelectorAll("nav,[role='navigation']").length,
      interactiveCount,
    };
  });
}

async function inspectKeyboard(page) {
  const expectedCount = await page.locator("a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex='-1'])").count();
  const observed = [];
  const limit = Math.min(Math.max(expectedCount + 5, 20), 220);
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return "body";
      const text = (element.getAttribute("aria-label") || element.textContent || element.getAttribute("name") || "")
        .replace(/\s+/g, " ").trim().slice(0, 80);
      return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${text ? `:${text}` : ""}`;
    });
    observed.push(focus);
    if (index > 5 && focus === observed[0]) break;
  }
  return {
    expectedInteractiveCount: expectedCount,
    observedTabStops: [...new Set(observed)].slice(0, 220),
    firstTabStop: observed[0] || null,
    bodyReceivedFocus: observed.includes("body"),
    cycleDetected: observed.length > 6 && observed.at(-1) === observed[0],
  };
}

async function main() {
  const tokens = {};
  for (const [role, email] of Object.entries(roleEmails)) tokens[role] = await login(email);
  if (process.env.WCAG_CANDIDATE_TOKEN) tokens.candidate = process.env.WCAG_CANDIDATE_TOKEN;

  const browser = await chromium.launch({ executablePath: EDGE_PATH, headless: true });
  const results = [];
  const routePool = INCLUDE_DASHBOARD_STATES ? dashboardStateRoutes : routes;
  const selectedRoutes = ROUTE_FILTER.length ? routePool.filter((route) => ROUTE_FILTER.includes(route.path)) : routePool;
  const selectedScenarios = SCENARIO_FILTER.length
    ? scenarios.filter((scenario) => SCENARIO_FILTER.includes(scenario.name))
    : scenarios;
  try {
    for (const route of selectedRoutes) {
      for (const scenario of selectedScenarios) {
        const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height } });
        if (route.role) {
          await context.addInitScript((token) => sessionStorage.setItem("token", token), tokens[route.role]);
        }
        const page = await context.newPage();
        const consoleErrors = [];
        const failedRequests = [];
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500));
        });
        page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "failed"}`));
        const entry = { route, scenario, url: `${WEB_BASE}${route.path}`, scanError: null };
        try {
          const response = await page.goto(entry.url, { waitUntil: "networkidle", timeout: 30000 });
          entry.httpStatus = response?.status() ?? null;
          await page.waitForTimeout(350);
          if (route.activateLabel) {
            await page.getByRole("button", { name: route.activateLabel, exact: route.activateExact !== false }).click();
            await page.waitForTimeout(500);
          }
          if (scenario.zoom) {
            await page.evaluate((zoom) => { document.documentElement.style.zoom = String(zoom); }, scenario.zoom);
          }
          if (scenario.textSpacing) {
            await page.addStyleTag({ content: `
              * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }
              p { margin-bottom: 2em !important; }
            ` });
          }
          entry.layout = await inspectLayout(page);
          if (SCREENSHOT_DIR) {
            await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
            const routeName = route.activateLabel
              ? route.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
              : route.path === "/" ? "home" : route.path.replace(/^\//, "").replaceAll("/", "-");
            entry.screenshot = path.resolve(SCREENSHOT_DIR, `${routeName}-${scenario.name}.png`);
            await page.screenshot({ path: entry.screenshot, fullPage: false });
          }
          entry.axe = (await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze()).violations.map(compactAxeViolation);
          if (scenario.name === "width-1024") entry.keyboard = await inspectKeyboard(page);
          entry.finalUrl = page.url();
          entry.consoleErrors = [...new Set(consoleErrors)].slice(0, 10);
          entry.failedRequests = [...new Set(failedRequests)].slice(0, 10);
        } catch (error) {
          entry.scanError = String(error?.stack || error);
        } finally {
          await context.close();
        }
        results.push(entry);
        const violationCount = entry.axe?.length ?? "error";
        const overflow = entry.layout?.horizontalOverflow ? "overflow" : "no-overflow";
        process.stdout.write(`${route.path} ${scenario.name}: axe=${violationCount}, ${overflow}\n`);
      }
    }
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    standard: "WCAG 2.1 Level A and AA",
    browser: EDGE_PATH,
    notes: [
      "The zoom-200 scenario uses CSS zoom in headless Chromium and requires manual browser-zoom confirmation.",
      "Automated findings are evidence, not a complete conformance determination.",
      "Keyboard automation records tab stops; focus visibility and interaction quality require manual review.",
    ],
    routes: selectedRoutes,
    scenarios: selectedScenarios,
    results,
  };
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${OUTPUT}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
