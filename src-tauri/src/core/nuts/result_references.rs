use std::{borrow::Cow, ops::Range, path::Path};

use pulldown_cmark::{Event, Parser, Tag, TagEnd};
use serde::Serialize;

use super::{open, Result};

const BEGIN: &str = "<!-- nuts-review-references -->";
const END: &str = "<!-- /nuts-review-references -->";

struct Section {
    start: usize,
    content: Range<usize>,
    heading: String,
    marked: bool,
}

#[derive(Serialize)]
pub struct ReferenceSection {
    heading: String,
    marked: bool,
}

fn reference_heading(text: &str) -> bool {
    matches!(
        text.trim().to_ascii_lowercase().as_str(),
        "审阅参考资料"
            | "参考资料"
            | "资料来源"
            | "补充资料"
            | "review references"
            | "references"
            | "sources"
            | "additional sources"
    )
}

fn linked_list(markdown: &str) -> bool {
    let mut depth = 0;
    let mut list = false;
    let mut item_link = false;
    for event in Parser::new(markdown) {
        match event {
            Event::Start(Tag::List(_)) if depth == 0 && !list => {
                list = true;
                depth += 1;
            }
            Event::Start(Tag::Item) if depth == 1 => {
                item_link = false;
                depth += 1;
            }
            Event::Start(Tag::Link { .. }) if depth >= 2 => {
                item_link = true;
                depth += 1;
            }
            Event::Start(Tag::Paragraph | Tag::Emphasis | Tag::Strong) if depth >= 2 => depth += 1,
            Event::End(TagEnd::Item) if !item_link => return false,
            Event::End(_) if depth > 0 => depth -= 1,
            Event::Text(_) | Event::Code(_) | Event::SoftBreak | Event::HardBreak if depth >= 2 => {
            }
            _ => return false,
        }
    }
    list && depth == 0
}

fn section(markdown: &str) -> Option<Section> {
    let mut depth = 0;
    let mut heading = String::new();
    let mut last_heading = None;
    let mut begin = None;
    let mut end = None;
    let mut marked = false;
    for (event, range) in Parser::new(markdown).into_offset_iter() {
        match event {
            Event::Start(Tag::Heading { .. }) if depth == 0 => {
                heading.clear();
                last_heading = Some(range);
                depth += 1;
            }
            Event::Start(_) => depth += 1,
            Event::End(_) => depth -= 1,
            Event::Text(text) | Event::Code(text)
                if depth == 1
                    && last_heading
                        .as_ref()
                        .is_some_and(|h| h.start <= range.start && h.end >= range.end) =>
            {
                heading.push_str(&text)
            }
            Event::Html(html) if depth <= 1 => match html.trim() {
                BEGIN => {
                    if begin.is_some() {
                        return None;
                    }
                    marked = true;
                    begin = Some(range);
                }
                END => {
                    if end.is_some() {
                        return None;
                    }
                    marked = true;
                    end = Some(range);
                }
                _ => {}
            },
            _ => {}
        }
    }
    if marked {
        let (start, stop) = (begin?, end?);
        if start.end > stop.start
            || !markdown[stop.end..].trim().is_empty()
            || markdown[..start.start].trim().is_empty()
        {
            return None;
        }
        let content = start.end..stop.start;
        let label = markdown[content.clone()]
            .trim_start()
            .lines()
            .next()
            .unwrap_or("")
            .trim_start_matches('#')
            .trim();
        return Some(Section {
            start: start.start,
            content,
            heading: label.to_owned(),
            marked: true,
        });
    }
    let heading_range = last_heading?;
    if !reference_heading(&heading)
        || !linked_list(&markdown[heading_range.end..])
        || markdown[..heading_range.start].trim().is_empty()
    {
        return None;
    }
    Some(Section {
        start: heading_range.start,
        content: heading_range.start..markdown.len(),
        heading,
        marked: false,
    })
}

pub fn preview(data_dir: &Path, id: &str, version: i64) -> Result<Option<ReferenceSection>> {
    let markdown: String = open(data_dir)?
        .query_row(
            "SELECT markdown FROM drafts WHERE issue_id = ?1 AND version = ?2",
            rusqlite::params![id, version],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    Ok(section(&markdown).map(|section| ReferenceSection {
        heading: section.heading,
        marked: section.marked,
    }))
}

pub(super) fn for_result(markdown: &str, keep: bool) -> Cow<'_, str> {
    let Some(section) = section(markdown) else {
        return Cow::Borrowed(markdown);
    };
    let body = markdown[..section.start].trim_end();
    if !keep {
        Cow::Owned(format!("{body}\n"))
    } else if section.marked {
        Cow::Owned(format!("{body}\n\n{}\n", markdown[section.content].trim()))
    } else {
        Cow::Borrowed(markdown)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::nuts;
    use std::fs;

    const BODY: &str = "# 文章\n\n正文里的[读者链接](https://example.org/read)和说明。\n\n![截图](asset/figure.png)";
    const LEGACY: &str = "## 资料来源\n\n- [出处](https://example.org/source)";

    #[test]
    fn recognizes_only_an_explicit_block_or_a_final_reference_list() {
        let legacy = format!("{BODY}\n\n{LEGACY}\n");
        assert!(!section(&legacy).unwrap().marked);
        assert_eq!(for_result(&legacy, false), format!("{BODY}\n"));
        assert_eq!(for_result(&legacy, true), legacy);

        let marked = format!("{BODY}\n\n{BEGIN}\n\n{LEGACY}\n\n{END}\n");
        assert!(section(&marked).unwrap().marked);
        assert_eq!(for_result(&marked, false), format!("{BODY}\n"));
        assert_eq!(for_result(&marked, true), legacy);

        for unchanged in [
            format!("{legacy}\n## 附录\n\n公开正文"),
            format!("{legacy}\n\n写给读者的正文"),
            format!("{BODY}\n\n## 参考资料\n\n这是一段写给读者的说明。"),
            format!("{BODY}\n\n```markdown\n{LEGACY}\n```\n"),
            format!("{marked}\n公开正文"),
            format!("{BODY}\n\n{BEGIN}\n\n{LEGACY}"),
        ] {
            assert_eq!(for_result(&unchanged, false), unchanged);
        }
    }

    #[test]
    fn saved_choices_apply_to_recreation_without_changing_the_review_draft() {
        let temp = tempfile::tempdir().unwrap();
        let db = temp.path();
        let markdown = format!("{BODY}\n\n{LEGACY}\n");
        for keep in [false, true] {
            let id = nuts::create(db, "Essay", "source.md", "source").unwrap();
            let claim = nuts::claim(db, &id, None).unwrap();
            nuts::submit(db, &id, &claim.token, &markdown).unwrap();
            assert_eq!(preview(db, &id, 1).unwrap().unwrap().heading, "资料来源");
            let index = |path: &Path| Ok(path.to_path_buf());
            let path = nuts::save_result(db, &id, 1, keep.then_some(true), index).unwrap();
            let expected = if keep {
                markdown.clone()
            } else {
                format!("{BODY}\n")
            };
            assert_eq!(fs::read_to_string(&path).unwrap(), expected);
            assert_eq!(nuts::drafts(db, &id).unwrap()[0].markdown, markdown);
            fs::remove_file(&path).unwrap();
            let replay = nuts::save_result(db, &id, 1, None, index).unwrap();
            assert_eq!(fs::read_to_string(&replay).unwrap(), expected);
        }
    }
}
