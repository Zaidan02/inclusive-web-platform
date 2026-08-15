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

try {
  const token = await login(fixtureAccounts.admin.email);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript((value) => sessionStorage.setItem("token", value), token);
  const page = await context.newPage();

  // Capture the completed UI state without changing the development database.
  await page.route("**/api/admin/job-catalogue/import", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Imported 1 job definition(s), 42 task(s), and 714 assessment(s).",
        summary: {
          jobsImported: 1,
          tasksImported: 42,
          assessmentsImported: 714,
          disabilitiesCreated: 0,
          warnings: [],
        },
      }),
    });
  });

  await page.goto(`${WEB_BASE}${fixtureAccounts.admin.home}`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.getByRole("heading", { name: "Users" }).waitFor({ state: "visible", timeout: 10_000 });
  await page.locator("input[type='file'][accept*='.xlsx']").setInputFiles({
    name: "validated-new-role.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("non-persistent report-capture payload"),
  });
  await page.getByRole("status").filter({ hasText: "Import complete" }).waitFor({ state: "visible", timeout: 10_000 });
  await page.locator('[aria-label="Voice navigation"]').evaluate((element) => { element.style.display = "none"; }).catch(() => {});

  const mainBox = await page.locator("main.dashboard-main").boundingBox();
  const headerBox = await page.locator(".dashboard-page-header").boundingBox();
  const statusBox = await page.getByRole("status").filter({ hasText: "Import complete" }).boundingBox();
  if (!mainBox || !headerBox || !statusBox) throw new Error("Catalogue import controls were not measurable");
  const top = Math.max(0, headerBox.y - 18);
  await page.screenshot({
    path: path.join(outputDirectory, "figure-admin-catalogue-import.png"),
    clip: {
      x: mainBox.x,
      y: top,
      width: mainBox.width,
      height: statusBox.y + statusBox.height - top + 22,
    },
  });
  await context.close();

  const workbookContext = await browser.newContext({ viewport: { width: 1400, height: 850 }, deviceScaleFactor: 1 });
  const workbookPage = await workbookContext.newPage();
  await workbookPage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:38px;background:#eef4ff;color:#10213c;font-family:Arial,sans-serif}
    h1{margin:0 0 8px;font-size:30px}.sub{margin:0 0 24px;color:#526b8e}
    .sheet{overflow:hidden;background:#fff;border:1px solid #9fb6d5;border-radius:14px;box-shadow:0 10px 28px rgba(25,64,120,.12)}
    table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cbd8e8;padding:12px 10px;text-align:left;vertical-align:middle}
    th{background:#dce8f8;color:#16345e}.letter{display:block;font-size:12px;color:#58708f;margin-bottom:5px}.task{font-weight:700}
    .marker{text-align:center;font-size:20px;font-weight:800}.yes{color:#117a43;background:#eaf8f0}.assist{color:#9a5b00;background:#fff5db}.avoid{color:#b42318;background:#fff0ee}
    .ignored{color:#697b92;background:#f7f9fc}.notes{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:20px}
    .note{background:#fff;border-left:5px solid #2364d2;border-radius:8px;padding:14px 16px;line-height:1.45}.note strong{display:block;margin-bottom:5px}
    code{font-family:Consolas,monospace;background:#eaf1fb;border-radius:4px;padding:2px 5px}
  </style></head><body><h1>Supported workbook structure and field mapping</h1>
    <p class="sub">Representative rows verified in <strong>2026_07_03 Chocolaterie.xlsx</strong>, worksheet <strong>H 1 main</strong>.</p>
    <div class="sheet"><table aria-label="Workbook import mapping"><thead><tr>
      <th><span class="letter">Column B</span>French source label</th><th><span class="letter">Column C</span>English task imported now</th>
      <th><span class="letter">Column D</span>Arabic source label</th><th><span class="letter">Column F</span>Feasible</th>
      <th><span class="letter">Column G</span>Needs assistance</th><th><span class="letter">Column H</span>Avoid</th></tr></thead><tbody>
      <tr><td>Ecrire</td><td class="task">Write</td><td dir="rtl">كتابة</td><td class="marker yes">1</td><td></td><td></td></tr>
      <tr><td>Mélanger</td><td class="task">Mix</td><td dir="rtl">الخلط</td><td></td><td class="marker assist">1</td><td></td></tr>
      <tr><td>Empaquetter</td><td class="task">Wrap</td><td dir="rtl">لف</td><td></td><td></td><td class="marker avoid">1</td></tr>
      <tr class="ignored"><td>Heading or duplicate layout row</td><td>No usable task/marker pair</td><td></td><td></td><td></td><td>Ignored</td></tr>
    </tbody></table></div>
    <div class="notes"><div class="note"><strong>Task extraction</strong>Rows are scanned from row 19 onward. Column C is the current canonical English task name; B and D remain source-language columns.</div>
    <div class="note"><strong>Assessment extraction</strong>F → <code>feasible</code>, G → <code>needs_assistance</code>, H → <code>avoid</code>. If markers overlap, H then G then F wins.</div>
    <div class="note"><strong>Blank-cell rule</strong>An unmarked or structural row is not converted to <code>avoid</code>. It is skipped; runtime missing-assessment policy is documented separately.</div></div>
  </body></html>`);
  await workbookPage.screenshot({
    path: path.join(outputDirectory, "figure-workbook-import-template.png"),
    fullPage: true,
  });
  await workbookContext.close();
  process.stdout.write(`Catalogue screenshot written to ${outputDirectory}\n`);
} finally {
  await browser.close();
}
