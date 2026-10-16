//! Acceptance artifact uses the same renderer as the existing export UI.
use nutbook_backend::core::markdown_export::{render_presentation_html,fallback_presentation_dark_template,MarkdownHtmlExportInput,PresentationHtmlExportPreferences,PresentationDensity};
use std::{path::PathBuf,io::Write};
fn main(){
    let path=PathBuf::from(std::env::args().nth(1).expect("output HTML path"));
    let output=render_presentation_html(MarkdownHtmlExportInput{preferences:Default::default(),title:"让想法凝聚".into(),source_file:"motion-acceptance.md".into(),source_path:path.with_extension("md"),markdown:"# 让想法凝聚\n\n中文、emoji 🌱 与换行，保留真实正文。\n\n## 从想法到表达\n\n选择文字，套用字形粒子，再修改正文与参数。".into(),generated_at:"2026-10-13".into(),template_html:fallback_presentation_dark_template().into()},PresentationHtmlExportPreferences{aspect_ratio:"16-9".into(),density:PresentationDensity::Balanced,output_kind:"motion-editable".into()}).unwrap();
    let mut file=std::fs::OpenOptions::new().write(true).create_new(true).open(path).expect("new output only; existing files are protected");file.write_all(output.html.as_bytes()).unwrap();
}
