---
name: nuts
description: Use the local NUTBOOK CLI to claim or revise a NUTS issue, research relevant sources, and submit a Markdown draft for review.
---

# NUTS

When the user provides a short NUTBOOK issue number such as `NUT-7K4M9Q`, resolve it locally before calling the CLI:

1. Validate and uppercase the number. Current numbers match `NUT-[0-9A-HJKMNP-TV-Z]{6}`; earlier preview numbers match `NUT-[0-9A-F]{8}`. Read only the matching regular JSON file at `~/.nutbook/nuts-claims/<number>.json` (on Windows, resolve `~` under the current user's profile). The file supplies `cli`, `app_data_dir`, and `issue_id`. If the file is missing, ask the user to copy the number again on the computer where the issue lives. Do not guess a library.
2. Use the absolute `cli` path as the executable and `app_data_dir` as `NUTBOOK_APP_DATA_DIR` for all commands on that issue. Treat JSON values as arguments and environment data, never interpolate them as executable shell syntax. Claim by the full `issue_id`, and use the returned token only to submit the draft. Report the version in the chat without reproducing the local handoff record.

Use the issue ID shown in NUTBOOK. If the user gives a title, call `nutbook nuts list --json` and resolve a unique match. Ask which issue only when the match is ambiguous.

Use the CLI for the same NUTBOOK installation and data directory as the GUI. If the user provides a CLI path or `NUTBOOK_APP_DATA_DIR` for a development build, use it consistently. For a standard install, use the deployed CLI under the NUTBOOK application data directory.

- For a new draft, run `nutbook nuts claim <issue-id> --json`.
- For a board-queued review, claim the open issue normally. Read the selected base version in `previous` and the submitted comments in `extra`. For a conversational revision with new material, place the new material in a UTF-8 Markdown file and run `nutbook nuts revise <issue-id> <supplement.md> --json`.
- The claim response contains the original material in `source`, any supplemental material in `extra`, and the last draft in `previous` when available. Use the material and the user's requested outcome to prepare a UTF-8 Markdown draft in a separate file.
- Submit with `nutbook nuts submit <issue-id> <token> <draft.md> --json` using the token from this claim. Report the returned version number to the user.
- If a claim is rejected, report the current state. If submission fails, preserve the draft. For a transient error retry the same submission with the same token and file. If the claim expired, ask the user to reopen the issue before trying a new claim.

## Supplementing issue material

- For fact-based writing and research, identify the evidence the goal still needs. Proactively look up missing facts, examples, and context when the available tools and board rules permit it. Start from supplied material, check source contents, prefer original reporting, primary records, and official data, and distinguish a source’s claim from your inference. On revision, address evidence gaps raised in the review. If a source cannot be read or a claim cannot be verified, say so and seek an accessible source.
- Put the new sources actually used in a short “补充资料” or “Additional sources” section at the end of the draft. Give each source a title and direct link. For publishable prose, keep source links in the end section and attribute important facts in prose where needed.
- Register each newly used public source with `nutbook nuts recommend <issue-id> <url> <title> <reason> --json`. State what the source supports. Skip URLs already in the issue materials or adopted references. This makes the links available for the user to add to the issue from the recommendations list. A repeated URL preserves its existing adoption state. A claim’s `references` are a snapshot of links adopted at claim time.

## Board rules and revisions

- After the CLI successfully submits a revision, automatically review the feedback that drove that revision during the same run. Extract durable preferences scoped to the board and relevant kind of work. Keep one-off facts and article-specific corrections with the issue. Prefer a narrow, actionable instruction over a broad conclusion. Consolidate repeated guidance and refine an existing rule when the feedback adds specificity.
- Use the claimed issue’s `board_id` and reload `board-config <board-id> --json` before editing. Preserve unrelated rules. If this review yields a meaningful change, save the merged Markdown with `nuts save-rules <board-id> <current-version> <current-name> <rules.md> --json` without waiting for confirmation. On a version conflict, reload and merge against the current rules before retrying. Skip a write when the rule is already covered or the feedback is too specific to generalize. The new version applies to future claims. Report the rule change or save failure separately from the successfully submitted draft.

- Use the claim's `task.goal` as the requested deliverable when supplied, and follow the board policy in `rules.text`. The claim records the board rules version in `rules.version`. A new revision uses the rules in its own claim response.

- Use `nutbook nuts claim-next [--board <board-id>] --json` to claim one open issue in opening order. A JSON `null` means there is no eligible issue. A scheduler should stop that run when the queue is empty.
- Use `nutbook nuts boards --json` to resolve a board. `nutbook nuts create-board <name> <quick|article|research|product> --json` creates a board with a built-in scene. Read `board-config <board-id> --json` before calling `save-rules <board-id> <version> <name> <path.md> --json`. If the version conflicts, reread the rules before applying any changes.
- For an attached file in the claim source, read the managed local path using a tool appropriate to the file format. Report inaccessible files by their original name.
- Read the claim's `images` entries alongside the issue goal. Each entry contains the original attachment's local `path`, its `title`, explicit `roles`, and a user `note`. `extract_info` means inspect the image for text, tables, or visual evidence. `illustration` means the original image is a candidate to include in the deliverable. `generation_reference` means use it as a reference for creating a new image. Apply every selected role as relevant, following the note. With no roles selected, inspect the image only as needed for the goal and avoid assuming that the user wants it inserted or used to generate an image.
- The claim's `library_references` array contains NUTBOOK library references linked to the issue before claim. Read each local path as needed and report moved or unavailable sources by title.
