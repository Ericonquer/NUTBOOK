# Duplicate cover marker

本文档验证重复 comment marker 的基线行为。C1 需要把重复 marker 作为阻断视觉修改的负面样本；当前产品中两个 comment 都只是普通正文注释。

<!-- nutbook-cover -->

![First landscape](./assets/cover-landscape.png)

<!-- nutbook-cover -->

![Second landscape](./assets/cover-landscape.svg)

重复的 `<!-- nutbook-cover -->` 在当前产品中只是两个普通 HTML comment，两张图片都是普通正文图片，卡片仍使用默认标题封面。
