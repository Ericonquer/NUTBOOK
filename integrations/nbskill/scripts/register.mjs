#!/usr/bin/env node
import { entryFromOptions, parseArgs, readManifest, resolveProjectRoot, upsertActiveEntry, validateEntryHtmlContract, withManifestLock, writeManifestAtomic } from "./manifest-lib.mjs";

const usage = "Usage: register.mjs --project-root <path> --id <stable-id> --path <relative.md|html> --skill <name> --kind <document|report|presentation|interactive> [--related <path:role>]";

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
  } else {
    const root = resolveProjectRoot(options["project-root"] || "");
    const entry = entryFromOptions(options);
    await withManifestLock(root, async () => {
      validateEntryHtmlContract(entry, root);
      const manifest = upsertActiveEntry(readManifest(root), entry);
      writeManifestAtomic(root, manifest);
    });

  }
} catch (error) {
  console.error(`nbskill registration failed: ${error.message}`);
  process.exitCode = 1;
}
