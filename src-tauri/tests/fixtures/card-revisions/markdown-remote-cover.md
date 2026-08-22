# Remote cover image

本文档验证远程 http/https 图片 URL 与 canonical comment 的基线行为。comment 紧跟独立图片块，构成 C1 的 canonical「comment + image」形态，且全文只有一个 marker，不会落入重复 marker 路径。

<!-- nutbook-cover -->

![Remote landscape](https://example.invalid/covers/landscape-16x9.png)

远程 URL 使用保留域 `example.invalid`，不依赖不受控的第三方在线资源。当前产品对远程图片 URL 没有任何封面路径；它只是普通正文图片语法基线。远程封面在线成功路径应由未来受控测试服务器验证，不在 C0 实现。
