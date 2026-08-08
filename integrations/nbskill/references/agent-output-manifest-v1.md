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

For an `active` entry the primary file must exist on disk. The filesystem is
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

The manifest is a shared project file. The bundled registrar and supersede
scripts are the only supported writers. They lock, merge, structurally
validate, write a sibling temporary file, sync/close it, atomically rename it,
and validate the final structure. Every new or updated HTML entry receives the
current strict edit-contract validation before it can be written. A legacy
active HTML compatibility failure remains visible to `validate.mjs` but cannot
make the manifest structure unreadable or block its scripted supersede path.
Git merges and direct Agent-authored JSON are not concurrency control.
