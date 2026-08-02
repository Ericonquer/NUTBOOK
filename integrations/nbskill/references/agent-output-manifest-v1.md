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
- `skill.name`: normalized source Skill name. `skill.version` is optional.
- `kind`: one of `document`, `report`, `presentation`, or `interactive`.
- `title`: optional user-facing title, at most 200 characters.
- `generatedAt`: optional RFC 3339 timestamp reported by the producer. It does
  not override filesystem existence, size, or modification time.
- `relatedFiles`: optional resources belonging to the primary artifact.
- `editContract`: optional; v1 only accepts `nutbook-html/v1`.
- `savePolicy`: optional `copy` or `managed-source`.
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

`savePolicy: "managed-source"` is valid only with
`editContract: "nutbook-html/v1"` and an HTML primary path. Nutbook must still
probe the file's real HTML contract, acquire its normal session/path lease, and
check the source hash before saving.

`savePolicy: "copy"` or an omitted save policy never authorizes overwriting an
ordinary HTML source. Nutbook keeps using its editable-copy path.

## Write boundary

The manifest is a shared project file. Once Task 6 exists, the registrar is the
only supported writer. It must lock, merge, validate, write a sibling temporary
file, sync/close it, atomically rename it, and validate the final file. Git
merges and direct Agent-authored JSON are not concurrency control.

