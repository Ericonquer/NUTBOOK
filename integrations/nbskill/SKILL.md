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
- For `kind: presentation` HTML, read [references/presentation-html-v1.md](references/presentation-html-v1.md)
  and [references/motion-html-v1.md](references/motion-html-v1.md), then start
  from the bundled [standalone template](templates/presentation.html).
  New presentations support NUTBOOK's motion center by default, with empty
  actions, backgrounds and transitions. Supporting motion editing does not
  authorize choosing or playing effects for the user.
  Default navigation is keyboard-based with a quiet page count; do not copy
  floating previous/next buttons into every deck.
  Run the independent browser behavior check described there before delivery.
- Ordinary non-presentation HTML keeps the HTML edit contract. Preserve an
  existing document's IDs, capabilities and chosen effects during edits; do not
  retrofit or reset it just to register it. Add motion support to an older deck
  when the user requests that adaptation, preserving its content and design.
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
For `--kind presentation`, it also rejects missing or duplicate page IDs,
invalid notes, absent intent marker, and absent bridge declarations. This is
static validation only; a real browser and Nutbook still verify behavior.

Manifest structure and current HTML-edit compatibility are separate checks. A
legacy active HTML entry that needs repair must never make the manifest
structurally unreadable or force manual JSON editing. New or updated HTML is
validated strictly before it is written. Historical missing paths and legacy
HTML issues do not block registering the current delivery or require repair
during unrelated content work.

Keep an ID stable when updating metadata for the same path. When a new file
replaces an old deliverable, use the supersede workflow instead of recycling
the old ID.

An existing user-facing file that was accidentally delivered without an entry
does not need to be moved or recreated. Register its current project-relative
path with `register.mjs`; the command validates that delivery before writing.

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

## Complete quietly

Register and supersede validate the current primary file and its attachments
before writing. Historical missing primary/related paths are preserved without
warnings and do not block the current delivery. Unsafe paths, symlink escapes,
invalid manifest structure, identity conflicts and invalid current files still
fail validation.

Do not run project-wide `validate.mjs` after ordinary generation or registration.
It is an explicit maintenance diagnostic, not a delivery gate. Do not start
historical-path repair, repeat old warnings, or ask the user to resolve unrelated
entries while delivering new content. Run whole-project diagnostics or recovery
only when the user asks to inspect or maintain the manifest.

Successful registration is silent: do not announce registration, IDs, paths,
counts, or validation results in commentary or the final answer unless asked.
Keep the final answer focused on the requested artifact. Fix errors in the
current delivery when possible; report only unresolved failures affecting that
delivery or requiring user action. Do not edit the manifest manually.

The writer automatically recovers empty locks and locks whose local owner has
exited. Do not delete lock directories or ask the user to remove them. A live
owner is never displaced just because its lock is old. If the sandbox denies
project writes, request permission for the registrar itself and retry that
command once after permission is granted; do not use a separate shell cleanup
command or describe a permission denial as invalid document content.

Use `node scripts/validate.mjs --self-test` only to verify the installed package
runtime; it writes solely to an operating-system temporary directory.

### Explicit recovery of moved or deleted files

A missing historical path no longer requires recovery before new registration.
When the user asks to maintain paths, use the batch relocation workflow below
for path-only moves. Use `supersede.mjs` with the old ID, a verified replacement
path and a new ID only when new content replaces an older deliverable. Never
guess replacement paths or edit JSON. Unsafe paths and symlink escapes remain
errors.

### Recover multiple moved files and attachments

For the same artifacts at new locations, preserve IDs, producer metadata and
states with `scripts/relocate.mjs`. Inspect the confirmed project and verify
each destination first. Create a separate moves JSON file (not a manifest):

```json
[
  { "from": "output/old/report.md", "to": "output/archive/report.md" },
  { "from": "output/old/cover.png", "to": "output/archive/cover.png" }
]
```

```bash
node scripts/relocate.mjs --project-root /absolute/confirmed/project --moves /absolute/moves.json --dry-run
node scripts/relocate.mjs --project-root /absolute/confirmed/project --moves /absolute/moves.json
```

All exact matching primary and related references, including shared attachments
on retired entries, are updated in one locked atomic write. This command does
not move files, search for replacements, rewrite document links, withdraw an
artifact, or change metadata. An archive folder name does not imply `removed`.
Only explicitly mapped old references may be missing; all destinations and
unmapped references must pass normal path checks. One invalid mapping blocks
the whole batch. Sources and destinations must be unique; chained/cyclic moves
are rejected. Primary file extensions must remain unchanged.

Identical retries are safe when the destination is already referenced. Legacy
HTML content compatibility is separate from this path-only operation: run
`validate.mjs` after recovery and report any remaining HTML issues without
rewriting content or weakening registration. Use `supersede.mjs` when new
content actually replaces an old deliverable.
