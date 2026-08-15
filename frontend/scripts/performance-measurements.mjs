import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { preview } from "vite";
import {
  API_BASE,
  fixtureAccounts,
  launchBrowser,
  login,
  percentile,
  tokenHeaders,
  writeJsonReport,
} from "./test-helpers.mjs";

const OUTPUT = process.env.PERFORMANCE_OUTPUT
  || path.resolve("..", "docs", "testing", "performance-results.json");
const PREVIEW_PORT = Number(process.env.PERFORMANCE_PREVIEW_PORT || 4173);
const PERFORMANCE_WEB_BASE = process.env.PERFORMANCE_WEB_BASE || `http://127.0.0.1:${PREVIEW_PORT}`;
const ROUNDS = Number(process.env.PERFORMANCE_ROUNDS || 5);
const thresholds = {
  apiP95Ms: Number(process.env.PERF_MAX_API_P95_MS || 1000),
  pageLoadP95Ms: Number(process.env.PERF_MAX_PAGE_LOAD_P95_MS || 5000),
  firstContentfulPaintP95Ms: Number(process.env.PERF_MAX_FCP_P95_MS || 2500),
  javascriptGzipBytes: Number(process.env.PERF_MAX_JS_GZIP_BYTES || 180 * 1024),
  cssGzipBytes: Number(process.env.PERF_MAX_CSS_GZIP_BYTES || 100 * 1024),
};

function rounded(value) {
  return Math.round(value * 10) / 10;
}

async function measureApi(name, url, headers = {}) {
  const samples = [];
  for (let round = 0; round < ROUNDS + 1; round += 1) {
    const started = performance.now();
    const response = await fetch(url, { headers, cache: "no-store" });
    await response.arrayBuffer();
    const duration = performance.now() - started;
    if (!response.ok) throw new Error(`${name} returned HTTP ${response.status}`);
    if (round > 0) samples.push(duration);
  }
  return {
    name,
    samplesMs: samples.map(rounded),
    medianMs: rounded(percentile(samples, 0.5)),
    p95Ms: rounded(percentile(samples, 0.95)),
    maxMs: rounded(Math.max(...samples)),
  };
}

async function measurePage(browser, route, token = null) {
  const samples = [];
  for (let round = 0; round < ROUNDS; round += 1) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    if (token) await context.addInitScript((value) => sessionStorage.setItem("token", value), token);
    const page = await context.newPage();
    const response = await page.goto(`${PERFORMANCE_WEB_BASE}${route}`, { waitUntil: "load", timeout: 30_000 });
    if (!response?.ok()) throw new Error(`${route} returned HTTP ${response?.status()}`);
    await page.waitForFunction(() => performance.getEntriesByName("first-contentful-paint").length > 0, null, { timeout: 3000 });
    samples.push(await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const paint = performance.getEntriesByName("first-contentful-paint")[0];
      const resources = performance.getEntriesByType("resource");
      return {
        ttfbMs: navigation ? navigation.responseStart - navigation.requestStart : 0,
        domContentLoadedMs: navigation?.domContentLoadedEventEnd || 0,
        loadMs: navigation?.loadEventEnd || 0,
        firstContentfulPaintMs: paint?.startTime || 0,
        transferredBytes: resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
        resourceCount: resources.length,
        slowestResources: resources
          .map((resource) => ({
            name: resource.name,
            initiatorType: resource.initiatorType,
            durationMs: resource.duration,
            transferSize: resource.transferSize || 0,
          }))
          .sort((left, right) => right.durationMs - left.durationMs)
          .slice(0, 5),
      };
    }));
    await context.close();
  }
  return {
    route,
    samples: samples.map((sample) => ({
      ...sample,
      ttfbMs: rounded(sample.ttfbMs),
      domContentLoadedMs: rounded(sample.domContentLoadedMs),
      loadMs: rounded(sample.loadMs),
      firstContentfulPaintMs: rounded(sample.firstContentfulPaintMs),
      transferredBytes: rounded(sample.transferredBytes),
      slowestResources: sample.slowestResources.map((resource) => ({ ...resource, durationMs: rounded(resource.durationMs) })),
    })),
    p95: {
      ttfbMs: rounded(percentile(samples.map((sample) => sample.ttfbMs), 0.95)),
      domContentLoadedMs: rounded(percentile(samples.map((sample) => sample.domContentLoadedMs), 0.95)),
      loadMs: rounded(percentile(samples.map((sample) => sample.loadMs), 0.95)),
      firstContentfulPaintMs: rounded(percentile(samples.map((sample) => sample.firstContentfulPaintMs), 0.95)),
      transferredBytes: rounded(percentile(samples.map((sample) => sample.transferredBytes), 0.95)),
    },
  };
}

async function measureBundles() {
  const assetDirectory = path.resolve("dist", "assets");
  const files = await fs.readdir(assetDirectory);
  const assets = [];
  for (const file of files.filter((name) => /\.(js|css)$/.test(name))) {
    const contents = await fs.readFile(path.join(assetDirectory, file));
    assets.push({ file, rawBytes: contents.byteLength, gzipBytes: gzipSync(contents).byteLength });
  }
  return assets;
}

const candidateToken = await login(fixtureAccounts.candidate.email);
const api = [];
api.push(await measureApi("public jobs", `${API_BASE}/jobs`));
api.push(await measureApi("job definitions", `${API_BASE}/job-definitions`));
api.push(await measureApi("candidate session", `${API_BASE}/session`, tokenHeaders(candidateToken)));
api.push(await measureApi("candidate profile", `${API_BASE}/candidate/profile`, tokenHeaders(candidateToken)));

const previewServer = process.env.PERFORMANCE_WEB_BASE
  ? null
  : await preview({ preview: { host: "127.0.0.1", port: PREVIEW_PORT, strictPort: true } });
const browser = await launchBrowser();
const pages = [];
try {
  pages.push(await measurePage(browser, "/"));
  pages.push(await measurePage(browser, "/signin"));
  pages.push(await measurePage(browser, "/candidate", candidateToken));
} finally {
  await browser.close();
  previewServer?.httpServer.close();
}

const bundles = await measureBundles();
const violations = [];
for (const result of api) {
  if (result.p95Ms > thresholds.apiP95Ms) violations.push(`${result.name} API p95 ${result.p95Ms}ms exceeds ${thresholds.apiP95Ms}ms`);
}
for (const result of pages) {
  if (result.p95.loadMs > thresholds.pageLoadP95Ms) violations.push(`${result.route} load p95 ${result.p95.loadMs}ms exceeds ${thresholds.pageLoadP95Ms}ms`);
  if (result.p95.firstContentfulPaintMs <= 0) violations.push(`${result.route} did not produce a measurable first contentful paint`);
  if (result.p95.firstContentfulPaintMs > thresholds.firstContentfulPaintP95Ms) violations.push(`${result.route} FCP p95 ${result.p95.firstContentfulPaintMs}ms exceeds ${thresholds.firstContentfulPaintP95Ms}ms`);
}
for (const asset of bundles) {
  const threshold = asset.file.endsWith(".js") ? thresholds.javascriptGzipBytes : thresholds.cssGzipBytes;
  if (asset.gzipBytes > threshold) violations.push(`${asset.file} gzip ${asset.gzipBytes} bytes exceeds ${threshold} bytes`);
}

const reportPath = await writeJsonReport(OUTPUT, {
  generatedAt: new Date().toISOString(),
  environment: { webBase: PERFORMANCE_WEB_BASE, apiBase: API_BASE, rounds: ROUNDS, browser: process.env.TEST_BROWSER_PATH || "Microsoft Edge/default Chromium" },
  thresholds,
  summary: { status: violations.length ? "failed" : "passed", violationCount: violations.length },
  violations,
  api,
  pages,
  bundles,
  limitations: [
    "Local measurements are regression baselines, not production load-test results.",
    "Network, device, cache, and server contention affect timings; CI and deployed-environment runs should be retained separately.",
  ],
});

for (const result of api) process.stdout.write(`API ${result.name}: p95=${result.p95Ms}ms\n`);
for (const result of pages) process.stdout.write(`PAGE ${result.route}: load p95=${result.p95.loadMs}ms, FCP p95=${result.p95.firstContentfulPaintMs}ms\n`);
for (const asset of bundles) process.stdout.write(`ASSET ${asset.file}: gzip=${asset.gzipBytes} bytes\n`);
process.stdout.write(`Performance report: ${reportPath}\n`);
if (violations.length) {
  for (const violation of violations) process.stderr.write(`BUDGET ${violation}\n`);
  process.exitCode = 1;
}
