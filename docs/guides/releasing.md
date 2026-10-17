# Release Process

[Back to README](../../README.md) · [中文版](./releasing-cn.md)

Before opening a PR or pushing a release tag, switch to Node 22 (`nvm use` after
installing the version declared in `.nvmrc`) and run this once per clone:

```bash
npm run setup-hooks
```

The installed pre-push hook rejects a dirty checkout, checks the exact outgoing
range for whitespace errors, then runs `npm run check:push`: a clean dependency
install, Chromium runtime tests, frontend/i18n checks, regressions, and Rust
checks/tests. Run that command directly when you want the same local gate without
pushing. It cannot emulate the native Windows package-input path; that is the
explicit release preflight below.

Release builds are intentionally manual so creating a tag does not silently spend
packaging minutes. After the PR is merged, run **Release preflight** from the
intended `main` revision. It performs the native Windows `beforeBuild` CLI-resource
check and a native macOS release compile. Only then create an immutable `vX.Y.Z`
tag pointing at that exact commit and manually run **Build desktop app** with the
tag. The build rejects tags without that exact successful preflight, uses cached
dependencies and compile intermediates, clears cached installers before packaging,
and uploads through one final release-writer job. Protect `v*` tags from force
updates in repository settings.

## Required Release Notes Format

Follow the bilingual navigation used in 1.3.0. Automatically generated change lists are input, not the final release body.

1. Start with `# NUTBOOK X.Y.Z`, followed by `[中文](#user-content-zh) | [English](#user-content-en)`.
2. Put Chinese first: a standalone `<a id="zh"></a>`, `## 中文`, `### 新增功能`, and `### 安装说明`.
3. Separate languages with `---`; use `<a id="en"></a>`, `## English`, `### What's new`, and `### Installation` for English.
4. Each language includes feature changes, all three installer names, SHA-256 and first-launch guidance, and the previous-to-current comparison link.
5. Preserve the historical `user-content-` navigation prefix. Read back the remote draft and check navigation and anchors, section order, version, asset names, and links.
6. Do not highlight the license when it has not changed, and never replace the existing declaration from a template. Keep the release as a draft until formatting and installer checks are complete; uploading assets is not publication.
