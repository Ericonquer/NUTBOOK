use std::path::PathBuf;

use nutbook_backend::core::markdown_export::{
    render_presentation_html, MarkdownHtmlExportInput, MarkdownHtmlExportPreferences,
    PresentationDensity, PresentationHtmlExportPreferences,
};

fn main() {
    let arguments = std::env::args().skip(1).collect::<Vec<_>>();
    let markdown = if arguments.iter().any(|argument| argument == "readme") {
        include_str!("../../README-CN.md").to_string()
    } else {
        r#"# Layout fixture

## 能力

### 四项短文案

当前支持：

- 添加文件夹
- 添加单文件
- 扫描 skill
- 管理标签

### 五项带解释

这组能力适合在阅读过程中持续整理：

- **缩略图**：快速识别报告、演示文档与研究资料。
- **阅读视图**：以更适合长文的方式呈现 Markdown 内容。
- **轻编辑**：在阅读时修订关键段落与表述。
- **HTML 预览**：保留页面脚本与交互结果。
- **分类浏览**：按来源、最近与收藏持续整理资料。

### 七项带解释

每项都带有解释，因此应在容量不足时稳定拆分：

- **收集**：接入本地文件夹与单文件。
- **扫描**：发现 skill 的产物目录。
- **阅读**：提供舒展的 Markdown 阅读页面。
- **编辑**：允许即时轻量修订。
- **预览**：保留 HTML 页面交互。
- **收藏**：保存之后要继续使用的内容。
- **分类**：用标签组织不同来源的资料。"#.to_string()
    };
    let input = MarkdownHtmlExportInput {
        title: "Layout fixture".to_string(),
        source_file: "layout-fixture.md".to_string(),
        source_path: PathBuf::from("layout-fixture.md"),
        markdown,
        generated_at: "layout fixture".to_string(),
        template_html: include_str!("../resources/export-templates/markdown-presentation-light.html").to_string(),
        preferences: MarkdownHtmlExportPreferences::default(),
    };
    let preferences = PresentationHtmlExportPreferences {
        aspect_ratio: if arguments.iter().any(|argument| argument == "4-3") {
            "4-3".to_string()
        } else {
            "16-9".to_string()
        },
        density: PresentationDensity::Balanced,
        output_kind: "static".to_string(),
    };
    let output = render_presentation_html(input, preferences).expect("fixture should render");
    print!("{}", output.html);
}
