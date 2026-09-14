---
name: nbskill
description: Automatically register every user-facing Markdown and fully editable HTML deliverable for Nutbook through the project-local .agent-outputs manifest. Use whenever an Agent creates, updates, or supersedes a primary .md or .html deliverable, even when the user does not mention Nutbook or explicitly ask to register it.
---

# nbskill

Use nbskill to describe user-facing Markdown and HTML artifacts without turning
an Agent project into a general file browser.

## Required workflow

- Read [references/agent-output-manifest-v1.md](references/agent-output-manifest-v1.md)
  before registering or superseding an artifact.
- Read [references/nutbook-html-edit-contract-v1.md](references/nutbook-html-edit-contract-v1.md)
  before creating, updating, registering, or superseding any HTML artifact.
- Treat registration as part of completing a user-facing Markdown or HTML
  deliverable. Before the final response, register every primary `.md` and
  `.html` file created or updated for the user; do not wait for a separate
  request to add it to Nutbook. If a task produces multiple primary files,
  register each one as its own entry. Coalesce intermediate edits: register once
  per primary file at the end of the turn, not after every patch.
- Set `--skill` to the actual content-producing or transformation Skill used
  for that artifact, such as `humanizer-zh`. nbskill is the registration
  transport, not the producing Skill, so do not record `nbskill` merely because
  its registrar wrote the manifest. When several Skills contributed, use the
  primary user-requested Skill as `skill.name` and describe additional context
  outside the manifest until the schema supports multiple Skill sources.
- Confirm the project root with the user or from the active Agent project. Never
  guess a broader parent directory and never scan the home directory.
- In a WorkBuddy dated workspace that directly contains `.workbuddy`, use that
  dated workspace as the project root. Keep its single manifest there whether
  artifacts live at the workspace root or in a child such as `output/`; do not
  create separate manifests for those child folders.
- Register only a primary Markdown or HTML artifact. Keep scripts, styles,
  images, fonts, attachments, and data as `relatedFiles`.
- Keep all paths relative to the confirmed project root and inside that root
  after symlink resolution.
- Make every HTML artifact registered by nbskill natively editable. Cover every
  user-visible text field and image with stable, unique supported editable
  targets before registration. Layout, CSS, and scripts are not editable
  fields. A partial marker is a validation failure, not partial success.
- Preserve authored layout with the smallest semantic target. Put the target on
  the heading, paragraph, label, caption, table cell, or card-copy element
  itself. Never wrap a section, card grid, table, header, footer, or other
  layout container in one rich-text target just to satisfy validation.
- Use `rich-text` only for markup Nutbook can persist. `short` permits only
  `br`, `strong`, `em`, and attribute-free `code`; `content` permits only the
  canonical prose tags and alignment listed in the HTML contract. Split code
  labels, styled spans, and other presentation-owned markup into separate
  plain-text targets when they need classes, styles, IDs, or other attributes.
- The registrar automatically requires `editContract: "nutbook-html/v1"` and
  `savePolicy: "managed-source"` for HTML. Never downgrade an nbskill HTML
  artifact to `copy`; use Nutbook's ordinary discovery path instead if the
  source cannot satisfy the complete edit contract.
- Use the bundled scripts as the only manifest writers. Do not hand-edit
  `.agent-outputs/manifest.json`, even for a one-line change.
- Registering an artifact never calls Nutbook automatically. Invoke the stable,
  absolute Nutbook CLI only when the user explicitly asks to operate Nutbook.
  Use exactly one of `add`, `remove`, `add-project`, or `remove-project`, pass
  one path and `--json`, and never read stdin. If an Agent identity is supplied,
  set `NUTBOOK_CALLER_AGENT` only as scope-only attribution; it must not claim
  delivery events or cause automatic project connection. Ordinary automatic
  registration remains manifest-only.
- Do not modify PATH. On macOS the stable CLI is
  `/Users/<user>/Library/Application Support/com.hayley.nutbook/cli/nutbook`
  (normally written as `~/Library/Application Support/com.hayley.nutbook/cli/nutbook`);
  on Windows it is `%LOCALAPPDATA%\\com.hayley.nutbook\\cli\\nutbook.exe`.
  Verify that exact executable with `--version` before an explicitly requested
  Nutbook operation.
- `nutbook doctor [--json]` is a read-only health check. It must never repair,
  start, wake, or otherwise mutate Nutbook.

## Register an artifact

Run from this skill directory, passing paths as separate shell arguments:

```bash
node scripts/register.mjs \
  --project-root /absolute/confirmed/project \
  --id stable-entry-id \
  --path output/report.md \
  --skill producing-skill-name \
  --kind report
```

Optional flags are `--skill-version`, `--title`, `--generated-at`, and repeatable
`--related relative/path:asset|data|attachment`.

For HTML, author the root marker and complete editable field coverage first.
The registrar rejects unmarked visible text, uneditable images, duplicate or
nested targets, unsupported target types, unsafe rich-text descendants, and
markup or attributes Nutbook would remove during editing.

Manifest structure and current HTML-edit compatibility are separate checks. A
legacy active HTML entry that needs repair must never make the manifest
structurally unreadable or force manual JSON editing. New or updated HTML is
validated strictly before it is written. Repair the reported source in place,
or use `supersede.mjs` to retire it with a valid replacement.

Keep an ID stable when updating metadata for the same path. When a new file
replaces an old deliverable, use the supersede workflow instead of recycling
the old ID.

An existing user-facing file that was accidentally delivered without an entry
does not need to be moved or recreated. Register its current project-relative
path with `register.mjs`, then validate normally.

## Supersede an artifact

```bash
node scripts/supersede.mjs \
  --project-root /absolute/confirmed/project \
  --old-id stable-entry-id \
  --new-id stable-entry-id-v2 \
  --path output/report-v2.md \
  --skill producing-skill-name \
  --kind report
```

The command creates the active replacement and marks the old entry
`superseded` in one locked atomic write. It can structurally read and retire a
legacy active HTML entry that no longer passes the current HTML validator. The
replacement receives strict validation before the atomic structural write.
Never repair that migration case by editing JSON.

## Validate quietly

After the final registration batch, run once:

```bash
node scripts/validate.mjs --project-root /absolute/confirmed/project
```

Successful registration is silent: do not announce registration, IDs, paths,
counts, or validation results in commentary or the final answer unless asked.
Report only failures that affect delivery or need user action. Keep the final
answer focused on the requested artifact. If an older active
HTML entry is incompatible, the validator lists it by ID and path without
making the rest of the manifest unreadable. Fix that source or use the scripted
supersede path; do not replace the manifest manually or weaken validation.

Use `node scripts/validate.mjs --self-test` only to verify the installed package
runtime; it writes solely to an operating-system temporary directory.
