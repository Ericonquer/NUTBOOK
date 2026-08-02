# WorkBuddy current local scope profile

> Collected: 2026-07-30; reverified: 2026-08-01
>
> Verified local producers: WorkBuddy Desktop `5.3.5`, `5.3.8`
>
> Bundle identifier: `com.workbuddy.workbuddy`
>
> Adapter profile: `workbuddy-local-5.3`

## Status

This document records the local task-directory layout observed on this
machine. It is not a claim that WorkBuddy exposes a stable public storage API.
Unknown versions or layouts must fail closed.

On 2026-08-01 the installed application had upgraded to `5.3.8`. The bundle
identifier, trusted root, direct date-container convention, and the task-folder
shape below were reverified. Product verification on 2026-08-01 clarified that
the date directory is only a container: its direct child folders are the real
task scopes, except for WorkBuddy's internal `.workbuddy` folder. The adapter
therefore accepts the exact observed versions `5.3.5` and `5.3.8`; it does not
assume that every `5.3.x` release is compatible.

The installed application was verified from
`/Applications/WorkBuddy.app/Contents/Info.plist`. The observed user task root
is `/Users/<user>/Workbuddy`.

## Trusted root

The adapter may inspect a WorkBuddy task root only when it comes from one of:

1. a version-pinned WorkBuddy setting or metadata record;
2. the verified local default `$HOME/Workbuddy`;
3. a directory explicitly selected by the user.

The canonical root and its authorization source must be retained. The adapter
must not search the whole home directory for date-shaped folders.

## Date containers and task scopes

A direct child of the trusted root is considered a WorkBuddy date container
only when its name strictly matches:

```text
YYYY-MM-DD-HH-MM-SS
```

Observed examples include:

```text
2026-06-26-22-31-57/             # date container, not shown as a task
├── .workbuddy/memory/            # excluded internal state
└── outputs/                      # task scope; displayed as "outputs"

2026-07-17-10-41-23/             # date container, not shown as a task
├── .workbuddy/memory/            # excluded internal state
├── codexquota_feasibility.md     # not a scope because it is not a folder
└── codexquota/                   # task scope; displayed as "codexquota"
```

Each direct child folder other than `.workbuddy` is a task scope. Its folder
name is the task display name, and the folder itself is the bounded scan root.
`outputs`, `output`, `result`, or any other name has no special meaning: it is
accepted only because it is a direct child folder, not because of the word it
contains. Files placed directly in the date container are not separate scopes.

Directories such as `Claw/` or malformed date names beside valid tasks are not
task scopes.

## Project relationship

If a version-pinned WorkBuddy record provides a project root that can be
canonicalized and verified, the scope attaches WorkBuddy to that project.
Otherwise each eligible task folder below a date container remains a
`scope_kind = "task"` source.

The minimal Task 1 adapter is allowed to report only:

- trusted WorkBuddy installation/profile;
- canonical task root;
- scope kind;
- date-container timestamp and task-folder name;
- a verified project root when one exists;
- partial/permission errors.

It must not claim file authorship or final delivery. File-level facts remain a
later adapter capability.

## Scan boundary

The first implementation:

- scans only direct children of the trusted root to find date containers, then
  only their direct child folders to discover task scopes;
- does not follow directory symlinks;
- excludes `.workbuddy` and ignores direct files in the date container;
- uses the task folder itself as the task boundary and display name;
- applies explicit depth, entry-count, time, and cancellation limits before
  inspecting files inside a selected task;
- reports partial results without marking unseen files missing.

## Fixture derivation and privacy

The checked-in fixture under
`src-tauri/tests/fixtures/agent-artifact-discovery/provider-records/workbuddy/`
was derived from the directory shapes of two real local tasks:

- `/Users/<user>/Workbuddy/2026-06-26-22-31-57`
- `/Users/<user>/Workbuddy/2026-07-17-10-41-23`

Only directory shapes, product version, and generic file roles were retained.
File bodies, memory content, user task content, generated article names, and
personal paths were not copied.
