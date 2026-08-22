# Portable cover image

本文档验证 portable image 语法（GitHub HTML 形态）与 canonical comment marker 的语义。顶层 marker 紧跟第一个独立 portable 图片块，构成 C1 的 canonical portable 封面样本；第二个带链接的 portable 块是普通正文图片。

<!-- nutbook-cover -->

<p align="center">
  <img src="./assets/cover-landscape.png" alt="Portable centered landscape" width="480">
</p>

## 带链接的 portable image

<p align="right">
  <a href="https://example.invalid/album" title="Open album">
    <img src="./assets/cover-landscape.png" alt="Linked portable landscape" width="320">
  </a>
</p>

portable image 保持当前正文图片语义；封面身份不改变图片位置、缩进、属性或链接，卡片在本阶段仍使用默认标题封面。
