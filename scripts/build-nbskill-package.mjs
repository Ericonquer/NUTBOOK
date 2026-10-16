import { createHash } from "node:crypto";
import { readdirSync, readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { validateConfig } from "../src/motion/contract.mjs";

const root = fileURLToPath(new URL("../integrations/nbskill", import.meta.url));
const bridge = readFileSync(fileURLToPath(new URL("../src-tauri/resources/export-templates/presentation-bridge.js", import.meta.url)), "utf8");
const presentationSource = readFileSync(join(root, "templates/presentation.source.html"), "utf8");
if (!presentationSource.includes("{{presentation_bridge_script}}")) throw new Error("presentation source is missing the bridge placeholder");
writeFileSync(join(root, "templates/presentation.html"), presentationSource.replace("{{presentation_bridge_script}}", bridge));
// Optional motion output starts static; the ordinary presentation stays unchanged.
let motionSource = presentationSource
  .replace('<html lang="zh-CN"', '<html lang="zh-CN" data-nutbook-motion-contract="nutbook-motion/v1"')
  .replace(/^    \.slide\.active \.rise .*\n/m, '')
  .replace(/^    @keyframes rise .*\n/m, '')
  .replaceAll('copy rise', 'copy')
  .replace('{{presentation_bridge_script}}', bridge);
const config = { contract: 'nutbook-motion/v1', pages: [...presentationSource.matchAll(/<section\b[^>]*data-nutbook-page-id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)].map(([, id, body]) => ({
  id,
  capabilities: { containsVideo: false, containsEmbeddedFrame: false, supportsDomTransition: true, supportsFilterTransition: true, mediaTargetIds: [], embeddedTargetIds: [] },
  targets: [...body.matchAll(/data-id="([^"]+)" data-editable="(text|image)"/g)].map(([, id, kind]) => ({ id, kind })),
  actions: [], background: null, transition: null,
})) };
validateConfig(config);
const motionRuntime = readFileSync(fileURLToPath(new URL('../src-tauri/resources/export-templates/motion-runtime.js', import.meta.url)), 'utf8');
if (/<\/script/i.test(motionRuntime)) throw new Error('motion runtime is unsafe to inline');
motionSource = motionSource.replace('</body>', `<script type="application/json" id="nutbook-motion-config" data-id="nutbook-motion-config">${JSON.stringify(config)}</script>\n<script>\n${motionRuntime}\n</script>\n</body>`);
if (Buffer.byteLength(motionRuntime) > 2*1024*1024 || Buffer.byteLength(motionSource) > 3*1024*1024) throw new Error('Motion template exceeds its runtime/HTML budget');
if (Buffer.byteLength(motionSource) + readFileSync(join(root, 'templates/presentation-mark.svg')).length > 10*1024*1024) throw new Error('Motion acceptance package exceeds 10 MiB');
writeFileSync(join(root, 'templates/motion-presentation.html'), motionSource);
mkdirSync(join(root, 'scripts/motion'), { recursive: true });
for (const [source, target] of [['schema.json', 'references/motion-schema.json'], ['registry.json', 'scripts/motion/registry.json'], ['contract.mjs', 'scripts/motion/contract.mjs']]) {
  copyFileSync(fileURLToPath(new URL(`../src/motion/${source}`, import.meta.url)), join(root, target));
}
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
