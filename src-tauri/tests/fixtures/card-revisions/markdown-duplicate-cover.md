# Duplicate cover marker

本文档故意包含两个有效的封面 marker，用于验收重复封面身份的阻断式诊断。Nutbook 不会静默猜测哪一张图才是封面，而会切换到源码编辑；只保留一个 `<!-- nutbook-cover -->`（或删除多余 marker）后即可恢复视觉编辑。

<!-- nutbook-cover -->

![First landscape](./assets/cover-landscape.png)

<!-- nutbook-cover -->

![Second landscape](./assets/cover-landscape.svg)

这是预期的 fallback 样例，不是编辑器加载故障。重复状态修复前，两张图片仍保留在 Markdown 源码中，Nutbook 不会自动删除或改写任何一张。
