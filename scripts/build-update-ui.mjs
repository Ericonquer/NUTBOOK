import { build } from 'vite';
await build({ configFile: false, build: { emptyOutDir: false, outDir: 'dist/assets', lib: { entry: 'src/update-ui.js', name: 'NutbookUpdateUI', formats: ['iife'], fileName: () => 'update-ui.js' } } });
