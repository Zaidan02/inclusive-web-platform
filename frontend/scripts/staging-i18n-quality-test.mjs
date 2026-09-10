import path from "node:path";
import {
  API_BASE,
  WEB_BASE,
  fixtureAccounts,
  launchBrowser,
  login,
  writeJsonReport,
} from "./test-helpers.mjs";

const OUTPUT = process.env.I18N_QUALITY_OUTPUT
  || path.resolve("..", "docs", "testing", "staging-2026-09-10", "i18n-quality-results.json");
const locales = ["en", "fr", "ar"];

const health = await fetch(`${API_BASE.replace(/\/api$/, "")}/health`);
if (!health.ok) throw new Error(`API health precondition failed with HTTP ${health.status}`);

const tokens = {
  candidate: await login(fixtureAccounts.candidate.email),
  employer: await login(fixtureAccounts.employer.email),
  admin: await login(fixtureAccounts.admin.email),
};

const screens = [
  { index: 1, name: "Sign in", route: "/signin" },
  { index: 2, name: "Candidate profile", route: "/candidate", role: "candidate", setup: "profile" },
  { index: 3, name: "AI profile builder", route: "/candidate", role: "candidate", setup: "ai" },
  { index: 4, name: "Job matching", route: "/candidate", role: "candidate", setup: "jobs" },
  { index: 5, name: "Employer opportunity creation", route: "/employer", role: "employer" },
  { index: 6, name: "Admin dashboard", route: "/admin", role: "admin" },
];

function idFor(screen, locale) {
  return `I18N-${String(screen.index).padStart(2, "0")}-${locale.toUpperCase()}`;
}

const browser = await launchBrowser();
const cases = [];
try {
  for (const screen of screens) {
    for (const locale of locales) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await context.addInitScript(({ authToken, selectedLocale }) => {
        if (authToken) sessionStorage.setItem("token", authToken);
        localStorage.setItem("join.locale", selectedLocale);
      }, { authToken: screen.role ? tokens[screen.role] : null, selectedLocale: locale });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(String(error)));
      const started = performance.now();
      try {
        const response = await page.goto(`${WEB_BASE}${screen.route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if (!response?.ok()) throw new Error(`page returned HTTP ${response?.status()}`);
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 15_000 });

        if (["profile", "ai"].includes(screen.setup)) {
          const tabs = page.locator(".candidate-dashboard__tabs button");
          await tabs.nth(2).click();
          await page.locator(".ai-profile-builder").waitFor({ state: "visible", timeout: 15_000 });
        }
        if (screen.setup === "jobs") {
          const tabs = page.locator(".candidate-dashboard__tabs button");
          await tabs.nth(0).click();
        }
        if (screen.role === "employer") {
          await page.locator('[data-voice-section="employer-dashboard"]').waitFor({ state: "visible" });
        }
        if (screen.role === "admin") {
          await page.locator('[data-voice-section="admin-dashboard"]').waitFor({ state: "visible" });
        }

        await page.waitForTimeout(250);
        const observation = await page.evaluate(() => {
          const bodyText = document.body.innerText;
          return {
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            heading: document.querySelector("h1")?.textContent?.trim() || "",
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
            unresolvedKey: bodyText.match(/\b(?:common|profile|candidate|employer|admin|auth)\.[a-z][a-zA-Z0-9_.-]+\b/)?.[0] || null,
          };
        });
        if (observation.lang !== locale) throw new Error(`expected lang=${locale}, received ${observation.lang}`);
        if (observation.dir !== (locale === "ar" ? "rtl" : "ltr")) throw new Error(`unexpected direction ${observation.dir}`);
        if (!observation.heading) throw new Error("visible heading text is empty");
        if (observation.horizontalOverflow) throw new Error("blocking horizontal overflow detected");
        if (observation.unresolvedKey) throw new Error(`unresolved translation key: ${observation.unresolvedKey}`);
        if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(" | ")}`);

        cases.push({
          testId: idFor(screen, locale),
          screen: screen.name,
          locale,
          status: "passed",
          durationMs: Math.round((performance.now() - started) * 10) / 10,
          observation,
        });
        process.stdout.write(`PASSED ${idFor(screen, locale)} ${screen.name}\n`);
      } catch (error) {
        const screenshot = path.resolve(path.dirname(OUTPUT), `failure-${idFor(screen, locale)}.png`);
        await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
        cases.push({
          testId: idFor(screen, locale),
          screen: screen.name,
          locale,
          status: "failed",
          durationMs: Math.round((performance.now() - started) * 10) / 10,
          reason: String(error.message || error),
          pageErrors,
          screenshot,
        });
        process.stderr.write(`FAILED ${idFor(screen, locale)} ${screen.name}: ${error.message || error}\n`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

const summary = {
  passed: cases.filter((item) => item.status === "passed").length,
  failed: cases.filter((item) => item.status === "failed").length,
  total: cases.length,
};
summary.successRate = Math.round((summary.passed / summary.total) * 10000) / 100;
const report = await writeJsonReport(OUTPUT, {
  generatedAt: new Date().toISOString(),
  environment: { webBase: WEB_BASE, apiBase: API_BASE, healthStatus: health.status },
  method: "Six representative screens in English, French and Arabic; document language/direction, heading output, unresolved keys, page errors and horizontal reflow.",
  summary,
  cases,
});
process.stdout.write(`i18n quality summary: ${JSON.stringify(summary)}\n`);
process.stdout.write(`Report: ${report}\n`);
if (summary.failed) process.exitCode = 1;
