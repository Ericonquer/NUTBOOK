#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { parseArgs, readManifest, required, resolveProjectRoot, validateManifest, validateRelocationPath, withManifestLock, writeManifestAtomic } from "./manifest-lib.mjs";

const usage = "Usage: relocate.mjs --project-root <path> --moves <json-file> [--dry-run]";

try {
  const options = parseArgs(process.argv.slice(2));
  for (const key of Object.keys(options)) {
    if (!["project-root", "moves", "dry-run", "help"].includes(key)) throw new Error(`unknown option: --${key}`);
  }
  if (options.help) {
    console.log(usage);
  } else {
    const root = resolveProjectRoot(required(options, "project-root"));
    const moves = JSON.parse(readFileSync(required(options, "moves"), "utf8"));
    if (!Array.isArray(moves) || !moves.length) throw new Error("moves must be a non-empty array of {from, to} paths");
    const mappings = new Map();
    const destinations = new Set();
    for (const move of moves) {
      if (!move || Object.keys(move).sort().join(",") !== "from,to" || typeof move.from !== "string" || typeof move.to !== "string" || !move.from || !move.to || move.from === move.to) throw new Error("each move must contain distinct non-empty from/to paths");
      if (mappings.has(move.from) || destinations.has(move.to)) throw new Error("duplicate move source or destination");
      mappings.set(move.from, move.to);
      destinations.add(move.to);
    }
    if ([...destinations].some(path => mappings.has(path))) throw new Error("chained or cyclic moves are not supported");
    await withManifestLock(root, async () => {
      for (const [from, to] of mappings) {
        validateRelocationPath(root, from, true);
        validateRelocationPath(root, to);
      }
      // Only explicitly mapped old references may be missing. Syntax and
      // existing-ancestor containment still apply, including to retired paths.
      const manifest = readManifest(root, { relocatingPaths: new Set(mappings.keys()) });
      const references = new Set(manifest.entries.flatMap(entry => [entry.path, ...(entry.relatedFiles || []).map(file => file.path)]));
      for (const [from, to] of mappings) {
        if (!references.has(from) && !references.has(to)) throw new Error(`move source is not referenced: ${from}`);
      }
      const changedEntries = [];
      for (const entry of manifest.entries) {
        let changed = false;
        if (mappings.has(entry.path)) {
          const destination = mappings.get(entry.path);
          if (extname(entry.path).toLowerCase() !== extname(destination).toLowerCase()) throw new Error("primary relocation must preserve the file extension");
          entry.path = destination;
          changed = true;
        }
        for (const file of entry.relatedFiles || []) {
          if (mappings.has(file.path)) {
            file.path = mappings.get(file.path);
            changed = true;
          }
        }
        if (changed || destinations.has(entry.path) || entry.relatedFiles?.some(file => destinations.has(file.path))) changedEntries.push(entry);
      }
      // Relocation changes references only, not content or edit capabilities.
      // Legacy HTML compatibility remains a separate validate.mjs diagnostic;
      // new/replacement content still uses strict register/supersede validation.
      validateManifest(manifest, root);
      if (!options["dry-run"]) writeManifestAtomic(root, manifest);
      console.log(`${options["dry-run"] ? "validated" : "relocated"} ${changedEntries.length} entries`);
    });
  }
} catch (error) {
  console.error(`nbskill relocation failed: ${error.message}`);
  process.exitCode = 1;
}
