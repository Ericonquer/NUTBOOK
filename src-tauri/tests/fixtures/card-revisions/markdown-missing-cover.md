# Missing cover image

本文档验证 marker 指向缺失资源的基线行为：图片资源不存在时文档仍可打开、编辑与保存，当前产品不产生封面、也不阻塞正文。

<!-- nutbook-cover -->

![Missing asset](./assets/does-not-exist.png)

图片资源缺失时，正文在渲染端表现为破图或占位，但当前产品没有封面校验，也不应产生任何封面 UI。
