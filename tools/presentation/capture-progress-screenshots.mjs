import fs from "node:fs/promises";
import path from "node:path";
import {
  WEB_BASE,
  fixtureAccounts,
  launchBrowser,
  login,
} from "../../frontend/scripts/test-helpers.mjs";

const outputDirectory = path.resolve("docs", "presentation", "assets");
await fs.mkdir(outputDirectory, { recursive: true });

const browser = await launchBrowser();

async function capture(name, route, setup) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  if (setup?.token) {
    await context.addInitScript((token) => sessionStorage.setItem("token", token), setup.token);
  }
  await page.goto(`${WEB_BASE}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
  const expandedVoicePanel = page.locator(".voice-navigation--expanded .voice-navigation__panel-toggle");
  if (await expandedVoicePanel.count()) await expandedVoicePanel.click();
  if (setup?.action) await setup.action(page);
  await page.screenshot({
    path: path.join(outputDirectory, `${name}.png`),
    fullPage: false,
  });
  await context.close();
}

const tokens = {
  candidate: await login(fixtureAccounts.candidate.email),
  employer: await login(fixtureAccounts.employer.email),
  admin: await login(fixtureAccounts.admin.email),
  verifier: await login(fixtureAccounts.verifier.email),
};

await capture("01-landing", "/");
await capture("02-signin", "/signin");
await capture("03-candidate-matching", "/candidate", { token: tokens.candidate });
await capture("04-candidate-profile", "/candidate", {
  token: tokens.candidate,
  action: async (page) => {
    await page.getByRole("button", { name: "My profile", exact: true }).click();
    await page.getByLabel("Reading", { exact: true }).waitFor({ state: "visible" });
  },
});
await capture("05-employer-requirements", "/employer", { token: tokens.employer });
await capture("06-admin-catalogue", "/admin", {
  token: tokens.admin,
  action: async (page) => {
    await page.getByRole("button", { name: "Dataset catalogue", exact: true }).click();
    await page.locator(".admin-catalogue-card").first().waitFor({ state: "visible" });
  },
});
await capture("07-verifier", "/verifier", { token: tokens.verifier });

await browser.close();
process.stdout.write(`Captured presentation screenshots in ${outputDirectory}\n`);
