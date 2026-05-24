import fs from "node:fs";
import vm from "node:vm";

const sourcePath = "dist/i18n.js";
const source = fs.readFileSync(sourcePath, "utf8");

const context = {
  window: {},
  document: undefined,
  console
};
vm.createContext(context);
vm.runInContext(source, context, { filename: sourcePath });

const i18n = context.window.NutbookI18n;
if (!i18n) {
  throw new Error("window.NutbookI18n is not defined");
}

const { translations, legacyTextKeys, supportedLanguages } = i18n;
if (!translations || !legacyTextKeys || !supportedLanguages) {
  throw new Error("i18n exports are incomplete");
}

const flattenKeys = (value, prefix = "") => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) => (
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  ));
};

const locales = Object.keys(translations);
for (const language of supportedLanguages) {
  if (!translations[language]) {
    throw new Error(`Missing translations for supported language: ${language}`);
  }
}

const referenceLanguage = "zh-CN";
const referenceKeys = flattenKeys(translations[referenceLanguage]).sort();
for (const locale of locales) {
  const localeKeys = flattenKeys(translations[locale]).sort();
  const missing = referenceKeys.filter((key) => !localeKeys.includes(key));
  const extra = localeKeys.filter((key) => !referenceKeys.includes(key));
  if (missing.length || extra.length) {
    throw new Error([
      `Translation keys mismatch for ${locale}`,
      missing.length ? `missing: ${missing.join(", ")}` : "",
      extra.length ? `extra: ${extra.join(", ")}` : ""
    ].filter(Boolean).join("\n"));
  }
}

for (const [text, key] of Object.entries(legacyTextKeys)) {
  for (const locale of locales) {
    const value = i18n.lookup(key, locale);
    if (typeof value !== "string" || !value) {
      throw new Error(`Legacy text "${text}" points to missing key "${key}" for ${locale}`);
    }
  }
}

console.log(`i18n check passed: ${locales.length} locales, ${referenceKeys.length} keys, ${Object.keys(legacyTextKeys).length} legacy mappings`);
