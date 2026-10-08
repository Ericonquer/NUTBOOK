use std::{env, fs, path::PathBuf};

use nutbook_backend::core::markdown_export::{
    fallback_presentation_dark_template, fallback_presentation_light_template,
    render_presentation_html, MarkdownHtmlExportInput, MarkdownHtmlExportPreferences,
    PresentationDensity, PresentationHtmlExportPreferences,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let target = PathBuf::from(env::args().nth(1).ok_or("output directory required")?);
    let source = PathBuf::from("docs/presentations/markdown-export-sample/sample.md");
    let markdown = fs::read_to_string(&source)?;
    fs::create_dir_all(&target)?;
    for (theme, template) in [
        ("light", fallback_presentation_light_template()),
        ("dark", fallback_presentation_dark_template()),
    ] {
        for kind in ["static", "dynamic"] {
            let output = render_presentation_html(
                MarkdownHtmlExportInput {
                    title: "演示导出验收样本".into(),
                    source_file: "sample.md".into(),
                    source_path: source.clone(),
                    markdown: markdown.clone(),
                    generated_at: "2026-10-07".into(),
                    template_html: template.into(),
                    preferences: MarkdownHtmlExportPreferences::default(),
                },
                PresentationHtmlExportPreferences {
                    aspect_ratio: "16-9".into(),
                    density: PresentationDensity::Balanced,
                    output_kind: kind.into(),
                },
            )?;
            if !output.warnings.is_empty() { return Err(format!("unexpected export warnings: {:?}", output.warnings).into()); }
            fs::write(target.join(format!("{theme}-{kind}.html")), output.html)?;
        }
    }
    Ok(())
}
