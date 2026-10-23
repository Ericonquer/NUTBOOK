# Local document history contract

This contract describes the Markdown / HTML history implementation. The filesystem is authoritative; SQLite history tables are disposable projections. It does not authorize recovering an original file to an unspecified destination or deleting recovered resource directories.

## Entries and identity

Explicit Markdown saves (library or temporary sessions), HTML source commits, HTML conflict copies, saved presenter notes and source-level motion changes use the history publisher. HTML sidecar drafts, input events, scans and global preferences do not create versions. A new Save As target gets a new document identity. Confirmed overwrite protects the target's own pre-image rather than importing the source's history.

A durable document header binds a UUID to its canonical source path, filesystem identity and binding revision. Replacing a path with a different file cannot silently inherit its history. A document retains at most 10 committed versions. An unchanged normalized content/resource snapshot is a no-op.

## Durable state and publication

Application data contains `document-versions/` with document headers, immutable SHA-256 objects, version manifests, publication journals, owner locks, recovery-resource registrations, index-pending markers and disposable preview projections. Schema version 10 adds the SQLite history index independently of library items.

Lock order is canonical source path, then short quota bookkeeping. A running store owns a random instance UUID and holds its OS file lock for its lifetime. PID and timestamps do not establish death. Another instance may recover an owner's work only after acquiring its owner lock; lock/metadata failures preserve material.

Publication reserves capacity, durably prepares complete snapshots, atomically replaces the source, then finalizes the durable header. A failure before source publication preserves the source. Once publication is durable, header/index completion is retryable and must not be reported as an unsaved file. Retrying the same save must not add a duplicate version.

On recovery, an old source hash aborts uncommitted publication; a new hash completes prepared publication; a third-party hash retains conflict material without overwriting the source. Startup begins recovery off the UI thread; normal commands share the initialized store and retry/report recovery failures. Recovery never grants permission to recreate a missing original file.

## Quota, indexes and cleanup

The default limit is 500,000,000 bytes. Settings revisions and reservations share the quota lock. Existing valid reservations may finish after a limit is lowered; new reservations use the new limit. Shared objects are reserved/countable once. Physical retained data and outstanding reservations count toward usage; lowering the limit never silently deletes history.

A rebuild reads durable headers/manifests, verifies objects and projects versions/references/availability into one SQLite transaction. It creates no library items or source files, and cannot resurrect deleted versions. Per-document synchronization is isolated and retryable. Migration failure rolls back its schema/registry changes and must prevent enabling the history writer; immutable history remains outside the database.

GC pins all committed versions, pending publications and preview leases. Clearing history does not remove source files or document-side recovered resources. Recovered directories are deliberately retained; automatic cleanup and user-facing internal-directory management are outside the current scope.

## Preview ownership and isolation

Each preview has a durable journal before projection creation. Only published `.json` records are leases; an interrupted atomic `.tmp` is neither a record nor permission to delete unknown material. A malformed published record fails closed. A foreign live owner protects its preview; dead-owner cleanup is idempotent and restricted to its registered projection.

Cleanup validates the per-owner/registry ancestors and the complete projection tree before deletion, and rechecks types during deletion. Unexpected links, mismatched ownership or unknown state stop cleanup rather than following links into outside data. Scoped preview origins are revoked on close/version changes. Guessing object hashes is not resource authorization.

HTML previews use sanitized archived HTML, captured CSS/images and bounded inline archived fonts (16 MB expanded font-reference budget). They retain safe semantic layout tags and exclude title metadata, scripts, forms, active navigation and host commands. Script runtime uncertainty is informational; genuinely missing or unsupported resources are separate statuses. Preview never fills missing resources from current files or the network.

The host fits HTML in a minimum 800px layout viewport with an external 24px inset, preserving author root attributes, head/body placement and body geometry. Ordinary HTML remains scrollable inside the inert frame. Recognized presentations use stable `data-nutbook-page-id` roots, with conventional section slide/page containers as fallback. Host-owned previous/next buttons and a validated page-number input produce a detached projection with only the selected page active; it executes no source code and changes no archived bytes. Selection survives version changes by stable ID, then clamped ordinal. Unsupported script-generated pages remain available only in archived source; this is not a visual diff engine.

HTML resource relocation supports the implemented static CSS/module grammar and preserves relative resource topology, queries and fragments. Unsupported dynamic/ambiguous relocation fails before writing a recovered document, while ordinary source saves may retain an explicit incomplete-resource status. Markdown relocation changes only recognized resource URL tokens, preserving content and formatting metadata.

## Verification boundaries

Storage tests exercise actual files, SQLite transactions, multiple OS processes, lock liveness, process termination and repeated recovery. Browser companions inspect generated archived projections and sandbox behavior; mocked UI tests do not establish native WKWebView behavior. Native save/restore/close/focus acceptance is recorded separately in the task evidence. These checks do not establish packaged-app behavior on other operating systems; packaging and release are separate work.
