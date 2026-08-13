# Portable Markdown Images

This document is a real Nutbook acceptance artifact for portable image rendering and editing.

## Standard Markdown image

![Standard landscape](./assets/landscape-large.png)

## Legacy Nutbook token

![Legacy centered icon](./assets/icon-112.png "nutbook-align=center nutbook-size=small")

## GitHub centered fixed-width image

<p align="center">
  <img src="./assets/icon-112.png" alt="Centered 112 pixel icon" width="112">
</p>

## GitHub linked image

<p align="right">
  <a href="https://github.com/Ericonquer/NUTBOOK" title="Open NUTBOOK on GitHub">
    <img src="./assets/landscape-large.png" alt="Linked landscape" width="480">
  </a>
</p>

Text before an inline image ![Inline icon](./assets/icon-112.png) and text after it. The inline image must not expose block alignment or size actions.

## Adjacent ordinary HTML

<kbd>Command</kbd> + <kbd>S</kbd> saves the document. This remains ordinary HTML.

<p class="custom-image-frame" align="center">
  <img src="./assets/icon-112.png" alt="Unsupported styled wrapper" width="112">
</p>

The class-bearing wrapper above is intentionally outside the portable-image whitelist and must remain on the ordinary HTML fallback path.
