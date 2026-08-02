# Codex current local format profile

> Collected: 2026-07-30
>
> Verified local producer: Codex Desktop / CLI `0.146.0-alpha.3.1`
>
> Adapter profile: `codex-local-0.146`

## Status

This document records an observed format, not a permanent Codex storage API.
The current OpenAI Codex manual documents local session transcripts and the
app-server thread APIs, but explicitly says transcript format is not a stable
interface and may change.

Official references:

- https://developers.openai.com/codex/app-server/
- https://developers.openai.com/codex/config-advanced/
- https://developers.openai.com/codex/cli/slash-commands/

The adapter must recognize only an explicitly tested profile. Unknown or
missing fields fail closed to project-only discovery.

## Observed project sources

### SQLite thread index

`$CODEX_HOME/state_5.sqlite` currently contains a `threads` table. The fields
verified on this machine are:

- `id`
- `rollout_path`
- `created_at`
- `updated_at`
- `source`
- `cwd`
- `title`
- `git_sha`
- `git_branch`
- `git_origin_url`
- `cli_version`
- `thread_source`

For current local discovery, `cwd` is the project-root candidate,
`updated_at` is recent activity, `rollout_path` locates supporting evidence,
and `cli_version` selects the parser profile. Nutbook must open the database
read-only and must not depend on table order or undocumented columns.

The official app-server also exposes `thread/list` with `cwd`, source, archive,
and state-DB filtering. It is the preferred documented integration surface if
Task 1 can use it without introducing a hidden long-running process or broad
permissions. Direct SQLite access remains a version-pinned local fallback, not
a stable contract.

### Rollout JSONL

An active transcript is currently under
`$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl`; archived transcripts move
to `$CODEX_HOME/archived_sessions/`.

Observed records have top-level `timestamp`, `type`, and `payload`.
`session_meta.payload` includes:

- `id` and `session_id`;
- `timestamp`;
- `cwd`;
- `originator`;
- `cli_version`;
- `source` and `thread_source`;
- `git`;
- additional runtime fields that are irrelevant to artifact discovery.

The adapter may use `session_meta.cwd` to corroborate a SQLite project
candidate. It must not persist raw prompts, replies, reasoning, tool output, or
base instructions.

## File facts

### Reliable for the verified profile

- A successful `event_msg` with `payload.type == "patch_apply_end"`,
  `success == true`, and a path in `payload.changes` proves that Codex's
  `apply_patch` tool wrote that path during the recorded turn.
- A final assistant `response_item` with `phase == "final_answer"` can contain
  an explicit Markdown link to a project-relative file. This is a final
  delivery indication when the resolved path stays inside the confirmed
  project root.
- When both facts name the same supported primary file, the fixture expects
  `created_by_agent_tool` and `mentioned_in_final_response`.

### Not reliable enough for suggested import

- A successful shell/exec call does not by itself prove which files were
  written; shell text is not a safe filesystem event stream.
- File modification time falling inside a Codex run proves only temporal
  overlap. It must map to `appeared_during_agent_run`, never “Codex created”.
- A `.md` or `.html` extension alone maps only to
  `supported_extension_only` and remains pending rather than silently hidden.
- A supported file directly in the confirmed project root also receives
  `inside_project_root` and is suggested, unless it is already indexed by
  NUTBOOK or matches an explicit internal-file exclusion.
- A path mentioned in commentary, a prompt, test output, diff, or reasoning is
  not a final delivery.
- A failed or incomplete patch is not a write fact.

### Unsupported boundary

Current transcripts do not provide a stable, documented, exhaustive list of
all filesystem writes or a structured “delivered artifacts” collection.
Therefore the v1 adapter may:

1. discover projects from the current verified project metadata;
2. emit precise events for successful `apply_patch` changes;
3. emit final-delivery evidence for explicit final-answer file links;
4. leave timestamp-only or extension-only files pending;
5. downgrade to project discovery only on any unknown transcript or database
   profile.

It must not recursively scan all of Home, infer delivery from arbitrary shell
commands, or claim exact Agent authorship from timestamps.

## Fixture derivation and privacy

The checked-in fixture under
`src-tauri/tests/fixtures/agent-artifact-discovery/provider-records/codex/`
was derived from a real local `0.146.0-alpha.3.1` thread and keeps the observed
record envelopes and relevant field names.

Redactions:

- replaced real IDs with deterministic fixture IDs;
- replaced the user home and repository path with
  `/workspace/sample-agent-project`;
- replaced repository identity and commit values;
- removed prompts, chat history, reasoning, tool outputs, dynamic tools, base
  instructions, and unrelated paths;
- replaced the final reply with minimal fixture-only delivery text;
- kept only the minimum successful patch metadata needed to prove file events.

`/workspace/sample-agent-project` is a deterministic absolute placeholder.
Fixture-driven tests must map it to the checked-in
`projects/sample-agent-project` directory before checking disk state; the
adapter must never special-case `/workspace` in production.

The fixture is a parser contract for Task 1, not evidence that future Codex
versions retain the same private storage shape.
