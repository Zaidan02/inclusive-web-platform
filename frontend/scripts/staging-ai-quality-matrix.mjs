import fs from "node:fs/promises";
import path from "node:path";
import { API_BASE, fixtureAccounts, login, requestJson, tokenHeaders } from "./test-helpers.mjs";

const OUTPUT = process.env.AI_MATRIX_OUTPUT || path.resolve("..", "docs", "testing", "staging-2026-09-10", "profile-ai", "ai-quality-matrix-results.json");
const CONSENT_VERSION = process.env.AI_CONSENT_VERSION || "2026-08-03";
const CONCURRENCY = Math.max(1, Math.min(3, Number(process.env.AI_MATRIX_CONCURRENCY || 3)));
const ONLY_IDS = new Set((process.env.AI_MATRIX_ONLY || "").split(",").map((item) => item.trim()).filter(Boolean));

const matrix = {
  en: [
    ["Complete profile", "My first name is Maya and my last name is Haddad. My phone number is 70123456 and I live in Beirut. Set my About text to: I am reliable, patient, and enjoy helping guests. I completed high school. I can read, write, and count independently. I want both paid work and a hospitality training program. I am interested in Cashier and know that position independently. I explicitly have a Hand disability. I can prepare the cash system and box, check and test electronics, and identify Food and Beverage menu components.", "first name maya last name haddad phone 70123456 live beirut about reliable patient help guests finished high school i read write count alone want work and hospitality training cashier know position alone i have hand disability can prepare cash system and box check test electronics know food beverage menu components"],
    ["Basic information only", "My first name is Lina and my last name is Mansour. My phone number is 03112233. I live in Tripoli. Set my About text to: I am friendly and punctual.", "first name lina last name mansour phone 03112233 live tripoli about friendly punctual"],
    ["Independent foundation abilities", "I can read independently, write independently, and count independently.", "i read write and count by myself without help"],
    ["Abilities with support", "I can read with support, write with support, and count with support.", "reading need help writing need help counting need help"],
    ["Mixed and not-yet abilities", "I read independently. I write with support. I cannot count yet.", "read alone write with help counting not yet"],
    ["Work only", "I want only paid work as a Cashier.", "want job only cashier position"],
    ["Training only", "I want only a hospitality training program. I have not described any previous job skills.", "only hospitality training no job skills mentioned"],
    ["Work and training", "I want both paid work and hospitality training.", "want job plus training both"],
    ["Explicit disability and skills", "I explicitly have a Hand disability. For Cashier work, I can prepare the cash system and box, check and test electronics, and identify Food and Beverage menu components.", "hand disability cashier can prepare cash system box check test electronics know food beverage menu components"],
    ["Ambiguous safety boundary", "Some activities can be difficult on some days, and perhaps I may work somewhere later, but I have not said what condition I have or what tasks I can perform.", "things sometimes difficult maybe work later not sure condition or skills"],
  ],
  fr: [
    ["Complete profile", "Mon prenom est Maya et mon nom est Haddad. Mon numero est 70123456 et j'habite a Beyrouth. Pour mon texte A propos: je suis fiable, patiente et j'aime aider les clients. J'ai termine le lycee. Je sais lire, ecrire et compter de facon autonome. Je veux a la fois un emploi remunere et une formation en hotellerie. Je souhaite travailler comme caissiere et je connais ce poste de facon autonome. Je declare explicitement un handicap Hand. Je sais preparer le systeme et la caisse, verifier et tester les appareils electroniques, et identifier les composants du menu Food and Beverage.", "prenom maya nom haddad numero 70123456 beyrout a propos fiable patiente aide clients lycee lire ecrire compter seule emploi et formation hotellerie caissiere connait seule handicap hand prepare systeme caisse verifie appareils electroniques connait menu food beverage"],
    ["Basic information only", "Mon prenom est Lina et mon nom est Mansour. Mon numero est 03112233. J'habite a Tripoli. Pour mon texte A propos: je suis aimable et ponctuelle.", "prenom lina nom mansour numero 03112233 tripoli a propos aimable ponctuelle"],
    ["Independent foundation abilities", "Je sais lire, ecrire et compter de facon autonome.", "je lis j ecris je compte toute seule sans aide"],
    ["Abilities with support", "J'ai besoin d'aide pour lire, pour ecrire et pour compter.", "lecture avec aide ecriture avec aide calcul avec aide"],
    ["Mixed and not-yet abilities", "Je lis de facon autonome. J'ecris avec de l'aide. Je ne sais pas encore compter.", "lire seule ecrire avec aide compter pas encore"],
    ["Work only", "Je veux uniquement un emploi remunere comme caissiere.", "emploi seulement caissiere"],
    ["Training only", "Je veux uniquement une formation en hotellerie. Je n'ai decrit aucune experience professionnelle.", "seulement formation hotellerie aucune competence de travail mentionnee"],
    ["Work and training", "Je veux un emploi remunere et aussi une formation en hotellerie, donc les deux.", "emploi plus formation hotellerie les deux"],
    ["Explicit disability and skills", "Je declare explicitement un handicap Hand. Pour le travail de caissiere, je sais preparer le systeme et la caisse, verifier et tester les appareils electroniques, et identifier les composants du menu Food and Beverage.", "hand handicap caissiere prepare systeme caisse verifie teste electronique connait composants menu food beverage"],
    ["Ambiguous safety boundary", "Certaines activites sont parfois difficiles et je travaillerai peut-etre plus tard, mais je n'ai indique ni diagnostic ni tache que je sais realiser.", "parfois difficile peut etre travail plus tard pas certain diagnostic capacites"],
  ],
  ar: [
    ["Complete profile", "اسمي الأول مايا واسم العائلة حداد. رقم هاتفي 70123456 وأسكن في بيروت. اكتب في نبذة عني: أنا موثوقة وصبورة وأحب مساعدة الضيوف. أنهيت الثانوية. أستطيع القراءة والكتابة والعد باستقلالية. أريد عملا مدفوعا وبرنامج تدريب في الضيافة، أي الاثنين. أنا مهتمة بوظيفة كاشير وأعرف هذه الوظيفة باستقلالية. أصرح أن لدي إعاقة Hand في اليد. أستطيع تجهيز نظام وصندوق النقد، وفحص الأجهزة الإلكترونية واختبارها، ومعرفة مكونات قائمة الطعام والشراب.", "اسمي مايا حداد رقمي 70123456 بيروت نبذة موثوقة صبورة اساعد الضيوف ثانوية اقرأ اكتب اعد وحدي اريد شغل وتدريب ضيافة كاشير اعرف الوظيفة وحدي عندي اعاقة Hand اجهز نظام وصندوق النقد افحص الالكترونيات واعرف مكونات قائمة الطعام والشراب"],
    ["Basic information only", "اسمي الأول لينا واسم العائلة منصور. رقم هاتفي 03112233. أسكن في طرابلس. اكتب في نبذة عني: أنا ودودة وملتزمة بالمواعيد.", "الاسم لينا العائلة منصور الهاتف 03112233 طرابلس نبذة ودودة ملتزمة بالمواعيد"],
    ["Independent foundation abilities", "أستطيع القراءة والكتابة والعد باستقلالية ومن دون مساعدة.", "بعرف اقرأ واكتب وعد لحالي بلا مساعدة"],
    ["Abilities with support", "أحتاج إلى مساعدة في القراءة والكتابة والعد.", "القراءة مع مساعدة والكتابة مع مساعدة والعد مع مساعدة"],
    ["Mixed and not-yet abilities", "أقرأ باستقلالية، وأكتب مع مساعدة، ولا أستطيع العد بعد.", "اقرأ لحالي اكتب بمساعدة العد بعدني ما بعرف"],
    ["Work only", "أريد عملا مدفوعا فقط بوظيفة كاشير.", "بدي شغل بس كاشير"],
    ["Training only", "أريد فقط برنامج تدريب في الضيافة، ولم أذكر أي خبرة أو مهارة وظيفية سابقة.", "بدي تدريب ضيافة بس ما ذكرت مهارات شغل"],
    ["Work and training", "أريد عملا مدفوعا وبرنامج تدريب في الضيافة، أي أريد الاثنين.", "بدي شغل وتدريب ضيافة الاثنين"],
    ["Explicit disability and skills", "أصرح أن لدي إعاقة Hand في اليد. في عمل الكاشير أستطيع تجهيز نظام وصندوق النقد، وفحص الأجهزة الإلكترونية واختبارها، ومعرفة مكونات قائمة الطعام والشراب.", "عندي اعاقة Hand كاشير بجهز نظام وصندوق النقد بفحص الالكترونيات وبعرف مكونات قائمة الطعام والشراب"],
    ["Ambiguous safety boundary", "بعض الأنشطة تكون صعبة أحيانا وقد أعمل في مكان ما لاحقا، لكنني لم أحدد أي حالة صحية أو مهمة أستطيع تنفيذها.", "اشياء صعبة احيانا يمكن اشتغل بعدين مش محدد حالة او مهارات"],
  ],
};

function abilityMap(suggestions) {
  return Object.fromEntries((suggestions.practicalAbilities || []).map((item) => [item.field, item.value]));
}

function evaluate(index, suggestions) {
  const fields = new Set((suggestions.profileFields || []).map((item) => item.field));
  const abilities = abilityMap(suggestions);
  const disabilities = (suggestions.disabilities || []).map((item) => item.name);
  const positions = (suggestions.positionInterests || []).map((item) => String(item.jobName || "").toLowerCase());
  const preference = suggestions.opportunityPreference?.value || null;
  const checks = [];
  const check = (name, passed, actual) => checks.push({ name, passed: Boolean(passed), actual });

  if (index === 1) {
    for (const field of ["firstName", "lastName", "phone", "location", "about"]) check(`profile field ${field}`, fields.has(field), [...fields]);
    check("high-school education", suggestions.educationLevel?.value === "high_school", suggestions.educationLevel?.value || null);
    for (const field of ["readingAbility", "writingAbility", "numeracyAbility"]) check(`${field} independent`, abilities[field] === "independent", abilities[field] || null);
    check("both opportunity types", preference === "both", preference);
    check("Cashier interest", positions.some((name) => name.includes("cashier")), positions);
    check("explicit Hand disability", disabilities.includes("Hand"), disabilities);
    check("at least three task skills", (suggestions.taskSkills || []).length >= 3, (suggestions.taskSkills || []).length);
  } else if (index === 2) {
    for (const field of ["firstName", "lastName", "phone", "location", "about"]) check(`profile field ${field}`, fields.has(field), [...fields]);
    check("no education invented", !suggestions.educationLevel, suggestions.educationLevel);
    check("no ability invented", Object.keys(abilities).length === 0, abilities);
    check("no disability invented", disabilities.length === 0, disabilities);
    check("no position invented", positions.length === 0, positions);
  } else if (index === 3) {
    for (const field of ["readingAbility", "writingAbility", "numeracyAbility"]) check(`${field} independent`, abilities[field] === "independent", abilities[field] || null);
  } else if (index === 4) {
    for (const field of ["readingAbility", "writingAbility", "numeracyAbility"]) check(`${field} with support`, abilities[field] === "with_support", abilities[field] || null);
  } else if (index === 5) {
    check("reading independent", abilities.readingAbility === "independent", abilities.readingAbility || null);
    check("writing with support", abilities.writingAbility === "with_support", abilities.writingAbility || null);
    check("counting not yet", abilities.numeracyAbility === "not_yet", abilities.numeracyAbility || null);
  } else if (index === 6) {
    check("work preference", preference === "work", preference);
    check("Cashier interest", positions.some((name) => name.includes("cashier")), positions);
  } else if (index === 7) {
    check("training preference", preference === "training", preference);
    check("no job experience invented", (suggestions.taskSkills || []).length === 0 && positions.length === 0, { tasks: (suggestions.taskSkills || []).length, positions });
  } else if (index === 8) {
    check("both preference", preference === "both", preference);
  } else if (index === 9) {
    check("only explicit Hand disability", disabilities.length === 1 && disabilities[0] === "Hand", disabilities);
    check("at least three controlled tasks", (suggestions.taskSkills || []).length >= 3, (suggestions.taskSkills || []).map((item) => item.task_name));
  } else if (index === 10) {
    check("no disability diagnosis", disabilities.length === 0, disabilities);
    check("no ability invented", Object.keys(abilities).length === 0, abilities);
    check("no task invented", (suggestions.taskSkills || []).length === 0, (suggestions.taskSkills || []).map((item) => item.task_name));
    check("no position invented", positions.length === 0, positions);
    check("ambiguity retained", (suggestions.unmappedStatements || []).length > 0, suggestions.unmappedStatements || []);
  }
  return { passed: checks.every((item) => item.passed), checks };
}

async function saveCheckpoint(results, startedAt) {
  const sorted = [...results].sort((a, b) => a.testId.localeCompare(b.testId));
  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    apiBase: API_BASE,
    methodology: "Ten gold-standard profile narratives in clean and imperfect form across English, French and Arabic. Suggestions are evaluated without confirmation; candidate profile state is checked and reset.",
    summary: {
      planned: 60,
      completed: sorted.length,
      pass: sorted.filter((item) => item.status === "Pass").length,
      fail: sorted.filter((item) => item.status === "Fail").length,
      blocked: sorted.filter((item) => item.status === "Blocked").length,
    },
    cases: sorted,
  };
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

const token = await login(fixtureAccounts.candidate.email);
await requestJson(`${API_BASE}/candidate/profile/reset`, { method: "POST", headers: tokenHeaders(token) });
const initial = await requestJson(`${API_BASE}/candidate/profile`, { headers: tokenHeaders(token) });
const startedAt = new Date().toISOString();
const testCases = [];
for (const [language, personas] of Object.entries(matrix)) {
  for (const [personaOffset, [persona, clean, imperfect]] of personas.entries()) {
    for (const [condition, narrative] of [["C", clean], ["I", imperfect]]) {
      testCases.push({ testId: `AI-${language.toUpperCase()}-${condition}${String(personaOffset + 1).padStart(2, "0")}`, language, persona, condition: condition === "C" ? "Clean text" : "Imperfect transcript", narrative, personaIndex: personaOffset + 1 });
    }
  }
}

let results = [];
if (ONLY_IDS.size) {
  try {
    const existing = JSON.parse(await fs.readFile(OUTPUT, "utf8"));
    results = (existing.cases || []).filter((item) => !ONLY_IDS.has(item.testId));
  } catch {
    results = [];
  }
}
async function runCase(testCase) {
  const started = performance.now();
  let last;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    last = await requestJson(`${API_BASE}/candidate/profile/ai-suggestions`, {
      method: "POST",
      headers: { ...tokenHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ narrative: testCase.narrative, language: testCase.language, consent: true, consentVersion: CONSENT_VERSION }),
    });
    if (![429, 502, 503].includes(last.response.status)) break;
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
  }
  const durationMs = Math.round((performance.now() - started) * 10) / 10;
  if (last.response.status !== 200 || !last.body?.suggestions) {
    return { ...testCase, narrative: undefined, status: "Blocked", httpStatus: last.response.status, durationMs, actual: last.body?.message || "No AI suggestions returned after three attempts.", suggestions: null, evaluation: null };
  }
  const evaluation = evaluate(testCase.personaIndex, last.body.suggestions);
  return { ...testCase, narrative: undefined, status: evaluation.passed ? "Pass" : "Fail", httpStatus: last.response.status, durationMs, actual: evaluation.passed ? "All gold expectations passed." : `${evaluation.checks.filter((item) => !item.passed).length} gold expectation(s) failed.`, suggestions: last.body.suggestions, evaluation };
}

const selectedCases = ONLY_IDS.size ? testCases.filter((item) => ONLY_IDS.has(item.testId)) : testCases;
for (let offset = 0; offset < selectedCases.length; offset += CONCURRENCY) {
  const batch = selectedCases.slice(offset, offset + CONCURRENCY);
  const batchResults = await Promise.all(batch.map(runCase));
  results.push(...batchResults);
  for (const result of batchResults) process.stdout.write(`${result.testId}: ${result.status} (${result.durationMs} ms) ${result.actual}\n`);
  await saveCheckpoint(results, startedAt);
}

const finalProfile = await requestJson(`${API_BASE}/candidate/profile`, { headers: tokenHeaders(token) });
const profile = finalProfile.body.profile || {};
const profileUnchanged = !profile.firstName && !profile.educationLevel && (profile.selectedDisabilities || []).length === 0 && (profile.positionInterests || []).length === 0 && (profile.confirmedTaskSkills || []).length === 0;
await requestJson(`${API_BASE}/candidate/profile/reset`, { method: "POST", headers: tokenHeaders(token) });
await saveCheckpoint(results.map((item) => ({ ...item, profileUnchangedBeforeCleanup: profileUnchanged })), startedAt);
const summary = {
  planned: 60,
  pass: results.filter((item) => item.status === "Pass").length,
  fail: results.filter((item) => item.status === "Fail").length,
  blocked: results.filter((item) => item.status === "Blocked").length,
  profileUnchangedBeforeCleanup: profileUnchanged,
};
process.stdout.write(`Wrote ${OUTPUT}\n${JSON.stringify(summary)}\n`);
