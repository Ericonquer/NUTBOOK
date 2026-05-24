# Third Party Licenses

NUTBOOK includes open source software developed by third parties.

This lightweight notice lists the direct JavaScript and Rust dependencies used by
the project at the time this file was created. JavaScript dependency licenses
were checked from `package-lock.json`; direct Rust dependency versions were
checked from `src-tauri/Cargo.lock` and license metadata from local crate
manifests where available.

Before a public binary release, regenerate a complete third-party notice that
also includes all transitive dependencies.

## JavaScript Dependencies

| Package | Version | License | Source |
| --- | --- | --- | --- |
| `@milkdown/kit` | 7.21.1 | MIT | https://github.com/Milkdown/milkdown |
| `prosemirror-tables` | 1.8.5 | MIT | https://github.com/ProseMirror/prosemirror-tables |
| `vite` | 5.4.21 | MIT | https://github.com/vitejs/vite |

The JavaScript dependency tree currently uses the following license families:
MIT, BSD-2-Clause, BSD-3-Clause, ISC, and MPL-2.0 OR Apache-2.0.

## Rust Dependencies

| Crate | Version | License | Source |
| --- | --- | --- | --- |
| `notify` | 8.2.0 | CC0-1.0 | https://github.com/notify-rs/notify |
| `objc2-app-kit` | 0.3.2 | MIT | https://github.com/madsmtm/objc2 |
| `objc2-web-kit` | 0.3.2 | MIT | https://github.com/madsmtm/objc2 |
| `rfd` | 0.15.4 | MIT | https://github.com/PolyMeilex/rfd |
| `rusqlite` | 0.37.0 | MIT | https://github.com/rusqlite/rusqlite |
| `serde` | 1.0.228 | MIT OR Apache-2.0 | https://github.com/serde-rs/serde |
| `serde_json` | 1.0.149 | MIT OR Apache-2.0 | https://github.com/serde-rs/json |
| `sha2` | 0.10.9 | MIT OR Apache-2.0 | https://github.com/RustCrypto/hashes |
| `tauri` | 2.10.3 | MIT OR Apache-2.0 | https://github.com/tauri-apps/tauri |
| `tauri-build` | 2.5.6 | MIT OR Apache-2.0 | https://github.com/tauri-apps/tauri |
| `thiserror` | 1.0.69 | MIT OR Apache-2.0 | https://github.com/dtolnay/thiserror |
| `url` | 2.5.8 | MIT OR Apache-2.0 | https://github.com/servo/rust-url |

## Notes

This file is provided for attribution and release hygiene. It does not replace
the license terms of the upstream projects. For each dependency, the upstream
license remains authoritative.
