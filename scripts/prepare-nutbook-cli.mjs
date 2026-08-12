import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const manifest = "src-tauri/Cargo.toml";
const rustc = execFileSync("rustc", ["-vV"], { encoding: "utf8" });
const target = /^host: (.+)$/m.exec(rustc)?.[1];
if (!target) throw new Error("could not determine the Rust target triple");

execFileSync("cargo", ["build", "--release", "--manifest-path", manifest, "--bin", "nutbook"], {
  stdio: "inherit"
});

const extension = target.includes("windows") ? ".exe" : "";
const source = join("src-tauri", "target", "release", `nutbook${extension}`);
const destination = join("src-tauri", "generated-resources", "nutbook-cli", `nutbook${extension}`);
mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log(`prepared bundled Nutbook CLI: ${destination}`);
