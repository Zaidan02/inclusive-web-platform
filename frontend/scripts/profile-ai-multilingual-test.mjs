import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  API_BASE,
  WEB_BASE,
  fixtureAccounts,
  launchBrowser,
  login,
  requestJson,
  tokenHeaders,
  writeJsonReport,
} from "./test-helpers.mjs";

const OUTPUT_DIRECTORY = process.env.PROFILE_AI_OUTPUT_DIR
  ? path.resolve(process.env.PROFILE_AI_OUTPUT_DIR)
  : path.resolve("..", "docs", "testing", "profile-ai");
const REPORT_PATH = path.join(OUTPUT_DIRECTORY, "multilingual-results.json");
const RESET_PROFILE = process.env.PROFILE_AI_RESET !== "false";
const CONFIRM_ARABIC_PROFILE = process.env.PROFILE_AI_CONFIRM !== "false";
const CONFIRM_LANGUAGE = process.env.PROFILE_AI_CONFIRM_LANGUAGE || "ar";
const TARGET_LANGUAGES = new Set((process.env.PROFILE_AI_LANGUAGES || "en,fr,ar").split(",").map((item) => item.trim()).filter(Boolean));

const cases = [
  {
    language: "en",
    narrative: "My first name is Maya and my last name is Haddad. My phone number is 70123456 and I live in Beirut. Set my About you text to: I am reliable, patient, and enjoy helping guests. I completed high school. I know how to read, write, and count independently. I want both a paid job and a hospitality training program. I am interested in working as a Cashier and I already know this position independently. I have a disability affecting my hand, so select Hand. I can prepare the cash system and box, check and test electronics, and I know the Food and Beverage menu components.",
  },
  {
    language: "fr",
    narrative: "Mon prénom est Maya et mon nom est Haddad. Mon numéro est 70123456 et j'habite à Beyrouth. Pour À propos de moi : je suis fiable, patiente et j'aime aider les clients. J'ai terminé le lycée. Je sais lire, écrire et compter de façon autonome. Je veux à la fois un emploi rémunéré et un programme de formation en hôtellerie. Je souhaite travailler comme caissière et je connais déjà ce poste de façon autonome. J'ai un handicap à la main, sélectionnez Hand. Je sais préparer le système et la caisse, vérifier et tester les appareils électroniques, et je connais les composants du menu Food and Beverage.",
  },
  {
    language: "ar",
    narrative: "اسمي مايا واسم العيلة حداد، رقمي 70123456 وساكنة ببيروت. حط بنبذة عني: أنا شخص موثوق وصبور وبحب ساعد الضيوف. خلصت الثانوية. انا بعرف اقرا واكتب وعد لحالي. بدي شغل وبرنامج تدريب بالضيافة، يعني الاثنين. مهتمة بوظيفة كاشير وعندي معرفة فيها لحالي. عندي إعاقة باليد واختار Hand. بعرف حضر نظام الصندوق والكاش، وافحص الأجهزة الإلكترونية، وبعرف مكونات منيو الأكل والشرب.",
  },
];

const representativeCases = [
  {
    language: "en",
    narrative: "My first name is Maya and my last name is Haddad. My phone number is 70123456 and I live in Beirut. Set my About you text to: I am reliable, patient, and enjoy helping guests. I completed high school. I can read, write, and count independently. I want both paid work and a hospitality training program. I am interested in Cashier and know that position independently. I explicitly have a Hand disability. I can prepare the cash system and box, check and test electronics, and identify Food and Beverage menu components.",
  },
  {
    language: "fr",
    narrative: "Mon prenom est Maya et mon nom est Haddad. Mon numero est 70123456 et j'habite a Beyrouth. Pour mon texte A propos: je suis fiable, patiente et j'aime aider les clients. J'ai termine le lycee. Je sais lire, ecrire et compter de facon autonome. Mon choix explicite est les deux: un emploi remunere et une formation en hotellerie. Je souhaite travailler comme caissiere et je connais ce poste de facon autonome. Je declare explicitement un handicap Hand. Je sais preparer le systeme et la caisse, verifier et tester les appareils electroniques, et identifier les composants du menu Food and Beverage.",
  },
  {
    language: "ar",
    narrative: "اسمي الأول مايا واسم العائلة حداد. رقم هاتفي 70123456 وأسكن في بيروت. اكتب في نبذة عني: أنا موثوقة وصبورة وأحب مساعدة الضيوف. أنهيت الثانوية. أستطيع القراءة والكتابة والعد باستقلالية. أريد عملا مدفوعا وبرنامج تدريب في الضيافة، أي الاثنين. أنا مهتمة بوظيفة كاشير وأعرف هذه الوظيفة باستقلالية. أصرح أن لدي إعاقة Hand في اليد. أستطيع تجهيز نظام وصندوق النقد، وفحص الأجهزة الإلكترونية واختبارها، ومعرفة مكونات قائمة الطعام والشراب.",
  },
];

function valuesFromSuggestions(items, fieldAttribute, valueAttribute) {
  return Object.fromEntries(items.map((item) => [item[fieldAttribute], item[valueAttribute]]));
}

async function inspectSuggestions(page) {
  const profileFields = await page.locator('[data-suggestion-kind="profile"]').evaluateAll((nodes) =>
    nodes.map((node) => node.dataset.suggestionField));
  const abilityItems = await page.locator('[data-suggestion-kind="ability"]').evaluateAll((nodes) =>
    nodes.map((node) => ({ field: node.dataset.suggestionField, value: node.dataset.suggestionValue })));
  const educationLocator = page.locator('[data-suggestion-kind="education"]');
  const opportunityLocator = page.locator('[data-suggestion-kind="opportunity"]');
  const education = await educationLocator.count() ? await educationLocator.getAttribute("data-suggestion-value") : null;
  const opportunity = await opportunityLocator.count() ? await opportunityLocator.getAttribute("data-suggestion-value") : null;
  const positionIds = await page.locator('[data-suggestion-kind="position"]').evaluateAll((nodes) =>
    nodes.map((node) => Number(node.dataset.suggestionJobId)));
  const disabilities = await page.locator('[data-suggestion-kind="disability"]').evaluateAll((nodes) =>
    nodes.map((node) => node.dataset.suggestionValue));
  const taskIds = await page.locator('[data-suggestion-kind="task"]').evaluateAll((nodes) =>
    nodes.map((node) => Number(node.dataset.suggestionTaskId)));
  return { profileFields, abilityItems, education, opportunity, positionIds, disabilities, taskIds };
}

function assertComplete(result, language) {
  for (const field of ["firstName", "lastName", "phone", "location", "about"]) {
    assert.ok(result.profileFields.includes(field), `${language}: missing ${field}`);
  }
  assert.equal(result.education, "high_school", `${language}: education should be high_school`);
  assert.deepEqual(valuesFromSuggestions(result.abilityItems, "field", "value"), {
    readingAbility: "independent",
    writingAbility: "independent",
    numeracyAbility: "independent",
  }, `${language}: reading, writing, and counting must all be independent`);
  assert.equal(result.opportunity, "both", `${language}: opportunity preference should be both`);
  assert.ok(result.positionIds.includes(6), `${language}: Cashier position interest is missing`);
  assert.ok(result.disabilities.includes("Hand"), `${language}: explicit Hand selection is missing`);
  assert.ok(result.taskIds.length >= 3, `${language}: expected at least three catalogue-backed task skills`);
}

await fs.mkdir(OUTPUT_DIRECTORY, { recursive: true });
const token = await login(fixtureAccounts.candidate.email);
if (RESET_PROFILE) {
  const reset = await requestJson(`${API_BASE}/candidate/profile/reset`, {
    method: "POST",
    headers: tokenHeaders(token),
  });
  assert.equal(reset.response.status, 200, "Candidate profile reset failed");
}

const browser = await launchBrowser();
const results = [];
try {
  for (const testCase of representativeCases.filter((item) => TARGET_LANGUAGES.has(item.language))) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(({ authToken, locale }) => {
      sessionStorage.setItem("token", authToken);
      localStorage.setItem("join.locale", locale);
    }, { authToken: token, locale: testCase.language });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    await page.goto(`${WEB_BASE}/candidate`, { waitUntil: "networkidle", timeout: 30_000 });
    if (await page.locator(".ai-profile-builder").count() === 0 && await page.locator(".candidate-dashboard__tabs button").count() >= 3) {
      await page.locator(".candidate-dashboard__tabs button").nth(2).click();
    }
    if (await page.locator(".ai-profile-builder").count() === 0) {
      const diagnosticPath = path.join(OUTPUT_DIRECTORY, `diagnostic-${testCase.language}.png`);
      await page.screenshot({ path: diagnosticPath, fullPage: true });
      throw new Error(`${testCase.language}: AI profile builder did not render at ${page.url()}; page errors: ${pageErrors.join(" | ") || "none"}; text: ${(await page.locator("body").innerText()).slice(0, 500)}`);
    }
    await page.locator("#ai-profile-input-language").selectOption(testCase.language);
    await page.locator(".ai-profile-builder__narrative textarea").fill(testCase.narrative);
    await page.locator(".ai-profile-builder__consent input").check();
    await page.locator(".ai-profile-builder__analyse").click();
    await page.locator(".ai-profile-builder__review, .ai-profile-builder__error").first().waitFor({ state: "visible", timeout: 120_000 });
    if (await page.locator(".ai-profile-builder__error").count()) {
      const errorScreenshot = path.join(OUTPUT_DIRECTORY, `profile-suggestions-${testCase.language}-error.png`);
      await page.locator(".ai-profile-builder").screenshot({ path: errorScreenshot });
      throw new Error(`${testCase.language}: ${await page.locator(".ai-profile-builder__error").innerText()}`);
    }

    const suggestions = await inspectSuggestions(page);
    const screenshotPath = path.join(OUTPUT_DIRECTORY, `profile-suggestions-${testCase.language}.png`);
    await page.locator(".ai-profile-builder").screenshot({ path: screenshotPath });
    assertComplete(suggestions, testCase.language);
    assert.deepEqual(pageErrors, [], `${testCase.language}: browser page errors`);
    results.push({ language: testCase.language, status: "passed", suggestions, screenshot: screenshotPath });

    if (testCase.language === CONFIRM_LANGUAGE && CONFIRM_ARABIC_PROFILE) {
      const reviewChoices = page.locator('.ai-profile-builder__review input[type="checkbox"]');
      for (let index = 0; index < await reviewChoices.count(); index += 1) {
        await reviewChoices.nth(index).check();
      }
      await page.locator(".ai-profile-builder__confirm").click();
      await page.locator(".ai-profile-builder__review").waitFor({ state: "detached", timeout: 30_000 });
      const profileResponse = await requestJson(`${API_BASE}/candidate/profile`, { headers: tokenHeaders(token) });
      assert.equal(profileResponse.response.status, 200);
      const profile = profileResponse.body.profile;
      assert.equal(profile.readingAbility, "independent");
      assert.equal(profile.writingAbility, "independent");
      assert.equal(profile.numeracyAbility, "independent");
      assert.equal(profile.educationLevel, "high_school");
      assert.equal(profile.opportunityPreference, "both");
      assert.ok(profile.positionInterests.some((item) => Number(item.jobDefinitionId) === 6));
      assert.ok(profile.selectedDisabilities.includes("Hand"));
      const finalScreenshot = path.join(OUTPUT_DIRECTORY, `profile-confirmed-${testCase.language}.png`);
      await page.screenshot({ path: finalScreenshot, fullPage: true });
      results.push({ language: testCase.language, status: "confirmed", profile: {
        educationLevel: profile.educationLevel,
        readingAbility: profile.readingAbility,
        writingAbility: profile.writingAbility,
        numeracyAbility: profile.numeracyAbility,
        opportunityPreference: profile.opportunityPreference,
        positionInterestIds: profile.positionInterests.map((item) => item.jobDefinitionId),
        disabilityCount: profile.selectedDisabilities.length,
        confirmedTaskSkillCount: profile.confirmedTaskSkills.length,
      }, screenshot: finalScreenshot });
    }
    await context.close();
    process.stdout.write(`PASS ${testCase.language} complete AI profile suggestions\n`);
  }
} finally {
  await browser.close();
}

await writeJsonReport(REPORT_PATH, {
  generatedAt: new Date().toISOString(),
  webBase: WEB_BASE,
  apiBase: API_BASE,
  profileReset: RESET_PROFILE,
  profileConfirmationPerformed: CONFIRM_ARABIC_PROFILE,
  cases: results,
});
process.stdout.write(`Report: ${REPORT_PATH}\n`);
