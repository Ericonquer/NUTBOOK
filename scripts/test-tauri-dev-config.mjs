import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const BASE_PATH = "src-tauri/tauri.conf.json";
const DEV_PATH = "src-tauri/tauri.dev.conf.json";
const PACKAGE_PATH = "package.json";
const DEFAULT_APPS_PATH = "src-tauri/src/commands/default_apps.rs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

// Tauri CLI applies extra config files as RFC 7396 JSON Merge Patches.  In
// particular, an array in the patch replaces the base array; it does not
// append to it.  Keep this small implementation here so the regression proves
// the effective debug contract without launching a desktop app.
const mergePatch = (target, patch) => {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return patch;
  }
  const result = target && typeof target === "object" && !Array.isArray(target)
    ? { ...target }
    : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = mergePatch(result[key], value);
    }
  }
  return result;
};

const base = readJson(BASE_PATH);
const dev = readJson(DEV_PATH);
const effectiveDev = mergePatch(base, dev);

assert.equal(base.identifier, "com.hayley.nutbook");
assert.equal(dev.identifier, "com.hayley.nutbook.dev");
assert.equal(dev.productName, "NUTBOOK Dev");
assert.equal(dev.app?.windows?.[0]?.title, "NUTBOOK Dev");
assert.deepEqual(dev.bundle?.fileAssociations, []);

const baseExtensions = base.bundle.fileAssociations.flatMap(({ ext }) => ext);
assert.deepEqual([...baseExtensions].sort(), ["htm", "html", "markdown", "md"]);
assert.equal(effectiveDev.identifier, "com.hayley.nutbook.dev");
assert.equal(effectiveDev.productName, "NUTBOOK Dev");
assert.equal(effectiveDev.app.windows[0].title, "NUTBOOK Dev");
assert.deepEqual(effectiveDev.bundle.fileAssociations, []);
assert.ok(
  effectiveDev.bundle.fileAssociations.every(({ ext = [] }) =>
    ext.every((value) => !["md", "markdown", "html", "htm"].includes(value))),
  "debug config must not retain release file associations",
);

const packageJson = readJson(PACKAGE_PATH);
assert.equal(
  packageJson.scripts?.dev,
  "cargo tauri dev --config src-tauri/tauri.dev.conf.json",
  "npm run dev must invoke the tracked debug config override",
);

const defaultApps = readFileSync(DEFAULT_APPS_PATH, "utf8");
const setDefaultStart = defaultApps.indexOf("pub async fn set_default_app(");
const setDefaultEnd = defaultApps.indexOf("\n}\n\n/// 按真实 Markdown 探针", setDefaultStart);
assert.ok(setDefaultStart >= 0 && setDefaultEnd > setDefaultStart, "set_default_app command must remain discoverable");
const setDefaultBody = defaultApps.slice(setDefaultStart, setDefaultEnd);
const guardStart = setDefaultBody.indexOf("default_app_mutation_allowed()");
assert.ok(guardStart >= 0, "debug builds must guard default-app mutation at the command boundary");
assert.ok(
  guardStart < setDefaultBody.indexOf("set_default_html_viewer_handler")
    && guardStart < setDefaultBody.indexOf("set_default_app_macos"),
  "debug default-app guard must run before every platform setter",
);

console.log("Tauri debug config merge and default-app guard contract passed.");
