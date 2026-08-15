import assert from "node:assert/strict";
import path from "node:path";
import {
  WEB_BASE,
  fixtureAccounts,
  launchBrowser,
  login,
  writeJsonReport,
} from "./test-helpers.mjs";

const OUTPUT = process.env.E2E_OUTPUT || path.resolve("..", "docs", "testing", "e2e-results.json");
const results = [];
const browser = await launchBrowser();

async function check(name, operation) {
  const started = performance.now();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "failed"}`));
  try {
    const detail = await operation(page, context);
    assert.deepEqual(errors, []);
    assert.deepEqual(failedRequests, []);
    results.push({ name, status: "passed", durationMs: Math.round((performance.now() - started) * 10) / 10, detail });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    results.push({ name, status: "failed", durationMs: Math.round((performance.now() - started) * 10) / 10, error: String(error.message || error), pageErrors: errors, failedRequests });
    process.stderr.write(`FAIL ${name}: ${error.message || error}\n`);
  } finally {
    await context.close();
  }
}

const publicRoutes = ["/", "/signin", "/signup", "/forgot-password", "/employers", "/voice-help", "/privacy"];
for (const route of publicRoutes) {
  await check(`public route ${route} renders semantic page structure`, async (page) => {
    const response = await page.goto(`${WEB_BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    assert.equal(response?.status(), 200);
    await page.locator("h1").first().waitFor({ state: "visible" });
    assert.equal(await page.locator("main,[role='main']").count(), 1);
    assert.notEqual(await page.title(), "");
    return { finalUrl: page.url(), title: await page.title() };
  });
}

for (const route of ["/candidate", "/employer", "/admin", "/verifier"]) {
  await check(`anonymous visitor is redirected from ${route}`, async (page) => {
    await page.goto(`${WEB_BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForURL("**/signin", { timeout: 10_000 });
    assert.equal(new URL(page.url()).pathname, "/signin");
    return { finalUrl: page.url() };
  });
}

await check("sign-in validation identifies and focuses the first invalid field", async (page) => {
  await page.goto(`${WEB_BASE}/signin`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.locator("#signin-email-error").waitFor({ state: "visible" });
  assert.equal(await page.locator("#email").evaluate((element) => element === document.activeElement), true);
  assert.equal(await page.locator("#email").getAttribute("aria-invalid"), "true");
  return { focusedField: "email" };
});

await check("invalid credentials produce an accessible alert", async (page) => {
  await page.goto(`${WEB_BASE}/signin`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill("nobody@example.invalid");
  await page.locator("#password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  const alert = page.getByRole("alert");
  await alert.waitFor({ state: "visible", timeout: 10_000 });
  assert.equal(await alert.evaluate((element) => element === document.activeElement), true);
  return { alertText: (await alert.textContent())?.trim() };
});

const tokens = {};
for (const [name, account] of Object.entries(fixtureAccounts)) tokens[name] = await login(account.email);

for (const [name, account] of Object.entries(fixtureAccounts)) {
  await check(`${name} opens the authorized dashboard`, async (page, context) => {
    await context.addInitScript((token) => sessionStorage.setItem("token", token), tokens[name]);
    await page.goto(`${WEB_BASE}${account.home}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForURL(`**${account.home}`, { timeout: 10_000 });
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
    return { finalUrl: page.url(), heading: (await page.locator("h1").first().textContent())?.trim() };
  });
}

await check("wrong-role dashboard access redirects to the user's own dashboard", async (page, context) => {
  await context.addInitScript((token) => sessionStorage.setItem("token", token), tokens.candidate);
  await page.goto(`${WEB_BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/candidate", { timeout: 10_000 });
  assert.equal(new URL(page.url()).pathname, "/candidate");
  return { finalUrl: page.url() };
});

await check("keyboard entry exposes the skip link", async (page) => {
  await page.goto(`${WEB_BASE}/`, { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  const focusedText = await page.evaluate(() => document.activeElement?.textContent?.trim());
  assert.equal(focusedText, "Skip to main content");
  return { firstTabStop: focusedText };
});

await browser.close();
const failed = results.filter((result) => result.status === "failed");
const reportPath = await writeJsonReport(OUTPUT, {
  generatedAt: new Date().toISOString(),
  webBase: WEB_BASE,
  summary: { passed: results.length - failed.length, failed: failed.length, total: results.length },
  results,
});
process.stdout.write(`E2E report: ${reportPath}\n`);
if (failed.length) process.exitCode = 1;
