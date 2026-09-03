import assert from "node:assert/strict";
import { WEB_BASE, launchBrowser } from "./test-helpers.mjs";

const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await context.newPage();

async function openVoicePanel() {
  const language = page.locator(".voice-navigation__language");
  if (!(await language.isVisible())) {
    await page.locator(".voice-navigation__panel-toggle").click();
  }
  await language.waitFor({ state: "visible" });
}

try {
  await page.goto(`${WEB_BASE}/`, { waitUntil: "domcontentloaded", timeout: 20_000 });

  await page.locator("#interface-language").selectOption("ar");
  await page.waitForFunction(() => document.documentElement.lang === "ar");
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  assert.match(await page.locator("h1").first().innerText(), /\u0627\u0644\u0642\u062f\u0631\u0627\u062a/);
  await openVoicePanel();
  assert.match(await page.locator(".voice-navigation__language").innerText(), /\u0627\u0644\u0639\u0631\u0628\u064a\u0629/);
  assert.equal(await page.evaluate(() => localStorage.getItem("join.locale")), "ar");

  for (const route of ["/", "/signin", "/signup", "/forgot-password", "/employers", "/voice-help", "/privacy"]) {
    await page.goto(`${WEB_BASE}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.locator("html").getAttribute("lang"), "ar");
    assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
    await page.locator("h1").first().waitFor({ state: "visible" });
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    assert.equal(hasOverflow, false, `Unexpected Arabic horizontal overflow on ${route}`);
  }

  await page.goto(`${WEB_BASE}/signin`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator("#email").getAttribute("dir"), "ltr");
  await page.locator("#interface-language").selectOption("fr");
  await page.waitForFunction(() => document.documentElement.lang === "fr");
  assert.equal(await page.locator("html").getAttribute("dir"), "ltr");
  assert.match(await page.locator("h1").innerText(), /revoir/i);
  assert.match(await page.title(), /Connexion/);
  await openVoicePanel();
  assert.match(await page.locator(".voice-navigation__language").innerText(), /Fran\u00e7ais/);

  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.locator("#interface-language").inputValue(), "fr");
  assert.equal(await page.locator("html").getAttribute("lang"), "fr");

  process.stdout.write(
    "i18n E2E passed: persistence, lang/dir, RTL reflow, auth email direction, and voice-language synchronization.\n",
  );
} finally {
  await context.close();
  await browser.close();
}
