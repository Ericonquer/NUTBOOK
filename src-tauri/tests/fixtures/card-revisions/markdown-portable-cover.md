# Portable cover image

本文档验证 portable image 语法（GitHub HTML 形态）与 canonical comment marker 的基线行为。portable image 在当前产品中渲染为普通正文图片块，comment 不改变其语义。

<!-- nutbook-cover -->

## 居中固定宽度 portable image

<p align="center">
  <img src="./assets/cover-landscape.png" alt="Portable centered landscape" width="480">
</p>

## 带链接的 portable image

<p align="right">
  <a href="https://example.invalid/album" title="Open album">
    <img src="./assets/cover-landscape.png" alt="Linked portable landscape" width="320">
  </a>
</p>

portable image 保持当前正文图片语义，卡片仍使用默认标题封面，不出现任何图片封面。
