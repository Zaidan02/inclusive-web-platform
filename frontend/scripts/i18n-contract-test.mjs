import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  localeDirection,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from "../src/i18n/locales.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const resourceRoot = path.resolve(scriptDirectory, "../src/i18n/resources");
const localeCodes = Object.keys(SUPPORTED_LOCALES);

function shape(value, prefix = "") {
  if (typeof value === "string") {
    assert.ok(value.trim(), `Empty translation at ${prefix}`);
    return [prefix];
  }
  if (Array.isArray(value)) {
    assert.ok(value.length, `Empty translation array at ${prefix}`);
    return value.flatMap((entry, index) => shape(entry, `${prefix}[${index}]`));
  }
  assert.ok(value && typeof value === "object", `Invalid translation value at ${prefix}`);
  return Object.keys(value)
    .sort()
    .flatMap((key) => shape(value[key], prefix ? `${prefix}.${key}` : key));
}

async function load(locale, namespace) {
  const source = await readFile(path.join(resourceRoot, locale, namespace), "utf8");
  return JSON.parse(source);
}

assert.equal(normalizeLocale("fr-FR"), "fr");
assert.equal(normalizeLocale("ar_LB"), "ar");
assert.equal(normalizeLocale("EN"), "en");
assert.equal(normalizeLocale("de"), null);
assert.equal(localeDirection("ar"), "rtl");
assert.equal(localeDirection("fr"), "ltr");

const namespaces = (await readdir(path.join(resourceRoot, "en")))
  .filter((file) => file.endsWith(".json"))
  .sort();

for (const locale of localeCodes) {
  const localeNamespaces = (await readdir(path.join(resourceRoot, locale)))
    .filter((file) => file.endsWith(".json"))
    .sort();
  assert.deepEqual(localeNamespaces, namespaces, `${locale} namespace files differ from English`);
}

for (const namespace of namespaces) {
  const referenceShape = shape(await load("en", namespace));
  for (const locale of localeCodes.filter((code) => code !== "en")) {
    const candidateShape = shape(await load(locale, namespace));
    assert.deepEqual(
      candidateShape,
      referenceShape,
      `${locale}/${namespace} does not match en/${namespace}`,
    );
  }
}

console.log(`i18n contract passed: ${localeCodes.length} locales, ${namespaces.length} namespaces.`);

