# Data charts in NUTBOOK presentations

For each clustered column, line, or pie chart whose source data is available, put a `data-nutbook-chart` attribute on the visible element that bounds the chart. Its JSON value is used to create a native PowerPoint chart with an embedded Excel workbook. Keep the element fully inside one slide. Use the same dataset for the browser rendering and the export attribute.

```html
<h2 data-id="quarterly-orders-title" data-editable="text">季度订单</h2>
<figure role="img" aria-label="季度订单"
  data-nutbook-chart='{"kind":"bar","categories":["一季度","二季度"],"series":[{"name":"订单","values":[12,18]}]}'>
  <!-- Render the chart here using HTML, SVG, or Canvas. -->
</figure>
```

| Field | Supported value |
| --- | --- |
| `kind` | `bar` for clustered columns, `line` for a line chart, or `pie` for a pie chart |
| `categories` | An array of 1–200 strings |
| `series` | An array of 1–16 objects with a string `name` and a `values` array of finite numbers |
| `values` | One value per category. For a pie chart, use one series with nonnegative values and at least one positive value |
| `title` | Optional string for a title owned by the native chart |

Use HTML fields with unique `data-id` and supported `data-editable` values for headings, captions, and analysis that the user edits in NUTBOOK. Place them outside the chart container so that they also export as separate text. Omit the JSON `title` when an adjacent editable heading already supplies it. Chart axes, ticks, and legends drawn from the dataset are part of the chart rendering. The chart's numeric data is edited in PowerPoint via **Edit Data** after export.

Escape the attribute using the surrounding HTML quote style. Use an offline-capable renderer. Preserve the original rendering for charts with unavailable data or unsupported types. Before delivery, load the authored HTML offline, parse every chart attribute, and verify that the plotted labels, values, and series match it.
