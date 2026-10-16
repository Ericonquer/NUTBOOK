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
