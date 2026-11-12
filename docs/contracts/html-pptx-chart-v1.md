# HTML 导出 PPTX 数据图表

在幻灯片中给图表的可见容器加上 `data-nutbook-chart` 属性，值为 JSON。容器的尺寸和位置决定 PowerPoint 图表的尺寸和位置。图表标题和图例可以放在容器内，由 PPTX 图表接管。

```html
<figure data-nutbook-chart='{"kind":"bar","title":"季度订单","categories":["一季度","二季度"],"series":[{"name":"订单","values":[12,18]}]}'>
  <!-- 保留网页用于显示图表的 SVG、Canvas 或 HTML。 -->
</figure>
```

| 字段 | 约定 |
| --- | --- |
| `kind` | `bar` 为簇状柱状图，`line` 为折线图，`pie` 为饼图 |
| `title` | 可选的字符串 |
| `categories` | 1–200 个分类名称 |
| `series` | 1–16 个系列。每个系列包含名称 `name` 和数值数组 `values` |
| `values` | 有限数值，数量与分类数相同。饼图仅接受一个系列，数值须非负且至少一项大于零 |

导出的 PPTX 使用原生图表和嵌入的 Excel 工作簿。在 PowerPoint 中选中图表后，可使用「编辑数据」修改分类、系列和数值。PowerPoint 用自身的样式渲染图表。HTML、PDF 和长图沿用网页绘制的版本。属性缺失或数据无效时，PPTX 沿用原有的静态导出处理。

将[图表样本](../presentations/native-presentation-sample/charts.html)所在的文件夹添加到 NUTBOOK，打开 `charts.html`，选择「更多 → 导出中心 → PPTX」。在 PowerPoint 中逐个选中柱状图、折线图和饼图，进入「编辑数据」，修改数值并确认图形随之更新。
