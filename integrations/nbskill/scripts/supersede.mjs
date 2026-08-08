#!/usr/bin/env node
import { entryFromOptions, parseArgs, readManifestForSupersede, required, resolveProjectRoot, validateEntryHtmlContract, withManifestLock, writeManifestAtomic } from "./manifest-lib.mjs";

const usage = "Usage: supersede.mjs --project-root <path> --old-id <id> --new-id <id> --path <relative.md|html> --skill <name> --kind <kind>";

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
  } else {
    const root = resolveProjectRoot(options["project-root"] || "");
    const oldId = required(options, "old-id");
    const replacement = entryFromOptions(options, "new-id");
    if (oldId === replacement.id) throw new Error("--old-id and --new-id must differ");
    await withManifestLock(root, async () => {
      validateEntryHtmlContract(replacement, root);
      // Read legacy entries structurally so an obsolete active HTML artifact can
      // be atomically retired. The final write still performs full validation.
      const manifest = readManifestForSupersede(root);
      const oldEntry = manifest.entries.find((entry) => entry.id === oldId);
      const existingReplacement = manifest.entries.find((entry) => entry.id === replacement.id);
      if (!oldEntry) throw new Error(`entry not found: ${oldId}`);
      if (oldEntry.state === "superseded" && oldEntry.supersededBy === replacement.id && existingReplacement?.state === "active" && existingReplacement.path === replacement.path) return;
      if (oldEntry.state !== "active") throw new Error(`entry is not active: ${oldId}`);
      if (existingReplacement) throw new Error(`replacement id already exists: ${replacement.id}`);
      oldEntry.state = "superseded";
      oldEntry.supersededBy = replacement.id;
      manifest.entries.push(replacement);
      writeManifestAtomic(root, manifest);
    });
    console.log(`superseded ${oldId} with ${replacement.id}`);
  }
} catch (error) {
  console.error(`nbskill supersede failed: ${error.message}`);
  process.exitCode = 1;
}
