<div align="center">

# 居中容器内的 H1

</div>

这份语料验证被 `<div align="center">` 包裹的 H1（渲染为 `aligned_text_block`）仍应被识别为文档标题。标题契约接受受控 `aligned_text_block` 内的 H1，只修改内部 heading，保留 alignment wrapper。

## 为什么需要专门语料

Milkdown 对 `<div align="...">` 会生成带对齐属性的特殊块。如果标题解析只看普通块，居中容器里的 H1 会被漏掉，封面就会错误回退到文件名。

## 预期

- 封面标题 = 「居中容器内的 H1」；
- 保存标题时修改内部 heading 文本，不破坏 `align="center"` 容器；
- 撤销、重做、关闭重开后 alignment wrapper 保持不变。
