// Windows child-webview creation threading contract (W01).
//
// Tauri 2 documents that on Windows `WebviewBuilder` / `WebviewWindowBuilder`
// deadlock when they are created from a synchronous command or event handler
// (wry #583): "You should use async commands and separate threads when creating
// webviews." Every production `add_child` / `WebviewWindowBuilder::new` in this
// repository is reachable from a synchronous command, which is the highest
// probability explanation for the reported blank HTML surface.
//
// What this test proves (and does not):
//   * proves the command layer that reaches a webview creation call is
//     `pub async fn`, and that no command-layer Mutex guard is held while the
//     creation call happens;
//   * does NOT prove the Windows message loop no longer blocks. That needs a
//     native Windows run of the real entries (see the plan's acceptance matrix).
//     Treat this file as a regression tripwire, not as runtime evidence.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const PREVIEW_RS = readFileSync("src-tauri/src/commands/preview.rs", "utf8");
const PRESENTATION_RS = readFileSync("src-tauri/src/commands/native_presentation.rs", "utf8");
const HTML_RUNTIME_RS = readFileSync("src-tauri/src/core/html_runtime.rs", "utf8");

// command name -> [file, source, substring that must appear inside the body]
const CREATING_COMMANDS = new Map([
  ["attach_inspector_more_overlay_command", [PREVIEW_RS, "attach_inspector_more_overlay"]],
  ["attach_settings_overlay_command", [PREVIEW_RS, "attach_settings_overlay"]],
  ["open_html_detached_window", [PREVIEW_RS, "open_html_runtime_window"]],
  ["attach_html_runtime_host_command", [PREVIEW_RS, "attach_html_runtime_host("]],
  ["attach_external_html_runtime_host_command", [PREVIEW_RS, "attach_external_html_runtime_host"]],
  ["attach_external_html_find_overlay_command", [PREVIEW_RS, "attach_html_find_overlay"]],
  ["attach_html_presentation_preview_command", [PREVIEW_RS, "attach_html_presentation_preview"]],
  ["attach_html_runtime_controls_overlay_command", [PREVIEW_RS, "attach_html_runtime_controls_overlay"]],
  ["attach_html_find_overlay_command", [PREVIEW_RS, "attach_html_find_overlay"]],
  ["attach_html_edit_toolbar_overlay_command", [PREVIEW_RS, "attach_html_edit_toolbar_overlay"]],
  ["attach_html_edit_leave_confirm_overlay_command", [PREVIEW_RS, "attach_html_edit_leave_confirm_overlay"]],
  ["attach_markdown_controls_overlay_command", [PREVIEW_RS, "attach_controls_overlay"]],
  ["recover_native_presentation", [PRESENTATION_RS, "create_audience_surface"]],
  ["start_native_presentation", [PRESENTATION_RS, "WebviewWindowBuilder::new"]],
  ["native_presentation_blackout", [PRESENTATION_RS, "add_child"]],
  ["native_presentation_live_preview", [PRESENTATION_RS, "sync_live_preview"]]
]);

function topLevelBlock(source, signatureStart) {
  const open = source.indexOf("{", signatureStart);
  assert.ok(open > signatureStart, "function body must exist");
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(signatureStart, index + 1);
    }
  }
  throw new Error("unbalanced braces");
}

// Innermost enclosing `{ ... }` of `index`. Used to decide whether a Mutex guard
// is still alive when the webview creation call happens; a guard scoped to its
// own block that closes earlier is fine.
function enclosingBlockRange(block, index) {
  const stack = [];
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (block[cursor] === "{") stack.push(cursor);
    else if (block[cursor] === "}") stack.pop();
  }
  const start = stack.length ? stack[stack.length - 1] : 0;
  let depth = 0;
  for (let cursor = start; cursor < block.length; cursor += 1) {
    if (block[cursor] === "{") depth += 1;
    else if (block[cursor] === "}") {
      depth -= 1;
      if (depth === 0) return { start, end: cursor };
    }
  }
  return { start, end: block.length };
}

function assertNoGuardHeldAt(block, label, creation) {
  const withoutComments = block.replace(/\/\/.*$/gm, "");
  const creationIndex = withoutComments.indexOf(creation);
  assert.ok(creationIndex >= 0, `${label} must still reach ${creation}`);
  const pattern = /let\s+(?:mut\s+)?(\w+)\s*(?::[^=]+)?=\s*([^;{}]*?)\.lock\(\)/g;
  for (const match of withoutComments.matchAll(pattern)) {
    if (match.index > creationIndex) continue;
    // Only a binding that directly holds the guard counts. `let x =
    // state.y.lock()?.as_ref().cloned()?;` keeps the guard as a temporary that is
    // dropped at the end of the statement.
    const guardEnd = match.index + match[0].length;
    const semi = withoutComments.indexOf(";", guardEnd);
    let tail = withoutComments.slice(guardEnd, semi === -1 ? undefined : semi).trim();
    if (tail.endsWith("?")) tail = tail.slice(0, -1).trim();
    // `.map_err(...)?` keeps the guard; anything longer derives a value from it
    // and drops the guard at the end of the statement.
    if (tail !== "") {
      const open = tail.indexOf("(");
      if (open !== ".map_err".length) continue;
      let depth = 0;
      let closesAt = -1;
      for (let cursor = open; cursor < tail.length; cursor += 1) {
        if (tail[cursor] === "(") depth += 1;
        else if (tail[cursor] === ")") {
          depth -= 1;
          if (depth === 0) {
            closesAt = cursor;
            break;
          }
        }
      }
      if (closesAt !== tail.length - 1) continue;
    }
    const binding = match[1];
    const range = enclosingBlockRange(withoutComments, match.index);
    assert.ok(
      range.end < creationIndex,
      `${label} still holds the guard \`${binding}\` (${match[2].trim()}) when it creates ${creation}`
    );
  }
}

for (const [name, [source, evidence]] of CREATING_COMMANDS) {
  const syncIndex = source.indexOf(`pub fn ${name}(`);
  const asyncIndex = source.indexOf(`pub async fn ${name}(`);
  assert.ok(
    asyncIndex >= 0,
    `${name} must be an async command: a synchronous command that creates a webview deadlocks on Windows`
  );
  assert.equal(
    syncIndex,
    -1,
    `${name} must not keep a synchronous definition next to the async one`
  );
  const block = topLevelBlock(source, asyncIndex);
  assertNoGuardHeldAt(block, name, evidence);
  assert.doesNotMatch(
    block.replace(/\/\/.*$/gm, ""),
    /\.blocking_lock\(\)|run_on_main_thread\([^)]*\)\s*\.\s*unwrap\(\)/,
    `${name} must not synchronously wait on the main thread while creating a webview`
  );
}

// The creation helpers below run on the command thread. A `let` binding that
// still holds a guard when the builder is called would re-introduce the
// main-thread wait this contract exists to remove.
const CREATING_HELPERS = [
  [HTML_RUNTIME_RS, "attach_html_runtime_host_with_script", "add_child"],
  [HTML_RUNTIME_RS, "attach_external_html_runtime_host", "add_child"],
  [HTML_RUNTIME_RS, "attach_html_presentation_preview", "add_child"],
  [HTML_RUNTIME_RS, "attach_controls_overlay", "add_child"],
  [HTML_RUNTIME_RS, "attach_html_find_overlay", "add_child"],
  [HTML_RUNTIME_RS, "attach_inspector_more_overlay", "add_child"],
  [HTML_RUNTIME_RS, "attach_html_edit_toolbar_overlay", "add_child"],
  [HTML_RUNTIME_RS, "attach_html_edit_leave_confirm_overlay", "add_child"],
  [HTML_RUNTIME_RS, "attach_settings_overlay", "add_child"],
  [HTML_RUNTIME_RS, "build_detached_runtime_window", "WebviewWindowBuilder::new"],
  [PRESENTATION_RS, "create_audience_surface", "attach_html_runtime_host_for_presentation"],
  [PRESENTATION_RS, "sync_live_preview", "add_child"]
];

for (const [source, name, creation] of CREATING_HELPERS) {
  const start = source.indexOf(`fn ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const block = topLevelBlock(source, start);
  assertNoGuardHeldAt(block, name, creation);
}

// Framework-sanctioned exception: Tauri runs the `on_new_window` closure on a
// separate thread on Windows, so `detached_new_window_handler` may keep creating
// a window. Keep the reason documented next to the code so a future reader does
// not "fix" it by adding async.
assert.match(
  HTML_RUNTIME_RS,
  /fn detached_new_window_handler<R: tauri::Runtime>\(/,
  "the detached new-window handler must stay in place"
);
assert.match(
  HTML_RUNTIME_RS,
  /on_new_window/,
  "the detached new-window handler must stay wired through on_new_window"
);

console.log("Windows child-webview threading checks passed");
