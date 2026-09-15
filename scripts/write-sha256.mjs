import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath || process.argv.length !== 4) {
  throw new Error("usage: node scripts/write-sha256.mjs <input-path> <output-path>");
}

const digest = createHash("sha256").update(readFileSync(inputPath)).digest("hex");
writeFileSync(outputPath, `${digest}\n`, "utf8");
