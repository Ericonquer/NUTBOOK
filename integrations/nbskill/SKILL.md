---
name: nbskill
description: Register Markdown and HTML deliverables for Nutbook through the project-local .agent-outputs manifest. Use when an Agent creates, updates, or supersedes a user-facing artifact that should be discoverable in Nutbook.
---

# nbskill

> Development contract only. The registrar and installer do not exist until
> Task 6 of the Agent artifact discovery plan. Do not install this directory,
> advertise nbskill as available, or hand-write a production manifest.

Use nbskill to describe user-facing Markdown and HTML artifacts without turning
an Agent project into a general file browser.

## Current boundary

- Read [references/agent-output-manifest-v1.md](references/agent-output-manifest-v1.md)
  before producing or consuming manifest data.
- Read [references/nutbook-html-edit-contract-v1.md](references/nutbook-html-edit-contract-v1.md)
  before declaring an HTML artifact editable.
- Treat [references/manifest-schema.json](references/manifest-schema.json) as
  the structural contract and [templates/manifest.json](templates/manifest.json)
  as the only manifest starting point.
- Register only a primary Markdown or HTML artifact. Keep scripts, styles,
  images, fonts, attachments, and data as `relatedFiles`.
- Keep all paths relative to the confirmed project root and inside that root
  after symlink resolution.
- Never infer `managed-source` from editable markup alone. Require both
  `editContract: "nutbook-html/v1"` and `savePolicy: "managed-source"`.

## Not available yet

Task 6 will add `register.mjs`, `validate.mjs`, and `supersede.mjs`. Until those
atomic tools exist:

- do not create or mutate a real project's `.agent-outputs/manifest.json`;
- do not ask an Agent to maintain JSON by hand;
- use the checked-in template only for fixtures and contract review;
- use ordinary Agent project discovery when testing Nutbook.

