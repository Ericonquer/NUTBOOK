# Development Guide

[Back to README](../../README.md) · [中文版](./development-cn.md)

### Nutbook CLI

NUTBOOK deploys its bundled CLI into the application data directory but intentionally does not add it to `PATH`:

* macOS: `~/Library/Application Support/com.hayley.nutbook/cli/nutbook`

* Windows: `%LOCALAPPDATA%\com.hayley.nutbook\cli\nutbook.exe`

Each mutating command accepts exactly one path:

```text
nutbook add <path> [--json]
nutbook remove <path> [--json]
nutbook add-project <path> [--json]
nutbook remove-project <path> [--json]
nutbook doctor [--json]
```

`doctor` is read-only. File and folder operations support the same Markdown / HTML formats as NUTBOOK and never delete source files.

### Build from Source

For developers, testers, or anyone who wants a local build.

| Dependency   | Recommended version  | Purpose                                                                   |
| ------------ | -------------------- | ------------------------------------------------------------------------- |
| Node.js      | 22.x                 | Install frontend dependencies and build Markdown editor / frontend assets |
| npm          | Bundled with Node.js | Run frontend build scripts                                                |
| Rust / Cargo | stable               | Compile and check the Tauri backend                                       |
| Tauri CLI    | 2.x                  | Run or build the desktop app                                              |

```bash
git clone https://github.com/Ericonquer/NUTBOOK.git
cd NUTBOOK
npm ci
npm run build:frontend
cargo check --manifest-path src-tauri/Cargo.toml
```

The Markdown editor build includes a compatibility patch. Do not skip `npm run build:frontend`.


For a desktop development run, use the tracked entry point:

```bash
npm run dev
```

This invokes `cargo tauri dev` with `src-tauri/tauri.dev.conf.json`, which gives
the development app the `com.hayley.nutbook.dev` identity, the `NUTBOOK Dev`
display name, and no Markdown/HTML file associations. A bare `cargo tauri dev`
cannot be transparently rewritten by a repository package script; it reads the
release base config and can register the release identity with LaunchServices.
Use `npm run dev` whenever running the debug app.


### Refresh Feature Demos

Install local `ffmpeg` and Playwright Chromium, then run the recording scripts below. Choose `cn` or `en`; each locale uses its own interface and sample content.

```bash
node scripts/render-readme-features.mjs en export
node scripts/render-readme-features.mjs en formatting
node scripts/render-readme-features.mjs en presenter
node scripts/render-readme-features.mjs en home
node scripts/render-readme-motion.mjs en
```

Recordings use the current frontend with isolated sample data. Save, copy, and multi-window interfaces are simulated for demonstration. Actual disk persistence, system clipboard, and dual-display behavior require separate acceptance.
