// Windows path contract for external document save-as history resources (W04).
//
// Original bug: the host derived the source directory with
// `path.split("/").slice(0, -1).join("/")`. Under a Windows path there is no
// "/" separator, so the directory came out empty and the撤销 history resource
// list was dropped -> the whole跨目录另存 failed and the session was kept.
//
// Second round (W02-R1): turning a reference into an OS path in the frontend is
// the same class of mistake — `assets/report%23.png` may name a literal file OR
// (`#`) a decoded one. Only the backend, which can look at the disk, may decide.
// So the frontend now forwards raw references and the backend resolves them.
//
// This test runs the REAL production functions with Windows path shapes. Real
// cross-directory save-as on Windows still needs a native run.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync("dist/index.html", "utf8");
const externalRs = readFileSync("src-tauri/src/core/external_open.rs", "utf8");

const IDENTITY_START = "// >>> windows-path-identity";
const IDENTITY_END = "// <<< windows-path-identity";

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.ok(startIndex >= 0, `missing marker ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.ok(endIndex > startIndex, `missing marker ${end}`);
  return source.slice(startIndex, endIndex + end.length);
}

function sliceFunction(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const end = source.indexOf(`function ${nextName}(`, start);
  assert.ok(end > start, `missing function ${nextName}`);
  return source.slice(start, end);
}

const identityBlock = sliceBetween(indexHtml, IDENTITY_START, IDENTITY_END);

function loadApi(appState) {
  const region = sliceFunction(indexHtml, "extractExternalRelativeImageRefs", "collectExternalHistoryResourcePaths")
    + sliceFunction(indexHtml, "collectExternalHistoryResourcePaths", "externalSuggestedCopyName");
  return new Function(
    "appState",
    `${identityBlock}\n${region}\nreturn { collectExternalHistoryResourcePaths, extractExternalRelativeImageRefs, pathOsParentDirectory, pathOsJoin };`
  )(appState);
}

const api = loadApi({ activeMarkdownEditorTabId: 1, activeMarkdownEditor: null });

// --- path helpers -----------------------------------------------------------
assert.equal(api.pathOsParentDirectory("/library/docs/note.md"), "/library/docs");
assert.equal(api.pathOsParentDirectory("\\\\?\\C:\\Users\\demo\\文档\\note.md"), "\\\\?\\C:\\Users\\demo\\文档");
assert.equal(api.pathOsParentDirectory("C:\\Users\\demo\\文档\\note.md"), "C:\\Users\\demo\\文档");
assert.equal(api.pathOsParentDirectory("C:/Users/demo/文档/note.md"), "C:/Users/demo/文档");
assert.equal(api.pathOsParentDirectory("\\\\server\\share\\docs\\note.md"), "\\\\server\\share\\docs");
assert.equal(api.pathOsParentDirectory("C:\\note.md"), "C:\\", "a drive root parent must stay an absolute directory");
assert.equal(api.pathOsParentDirectory(""), "");

assert.equal(api.pathOsJoin("/library/docs", "assets/x.png"), "/library/docs/assets/x.png");
assert.equal(
  api.pathOsJoin("\\\\?\\C:\\Users\\demo\\文档", "assets/x.png"),
  "\\\\?\\C:\\Users\\demo\\文档\\assets\\x.png",
  "verbatim paths do not accept forward slashes, so the join must keep the base separator"
);
assert.equal(api.pathOsJoin("", "assets/x.png"), "", "a missing base directory must not fabricate a path");

// --- root directories must stay roots (W04-R2) ------------------------------
{
  assert.equal(api.pathOsParentDirectory("/note.md"), "/", "the POSIX root is a legal parent directory");
  assert.equal(api.pathOsJoin("/", "assets/x.png"), "/assets/x.png", "the POSIX root must not collapse into an empty path");
  assert.equal(api.pathOsJoin("C:\\", "assets/x.png"), "C:\\assets\\x.png", "a drive root must stay joinable");
  assert.equal(
    api.pathOsJoin("\\\\?\\C:\\", "assets/x.png"),
    "\\\\?\\C:\\assets\\x.png",
    "a verbatim drive root must stay joinable"
  );
}

// --- W02-R1: the frontend must not decide what a reference means ------------
{
  const tab = {
    id: 7,
    external: {
      path: "/library/docs/note.md",
      everReferencedResources: new Set(["assets/report%20one.png"]),
      insertedResources: new Set()
    },
    preview: { raw: "![a](assets/report%231.png)" },
    markdownBaseline: "",
    draft: ""
  };
  const forwarded = api.collectExternalHistoryResourcePaths(tab, "![a](assets/report%231.png)");
  assert.deepEqual(
    [...forwarded].sort(),
    ["assets/report%20one.png", "assets/report%231.png"],
    "history entries and body references are forwarded verbatim; the backend decides what they name"
  );
  assert.ok(
    forwarded.every((value) => value.includes("%")),
    "no entry may be decoded on the way out"
  );
}

// Verbatim references survive for every Windows path shape (no "/" splitting).
for (const tabPath of [
  "/library/docs/note.md",
  "\\\\?\\C:\\Users\\demo\\文档\\验收 #100%\\note.md",
  "C:\\Users\\demo\\文档\\note.md",
  "\\\\server\\share\\docs\\note.md"
]) {
  const tab = {
    id: 2,
    external: { path: tabPath, everReferencedResources: new Set(["assets/x.png"]), insertedResources: new Set() },
    preview: { raw: "" },
    markdownBaseline: "",
    draft: ""
  };
  assert.deepEqual(
    api.collectExternalHistoryResourcePaths(tab, ""),
    ["assets/x.png"],
    `${tabPath}: references must be forwarded without any path derivation`
  );
}

// --- inserted resources stay absolute OS paths ------------------------------
{
  const inserted = "\\\\?\\C:\\Users\\demo\\文档\\assets\\inserted.png";
  const tab = {
    id: 3,
    external: {
      path: "\\\\?\\C:\\Users\\demo\\文档\\note.md",
      everReferencedResources: new Set(),
      insertedResources: new Set([inserted])
    },
    preview: { raw: "" },
    markdownBaseline: "",
    draft: ""
  };
  assert.deepEqual(api.collectExternalHistoryResourcePaths(tab, ""), [inserted]);
}

// --- asset insert / paste must take the backend's real assetPath ------------
for (const [name, next] of [
  ["insertMarkdownImageAssetForTab", "pasteMarkdownImageAssetForTab"],
  ["pasteMarkdownImageAssetForTab", "insertMarkdownCoverAssetForTab"]
]) {
  const body = sliceFunction(indexHtml, name, next);
  assert.doesNotMatch(
    body,
    /\.split\("\/"\)\.slice\(0, -1\)/,
    `${name} must not derive a parent directory by splitting on "/"`
  );
  assert.doesNotMatch(
    body,
    /historyResourcePathFor\(/,
    `${name} must not turn a reference back into a path; the backend already returns the real one`
  );
  assert.match(
    body,
    /assetPath \?\? result\?\.asset_path/,
    `${name} must register the backend's assetPath`
  );
}

// --- backend resolves references against the disk, not against a prefix -----
assert.match(
  externalRs,
  /resolve_ref_on_disk\(&raw, original_dir\)/,
  "history references must be resolved by the disk-fact resolver"
);
assert.match(
  externalRs,
  /if raw_path\.is_absolute\(\)/,
  "absolute history paths and raw references must take different branches"
);
assert.match(
  externalRs,
  /RefResolution::Ambiguous \{[\s\S]{0,200}?AppError::AmbiguousImageReference/,
  "an ambiguous history reference must fail explicitly instead of migrating the wrong file"
);

console.log("Windows external save-as history resource checks passed");
