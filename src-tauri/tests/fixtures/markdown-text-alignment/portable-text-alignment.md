# Portable Text Alignment Acceptance

This document exercises portable Markdown text alignment through Nutbook's real library path.

# Plain Body H1

## Plain Body H2

Plain paragraph target.

<div align="center">

# NUTBOOK Brand

</div>

<div align="right">

This paragraph keeps **bold**, *italic*, `code`, ~~strike~~, and [links](https://example.com).

</div>

<div align="center">

## Adjacent Center Heading

</div>

<div align="right">

Adjacent right paragraph.

</div>

- A list item must stay unchanged.
- Another list item.

> A quote must stay unchanged.

```text
code block must stay unchanged
```

| Column A | Column B |
| --- | --- |
| One | Two |

![Standalone image](./assets/alignment-sample.svg)

Inline image paragraph must be rejected: ![Inline image](./assets/alignment-sample.svg)

<div class="custom-alignment" align="center">

This unknown-attribute block must stay on the raw HTML fallback path.

</div>

<div align="center">

First paragraph in a rejected multi-block container.

Second paragraph in a rejected multi-block container.

</div>
