import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  outputDir: path.join(tmpdir(), "nutbook-playwright-results"),
  use: {
    viewport: { width: 1200, height: 675 },
  },
});
