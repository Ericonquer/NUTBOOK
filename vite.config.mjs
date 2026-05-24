import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "dist/assets",
    lib: {
      entry: "src/markdown-editor.js",
      name: "NutbookMarkdownEditor",
      formats: ["es"],
      fileName: () => "markdown-editor.js"
    },
    rollupOptions: {
      output: {
        assetFileNames: "markdown-editor.[ext]"
      }
    }
  }
});
