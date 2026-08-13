import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync("src-tauri/src/main.rs", "utf8");
const index = readFileSync("dist/index.html", "utf8");

assert.match(
  main,
  /RunEvent::WindowEvent\s*\{[\s\S]*?WindowEvent::CloseRequested\s*\{\s*api,[\s\S]*?api\.prevent_close\(\)/,
  "closing the main window must be intercepted before HTML edits can be lost"
);
assert.match(
  main,
  /RunEvent::ExitRequested\s*\{\s*api,[\s\S]*?api\.prevent_exit\(\)/,
  "quitting the application must be intercepted before HTML edits can be lost"
);
assert.match(
  main,
  /finalize_html_edit_app_exit_command/,
  "the host must expose an explicit, one-shot completion path after the user decides"
);
assert.match(
  index,
  /__NUTBOOK_REQUEST_HTML_EDIT_APP_EXIT__\s*=/,
  "the main WebView must receive a host exit request"
);
assert.match(
  index,
  /confirmHtmlEditLeaveIfNeeded\(session\.itemId, \{ source: "app-exit" \}\)/,
  "app exit must reuse the existing HTML save/discard/keep coordinator"
);
assert.match(
  index,
  /async function confirmMarkdownAppExitIfNeeded\(\)[\s\S]*?captureActiveMarkdownDraft\(\)[\s\S]*?orderedDirtyTabs[\s\S]*?confirmMarkdownUnsavedClose\(fileName\)[\s\S]*?saveMarkdownTab\(tab, \{ renderAfter: false \}\)/,
  "app exit must capture and resolve every dirty Markdown tab before native exit"
);
assert.match(
  index,
  /let appExitRequestInFlight = false[\s\S]*?if \(appExitRequestInFlight\) return[\s\S]*?confirmAppExitIfNeeded\(\)/,
  "overlapping close and quit events must share one frontend exit coordinator"
);
assert.match(
  index,
  /invoke\("finalize_html_edit_app_exit_command"\)/,
  "only the frontend leave decision may request the final host exit"
);

console.log("HTML edit app-close guard checks passed");
