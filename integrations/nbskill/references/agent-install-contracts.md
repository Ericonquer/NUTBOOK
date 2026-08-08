# nbskill Agent installation contracts

Verified on macOS on 2026-08-02. Nutbook treats package compatibility and
target-Agent runtime verification as separate states.

| Agent | Personal Skill target | Verification evidence |
| --- | --- | --- |
| Codex | `~/.codex/skills/nbskill` | Existing `~/.codex/skills/*/SKILL.md`; Codex version record present. |
| Claude Code | `~/.claude/skills/nbskill` | Existing `~/.claude/skills`; CLI unavailable in this environment, so runtime remains unverified. |
| OpenClaw | `~/.openclaw/skills/nbskill` | OpenClaw managed/local skills root and official OpenClaw Skills documentation. |
| Hermes | `~/.hermes/skills/nbskill` | Existing `~/.hermes/skills/*/SKILL.md`; Hermes v0.15.1 and official skills documentation. |
| WorkBuddy | `~/.workbuddy/skills/nbskill` | Existing `~/.workbuddy/skills/*/SKILL.md`; local personal-Skill target convention. WorkBuddy app versions are informational, not an installation compatibility gate. |

These are installation targets, not permission to write them silently. Nutbook
stages a verified package and generates a target-specific prompt. The chosen
Agent performs the install, validation, and rollback workflow.

## Local status icons

The user supplied the five PNG assets from `/Users/hayley/Desktop/icon` on
2026-08-02 and explicitly selected them for the Phase C UI. Nutbook copies them
without transformation into `dist/assets/agent-icons`; they are local app
assets and never fetched at runtime. Their SHA-256 values are:

| Agent | SHA-256 |
| --- | --- |
| OpenClaw | `46d4f9edca74b53a791d9a7c120f7c0a21813efcf07666639742c00392685402` |
| Hermes | `8dc36437c5919ef445e20f383e6a0885719548002928504800ad69cac060e49c` |
| Claude Code | `4c6dbe962893b9c431ded3cc304e4348898052f6d72afd76473a8f666f468f8c` |
| Codex | `df9f4424c23368f4a08ce21a600343d5392a5c2ddda792624d39c19f541ecf80` |
| WorkBuddy | `753959a00390586cd4e375534e8caefd889a90a51847fbee69042b359424a439` |

These icons identify the selected installation target only; they do not imply
Agent availability, login state, project count, or additional affiliation.
