// Windows desktop entry contract (W11, main program only).
//
// Without `windows_subsystem = "windows"` the release GUI binary links against
// the console subsystem, so the installed app always shows a console window.
// Background child processes and CLI entry points are covered by the stage 2
// part of W11 and are intentionally NOT asserted here.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const MAIN_RS = readFileSync("src-tauri/src/main.rs", "utf8");

const subsystemAttribute = MAIN_RS.match(
  /#!\[cfg_attr\(([^,\]]+),\s*windows_subsystem\s*=\s*"windows"\)\]/
);
assert.ok(subsystemAttribute, "src-tauri/src/main.rs must declare the Windows GUI subsystem");
assert.equal(
  subsystemAttribute[1].trim(),
  "not(debug_assertions)",
  "the GUI subsystem must only apply to release builds so `cargo run` keeps its console"
);

const firstItem = MAIN_RS.indexOf("\nuse ");
const attributeIndex = MAIN_RS.indexOf(subsystemAttribute[0]);
assert.ok(
  attributeIndex >= 0 && (firstItem === -1 || attributeIndex < firstItem),
  "the crate-level attribute must appear before the first item"
);

// The separate CLI binary must keep console semantics: it is a different entry
// point and must not inherit the GUI subsystem attribute.
const CLI_MAIN = readFileSync("src-tauri/src/bin/nutbook.rs", "utf8");
assert.doesNotMatch(
  CLI_MAIN,
  /windows_subsystem\s*=\s*"windows"/,
  "the CLI binary must not be turned into a hidden GUI process"
);

console.log("Windows desktop entry checks passed");

// Build outputs must remain distinct on case-insensitive Windows/macOS volumes.
const manifest=readFileSync('src-tauri/Cargo.toml','utf8');
const bins=[...manifest.matchAll(/\[\[bin\]\]\s+name\s*=\s*"([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(bins.map(name=>name.toLowerCase())).size,bins.length,'GUI and CLI targets must never differ only in case');
assert(bins.includes('nutbook-cli-bin'));
const prepare=readFileSync('scripts/prepare-nutbook-cli.mjs','utf8');
assert(prepare.includes('"--bin", "nutbook-cli-bin"'));
assert(prepare.includes('`nutbook-cli-bin${extension}`'));

const config=JSON.parse(readFileSync('src-tauri/tauri.conf.json','utf8'));
const roots=Object.values(config.bundle.resources).map(path=>path.replace(/\/$/,'').split('/')[0].toLowerCase());
for(const name of bins)assert(!roots.includes(name.toLowerCase()),'binary must not collide with Tauri resource directory: '+name);
