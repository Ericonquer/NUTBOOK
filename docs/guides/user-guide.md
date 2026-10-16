# User Guide

[Back to README](../../README.md) · [中文版](./user-guide-cn.md)

### 1. Download and Install

1. Open [GitHub Releases](https://github.com/Ericonquer/NUTBOOK/releases/latest) and select the latest version.
2. Choose the build for your Mac: Apple Silicon for M1 / M2 / M3 / M4 and later chips, or Intel for an Intel Mac.
3. Download the DMG, open it, and drag `NUTBOOK` into `Applications`.

On Windows, download the `x64-setup.exe` installer and follow its installation prompts.

### 2. Complete the First macOS Authorization

Current GitHub builds use a complete ad-hoc signature because the project does not yet use a paid Apple Developer ID. On first launch, macOS may say it cannot verify the developer:

1. Open System Settings.
2. Go to Privacy & Security.
3. Find the blocked NUTBOOK notice near the bottom.
4. Choose Open Anyway / Allow.

If macOS reports that NUTBOOK is “damaged” and provides no approval option, report the exact package name instead of removing its quarantine attribute.

### 3. Open Artifact Access from an Empty Library

The first launch opens the empty **All Files** tab. Click **Artifact Access** in the center of the page to open **Settings → Artifact Access**.

The page contains two distinct areas:

* The **Agent Integrations** banner in the upper-right manages, enables, or repairs reliably detected Agent integrations.

* **Project Artifact Access** below discovers suggested, optional, and already connected artifacts from existing Agent projects and tasks.

### 4. Enable an Agent Integration

Select a detected Agent in the upper-right banner, click **Enable Agent Integrations**, and confirm the exact scope in the dialog.

NUTBOOK changes only conservatively detected integrations explicitly selected by the user. It does not modify `PATH`, deploy through symlinks, overwrite files whose ownership cannot be proven, or silently downgrade a newer version.

### 5. Add an Artifact with One Sentence

Return to an integrated Agent and say:

> Add this artifact to NUTBOOK.

The Agent can use nbskill to register artifact identity and editing capabilities, then use the Nutbook CLI when you explicitly ask it to connect the artifact. You do not need to find hidden folders, copy long paths, or understand manifests.

Artifacts with the complete NUTBOOK HTML editing protocol receive native light-editing capabilities. Ordinary HTML without the protocol can still be edited safely through a same-directory editable copy.

### You Can Also Use NUTBOOK Without Agent Integrations

* Discover existing Agent project and task artifacts in **Project Artifact Access**, then confirm them manually.

* Add a local folder directly.

* Add one Markdown / HTML file directly.

* Manage output folders from content-generating Skills under **Skill Artifact Access**.

### Thumbnail Engine

When a usable thumbnail engine is available, NUTBOOK uses it to generate HTML / Markdown thumbnails. Otherwise the app displays placeholders and lets you detect available engines, explicitly enable system Chrome as a fallback, or follow the installation guidance for a screenshot engine. NUTBOOK does not invoke Chrome silently.

## Keyboard Shortcuts

Use `Cmd` on macOS and `Ctrl` on Windows / Linux.

### General

| Shortcut               | Action           | Context                                         |
| ---------------------- | ---------------- | ----------------------------------------------- |
| `Cmd/Ctrl + O`         | Add folder       | Connect a local directory to NUTBOOK            |
| `Cmd/Ctrl + Shift + O` | Add one file     | Connect one Markdown / HTML file                |
| `Cmd/Ctrl + R`         | Rescan library   | Synchronize additions, deletions, and changes   |
| `Cmd/Ctrl + B`         | Toggle sidebar   | Expand or collapse the left navigation          |
| `Cmd/Ctrl + 1`         | All Files        | Switch to the complete library                  |
| `Cmd/Ctrl + 2`         | Recent           | Switch to recently used content                 |
| `Cmd/Ctrl + 3`         | Favorites        | Switch to favorite content                      |
| `Cmd/Ctrl + Shift + B` | Markdown outline | Show or hide the outline while reading Markdown |

### Markdown Reading and Lightweight Editing

| Shortcut               | Action                       | Notes                                        |
| ---------------------- | ---------------------------- | -------------------------------------------- |
| `Cmd/Ctrl + Z`         | Undo                         | Undo the latest Markdown edit                |
| `Cmd/Ctrl + Shift + Z` | Redo                         | Restore the latest undone edit               |
| `Cmd/Ctrl + Y`         | Redo                         | Common Windows / Linux habit                 |
| `Cmd/Ctrl + X/C/V/A`   | Cut, copy, paste, select all | Use native text editing behavior             |
| `Enter`                | Apply link                   | Confirm the current link input               |
| `Esc`                  | Close link input             | Cancel link editing and return to the editor |

Bold, italic, inline code, strikethrough, links, headings, and table operations are handled mainly through the floating toolbar in the reading area.

### HTML Presentation

| Shortcut  | Action                        | Notes                                                     |
| --------- | ----------------------------- | --------------------------------------------------------- |
| `F`       | Toggle fullscreen             | Enter or exit window-level fullscreen in the HTML runtime |
| `S`       | Open presentation mode        | Open NUTBOOK native presentation preparation; requires the presentation protocol      |
| `←` / `→` | Previous / next page          | Forwarded to the current HTML page                        |
| `↑` / `↓` | Previous / next step          | Exact behavior is defined by the page                     |
| `Space`   | Next step or playback control | For pages that support Space                              |

Typing F or S while editing text will not unexpectedly open fullscreen or presentation mode.

## FAQ

**Is NUTBOOK a knowledge base?**

No. The current product focuses on discovering, reading, lightly editing, organizing, and presenting local AI artifacts.

**Can it manage ordinary files?**

You can connect local folders and individual files, but the supported formats and product focus remain Markdown / HTML artifacts generated by AI workflows.

**Does enabling an Agent integration import the whole project?**

No. An Agent project is a discovery scope. NUTBOOK only presents candidates within the artifact boundary and connects them after user confirmation.

**Can every HTML page be edited directly?**

Ordinary HTML can use an editable-copy path that preserves the original. Artifacts with the complete NUTBOOK editing protocol can be edited natively. NUTBOOK does not promise visual editing of arbitrary page layouts or scripts.

**Is it ready for large-scale team collaboration?**

Not currently. NUTBOOK is better suited to personal local workflows or lightweight use in small teams.

**How does it relate to AI tools?**

AI tools generate and modify content. NUTBOOK receives the resulting work so it can be discovered, connected, read, categorized, favorited, lightly edited, and presented.
