import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const root = fileURLToPath(new URL("../integrations/nbskill", import.meta.url));
const files = [];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`nbskill package cannot contain symlinks: ${path}`);
    if (entry.isDirectory()) visit(path);
    else if (entry.isFile() && entry.name !== "PACKAGE-MANIFEST.json") {
      const bytes = readFileSync(path);
      files.push({ path: relative(root, path).replaceAll("\\", "/"), sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
    }
  }
}
visit(root);
const manifest = { package: "nbskill", version: readFileSync(join(root, "VERSION"), "utf8").trim(), files };
writeFileSync(join(root, "PACKAGE-MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`nbskill package manifest: ${files.length} files`);
