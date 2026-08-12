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

const indexSourcePath = "dist/index.html";
const indexSource = fs.readFileSync(indexSourcePath, "utf8");
const settingsRenderStart = indexSource.indexOf("function renderSettingsPanel()");
const settingsRenderEnd = indexSource.indexOf("async function invoke(command", settingsRenderStart);
if (settingsRenderStart < 0 || settingsRenderEnd < 0) {
  throw new Error("Could not locate the settings renderer for i18n validation");
}
const settingsRenderer = indexSource.slice(settingsRenderStart, settingsRenderEnd);
const untranslatedSettingsLines = settingsRenderer
  .split("\n")
  .map((line, index) => ({ line: index + 1, text: line.trim() }))
  .filter(({ text }) => /[\u3400-\u9fff]/u.test(text));
if (untranslatedSettingsLines.length) {
  throw new Error([
    "Settings renderer contains visible Chinese literals outside the language dictionary:",
    ...untranslatedSettingsLines.map(({ line, text }) => `renderSettingsPanel +${line}: ${text}`)
  ].join("\n"));
}

const settingsMarkupStart = indexSource.indexOf('<div id="settingsScrim"');
const settingsMarkupEnd = indexSource.indexOf('<div id="aboutScrim"', settingsMarkupStart);
if (settingsMarkupStart < 0 || settingsMarkupEnd < 0) {
  throw new Error("Could not locate the static settings markup for i18n validation");
}
const settingsMarkup = indexSource.slice(settingsMarkupStart, settingsMarkupEnd);
const staticChineseTexts = [
  ...[...settingsMarkup.matchAll(/\b[\w:-]+\s*=\s*(["'])([^"']*[\u3400-\u9fff][^"']*)\1/gu)].map((match) => match[2].trim()),
  ...[...settingsMarkup.matchAll(/>\s*([^<>]*[\u3400-\u9fff][^<>]*)\s*</gu)].map((match) => match[1].trim())
].filter(Boolean);
const unregisteredStaticTexts = [...new Set(staticChineseTexts)]
  .filter((text) => !legacyTextKeys[text]);
if (unregisteredStaticTexts.length) {
  throw new Error([
    "Static settings markup contains Chinese text without a dictionary entry:",
    ...unregisteredStaticTexts.map((text) => `- ${text}`)
  ].join("\n"));
}

console.log(`i18n check passed: ${locales.length} locales, ${referenceKeys.length} keys, ${Object.keys(legacyTextKeys).length} legacy mappings`);
