---
title: Frontmatter 里的假标题
tags: [demo, acceptance]
# 这不是正文标题，是 frontmatter 注释
---

# 正文真正的标题

这份语料验证：YAML frontmatter 中出现的 `#` 行、`title:` 字段都不能被当作正文标题；封面必须取 frontmatter 之后正文里的第一个有效 H1。

## 为什么 frontmatter 会被误判

Markdown 解析器如果不跳过 frontmatter，会把 `# 这不是正文标题，是 frontmatter 注释` 当作标题。标题契约要求先完整跳过 frontmatter 区域，再在正文中查找 H1。

## 预期

- 封面标题为「正文真正的标题」；
- 不是 frontmatter 里的任何文本；
- 前后端解析结果一致。
