# Agent output manifest v1

## Contract

The manifest lives at `<project-root>/.agent-outputs/manifest.json`. Its
`projectRoot` value is always `"."`. The manifest describes primary artifacts;
it is not an inventory of the project.

The structural source of truth is
[`manifest-schema.json`](manifest-schema.json). Validators must also enforce
the filesystem and cross-entry rules below, which JSON Schema alone cannot
fully express.

## Root fields

- `schemaVersion`: integer `1`.
- `projectRoot`: exactly `"."`.
- `entries`: ordered array of entry objects. Readers must not infer recency
  from array order.

Unknown root or entry fields are rejected. An unknown `schemaVersion` rejects
the whole manifest without changing the last successful Nutbook index.

## Entry fields

- `id`: immutable identifier, 1–128 ASCII letters, digits, `.`, `_`, or `-`;
  the first character must be alphanumeric.
- `path`: POSIX path relative to the project root.
- `state`: `active`, `superseded`, or `removed`.
- `skill.name`: normalized name of the Skill that produced or transformed the
  artifact. The nbskill registrar is transport and must not replace the real
  producer name merely because it wrote the manifest. `skill.version` is
  optional.
- `kind`: one of `document`, `report`, `presentation`, or `interactive`.
- `title`: optional user-facing title, at most 200 characters.
- `generatedAt`: optional RFC 3339 timestamp reported by the producer. It does
  not override filesystem existence, size, or modification time.
- `relatedFiles`: optional resources belonging to the primary artifact.
- `editContract`: required as `nutbook-html/v1` for every active HTML entry;
  omitted for Markdown and legacy non-active HTML entries.
- `savePolicy`: required as `managed-source` for every active HTML entry;
  omitted for Markdown and legacy non-active HTML entries.
- `supersededBy`: required only when `state` is `superseded`.

## Path rules

Every `path` and `relatedFiles[].path` must:

1. be non-empty POSIX syntax;
2. be relative to the confirmed project root;
3. contain no backslash, empty segment, `.` segment, or `..` segment;
4. resolve canonically inside the project root;
5. not escape through a symlink;
6. point to a supported primary Markdown/HTML file when used as an entry.

For a newly registered or updated `active` entry the primary file and its
attachments must exist on disk. Historical entries may become missing after
external moves/deletions; registration preserves these references silently and
requires no repair before unrelated deliveries. Explicit project-wide
validation continues to report missing paths. The filesystem is
the existence and content source of truth. A `removed` or `superseded` entry
may refer to a file that no longer exists.

## Cross-entry rules

- Entry IDs are unique across all states and remain stable across updates.
- Active primary paths are unique after path normalization.
- `supersededBy` must name a different entry in the same manifest.
- Related paths are unique within an entry after normalization.
- A related file never becomes an independent Nutbook item solely because it
  appears in `relatedFiles`.
- Duplicate IDs, duplicate active paths, invalid targets, or unsafe paths
  reject the entire new manifest. Nutbook retains the last successful index.

## State transitions

- Create a new deliverable as `active`.
- Replace an older deliverable by keeping the old entry, setting it to
  `superseded`, and setting `supersededBy` to the new entry ID.
- Record a withdrawn deliverable as `removed`.
- Do not recycle an old ID for a different artifact.

## Edit and save rules

Every active HTML entry requires `editContract: "nutbook-html/v1"` and
`savePolicy: "managed-source"`. The registrar supplies these fields and rejects
HTML whose visible content is only partially covered by editable targets.
It also rejects rich-text descendants that Nutbook would strip or normalize,
so layout-bearing HTML cannot pass by wrapping a large container in rich-text.
Nutbook must still probe the real HTML contract, acquire its normal
session/path lease, and check the source hash before saving.

Ordinary HTML that needs copy-save behavior is discovered without an nbskill
manifest entry and remains on Nutbook's editable-copy path.

## Write boundary

The manifest is a shared project file. The bundled register, supersede and relocation
scripts are the only supported writers. They lock, merge, structurally
validate, write a sibling temporary file, sync/close it, atomically rename it,
and validate the final structure. Every new or updated HTML entry receives the
current strict edit-contract validation before it can be written. A legacy
active HTML compatibility failure remains visible to `validate.mjs` but cannot
make the manifest structure unreadable or block its scripted supersede path.
Git merges and direct Agent-authored JSON are not concurrency control.

Lock ownership is prepared in a private sibling directory before atomic
publication, so a failed owner write cannot leave a shared half-created lock.
Writers automatically recover empty legacy lock directories and locks owned by
an exited local process. Age alone never permits stealing a live lock. Recovery
only removes recognized dead-owner records. On POSIX the empty directory is a
reusable container, not an active lock: the next writer replaces it atomically
without a directory-delete operation. Windows removes empty directories using
its ordinary supported path. Unknown
contents, symbolic links and owners on other hosts remain untouched. A real
project write denial still requires host permission, not manual lock cleanup.
Cleanup failures preserve the original operation error. If the operation has
already completed, the error explicitly identifies release failure rather than
claiming the registration write failed. Re-registering identical metadata is a
validated no-op and need not change the manifest modification time.

Register and supersede always enforce manifest structure, path syntax and
canonical containment. During their locked read/merge/write, missing historical
primary/related files are allowed, while the current delivery remains strict.
The same validation scope is used before and after atomic rename. No historical
entries are deleted or silently rewritten. These operations produce no stale
path warnings. A standalone `validate.mjs` is an explicit maintenance diagnostic;
it must not be run automatically after every generated artifact.

For path-only moves, `relocate.mjs --moves <json-file>` accepts a non-empty
array of exact `{from, to}` relative-path mappings. It repairs multiple missing
primaries and related files together, preserving IDs, metadata and states.
All matching references across all states change atomically; selected missing
old paths still undergo syntax and ancestor/symlink containment checks. Every
destination must exist within the project, and the final manifest passes normal
structural and filesystem validation. Unmapped missing references still block
the write. The command supports `--dry-run` and idempotent retries, rejects
conflicting/chained mappings, and never moves or edits artifact files.
Primary extensions remain unchanged. This path-only operation does not impose
new HTML authoring requirements on legacy content; `validate.mjs` continues to
report HTML compatibility issues separately. Register and supersede still
validate new or changed HTML strictly.
