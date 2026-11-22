use std::path::Path;

use rusqlite::{params, TransactionBehavior};
use serde::Serialize;
use uuid::Uuid;

use super::{open, validate_markdown, Result};

const DEFAULT: &str = "default";

#[derive(Serialize)]
pub struct Board {
    id: String,
    name: String,
}

pub fn boards(data_dir: &Path) -> Result<Vec<Board>> {
    let db = open(data_dir)?;
    let mut query = db
        .prepare("SELECT id, name FROM nuts_boards ORDER BY rowid")
        .map_err(|e| e.to_string())?;
    let rows = query
        .query_map([], |row| {
            Ok(Board {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut boards = vec![Board {
        id: DEFAULT.into(),
        name: "随手记".into(),
    }];
    for row in rows {
        boards.push(row.map_err(|e| e.to_string())?);
    }
    Ok(boards)
}

pub fn create_board(data_dir: &Path, name: &str, scene: &str, language: &str) -> Result<String> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 45 {
        return Err("Enter a board name of up to 45 characters".into());
    }
    let id = Uuid::new_v4().to_string();
    super::settings::scene(scene)?;
    let mut db = open(data_dir)?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO nuts_boards VALUES (?1, ?2)", params![id, name])
        .map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO nuts_board_scenes VALUES (?1, ?2)",
        params![id, scene],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO nuts_board_locales VALUES (?1, ?2)",
        params![id, language],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(id)
}

pub(super) fn ensure_board(db: &rusqlite::Connection, board_id: &str) -> Result<()> {
    if board_id != DEFAULT
        && !db
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM nuts_boards WHERE id = ?1)",
                [board_id],
                |r| r.get::<_, bool>(0),
            )
            .map_err(|e| e.to_string())?
    {
        return Err("Board not found".into());
    }
    Ok(())
}

#[derive(Serialize)]
pub struct Card {
    id: String,
    title: String,
    excerpt: String,
    kind: String,
    x: i64,
    y: i64,
    issue_id: Option<String>,
    issue_title: Option<String>,
    url: Option<String>,
    preview_image: Option<String>,
    preview_ready: bool,
    image_scale: Option<u16>,
}

pub fn list(data_dir: &Path, board_id: &str) -> Result<Vec<Card>> {
    let db = open(data_dir)?;
    let mut query = db
        .prepare("SELECT board_cards.id, COALESCE(nuts_link_previews.title, board_cards.title), substr(board_cards.markdown, 1, 360), kind, x, y,
            board_cards.issue_id, issues.title, CASE WHEN kind = 'link' THEN board_cards.markdown END, nuts_link_previews.image, nuts_link_previews.card_id IS NOT NULL, nuts_image_scales.percent FROM board_cards LEFT JOIN nuts_image_scales ON nuts_image_scales.card_id = board_cards.id LEFT JOIN nuts_link_previews ON nuts_link_previews.card_id = board_cards.id LEFT JOIN issues ON issues.id = board_cards.issue_id  WHERE COALESCE((SELECT board_id FROM nuts_card_boards WHERE card_id = board_cards.id), 'default') = ?1 AND NOT EXISTS (SELECT 1 FROM nuts_archived_issues WHERE issue_id = board_cards.issue_id) ORDER BY board_cards.rowid")
        .map_err(|error| error.to_string())?;
    let rows = query
        .query_map([board_id], |row| {
            Ok(Card {
                id: row.get(0)?,
                title: row.get(1)?,
                excerpt: row.get(2)?,
                kind: row.get(3)?,
                x: row.get(4)?,
                y: row.get(5)?,
                issue_id: row.get(6)?,
                issue_title: row.get(7)?,
                url: row.get(8)?,
                preview_image: row.get(9)?,
                preview_ready: row.get(10)?,
                image_scale: row.get(11)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<rusqlite::Result<_>>()
        .map_err(|error| error.to_string())
}

pub fn remove(data_dir: &Path, board_id: &str, ids: &[String], issue_id: Option<&str>) -> Result<()> {
    let mut db = open(data_dir)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    ensure_board(&tx, board_id)?;
    for id in ids {
        if let Some(issue_id) = issue_id {
            remove_material(&tx, id, issue_id)?;
        }
        let removed = tx.execute(
            "DELETE FROM board_cards WHERE id = ?1 AND issue_id IS ?3
             AND COALESCE((SELECT board_id FROM nuts_card_boards WHERE card_id = ?1), 'default') = ?2",
            params![id, board_id, issue_id],
        ).map_err(|error| error.to_string())?;
        if removed != 1 {
            return Err("Selection changed. Select the cards again.".into());
        }
        tx.execute("DELETE FROM nuts_card_boards WHERE card_id = ?1", [id])
            .map_err(|error| error.to_string())?;
        tx.execute("DELETE FROM nuts_image_scales WHERE card_id = ?1", [id])
            .map_err(|error| error.to_string())?;
        tx.execute("DELETE FROM nuts_image_usage WHERE card_id = ?1", [id])
            .map_err(|error| error.to_string())?;
        tx.execute("DELETE FROM nuts_link_previews WHERE card_id = ?1", [id])
            .map_err(|error| error.to_string())?;
    }
    tx.commit().map_err(|error| error.to_string())
}

fn remove_material(tx: &rusqlite::Transaction<'_>, id: &str, issue_id: &str) -> Result<()> {
    let (title, markdown): (String, String) = tx.query_row(
        "SELECT title, markdown FROM board_cards WHERE id = ?1 AND issue_id = ?2",
        params![id, issue_id], |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|error| error.to_string())?;
    let (mut source, mut names, from_board): (String, String, bool) = tx.query_row(
        "SELECT source, source_name, EXISTS(SELECT 1 FROM nuts_issue_boards WHERE issue_id = ?1)
         FROM issues WHERE id = ?1",
        [issue_id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|error| error.to_string())?;
    if from_board {
        let mut statement = tx.prepare(
            "SELECT title, markdown FROM board_cards WHERE issue_id = ?1 AND id <> ?2 ORDER BY rowid",
        ).map_err(|error| error.to_string())?;
        let remaining = statement.query_map(params![issue_id, id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }).map_err(|error| error.to_string())?;
        source.clear();
        let mut titles = Vec::new();
        for material in remaining {
            let (title, markdown) = material.map_err(|error| error.to_string())?;
            source.push_str(&format!("## {title}\n\n{markdown}\n\n"));
            titles.push(title);
        }
        names = titles.join(" · ");
    } else {
        let section = format!("\n\n## {title}\n\n{markdown}\n");
        let name = format!(" · {title}");
        let section_start = source.rfind(&section).ok_or("Issue material changed")?;
        let name_start = names.rfind(&name).ok_or("Issue material name changed")?;
        source.replace_range(section_start..section_start + section.len(), "");
        names.replace_range(name_start..name_start + name.len(), "");
    }
    tx.execute("UPDATE issues SET source = ?2, source_name = ?3 WHERE id = ?1",
        params![issue_id, source, names]).map_err(|error| error.to_string())?;
    Ok(())
}

pub fn detach_card(data_dir: &Path, board_id: &str, issue_id: &str, id: &str, x: i64, y: i64) -> Result<()> {
    let mut db = open(data_dir)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    remove_material(&tx, id, issue_id)?;
    let changed = tx.execute(
        "UPDATE board_cards SET issue_id = NULL, x = ?4, y = ?5 WHERE id = ?1 AND issue_id = ?3
         AND COALESCE((SELECT board_id FROM nuts_card_boards WHERE card_id = ?1), 'default') = ?2
         AND NOT EXISTS (SELECT 1 FROM nuts_archived_issues WHERE issue_id = ?3)",
        params![id, board_id, issue_id, x, y],
    ).map_err(|error| error.to_string())?;
    if changed != 1 {
        return Err("Selection changed. Select the card again.".into());
    }
    tx.commit().map_err(|error| error.to_string())
}

pub fn add(
    data_dir: &Path,
    board_id: &str,
    title: &str,
    markdown: &str,
    kind: &str,
    x: i64,
    y: i64,
) -> Result<String> {
    add_card(data_dir, board_id, title, markdown, kind, (x, y), None)
}

pub(super) fn add_card(
    data_dir: &Path,
    board_id: &str,
    title: &str,
    markdown: &str,
    kind: &str,
    (x, y): (i64, i64),
    issue_id: Option<&str>,
) -> Result<String> {
    validate_markdown(markdown)?;
    let id = Uuid::new_v4().to_string();
    let mut db = open(data_dir)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    ensure_board(&tx, board_id)?;
    tx.execute(
        "INSERT INTO board_cards (id, title, markdown, kind, x, y) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, title, markdown, kind, x, y],
    )
    .map_err(|error| error.to_string())?;
    tx.execute(
        "INSERT INTO nuts_card_boards VALUES (?1, ?2)",
        params![id, board_id],
    )
    .map_err(|e| e.to_string())?;
    if let Some(issue_id) = issue_id {
        let (x, y) = tx.query_row(
            "SELECT COALESCE(MAX(x) + 240, 30), COALESCE(MIN(y), 52)
             FROM board_cards WHERE issue_id = ?1",
            [issue_id], |row| Ok((row.get(0)?, row.get(1)?)),
        ).map_err(|e| e.to_string())?;
        attach_card_in_transaction(&tx, board_id, issue_id, &id, x, y)?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(id)
}

pub fn move_card(data_dir: &Path, id: &str, x: i64, y: i64) -> Result<()> {
    let changed = open(data_dir)?
        .execute(
            "UPDATE board_cards SET x = ?2, y = ?3 WHERE id = ?1",
            params![id, x, y],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Card is no longer on the board".into());
    }
    Ok(())
}

pub fn move_group(data_dir: &Path, issue_id: &str, dx: i64, dy: i64) -> Result<()> {
    let changed = open(data_dir)?
        .execute(
            "UPDATE board_cards SET x = x + ?2, y = y + ?3 WHERE issue_id = ?1",
            params![issue_id, dx, dy],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Issue group is no longer on the board".into());
    }
    Ok(())
}

pub fn create_issue(
    data_dir: &Path,
    board_id: &str,
    title: &str,
    card_ids: &[String],
    template: Option<&str>,
    goal: &str,
) -> Result<String> {
    let title = title.trim();
    if title.is_empty() || title.chars().count() > 160 {
        return Err("Enter an issue title of up to 160 characters".into());
    }
    if card_ids.is_empty() || card_ids.len() > 64 {
        return Err("Select between 1 and 64 cards".into());
    }
    let err = |error: rusqlite::Error| error.to_string();
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(err)?;
    ensure_board(&tx, board_id)?;
    let issue_id = Uuid::new_v4().to_string();
    let mut source = String::new();
    let mut titles = Vec::with_capacity(card_ids.len());
    for card_id in card_ids {
        let (name, markdown): (String, String) = tx
            .query_row(
                "SELECT title, markdown FROM board_cards WHERE id = ?1 AND issue_id IS NULL AND COALESCE((SELECT board_id FROM nuts_card_boards WHERE card_id = board_cards.id), 'default') = ?2",
                params![card_id, board_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|_| "A selected card is missing or already belongs to an issue")?;
        source.push_str(&format!("## {name}\n\n{markdown}\n\n"));
        validate_markdown(&source)?;
        tx.execute(
            "UPDATE board_cards SET issue_id = ?2 WHERE id = ?1",
            params![card_id, issue_id],
        )
        .map_err(err)?;
        titles.push(name);
    }
    tx.execute(
        "INSERT INTO issues (id, title, source_name, source, status) VALUES (?1, ?2, ?3, ?4, 'draft')",
        params![issue_id, title, titles.join(" · "), source],
    ).map_err(err)?;
    tx.execute(
        "INSERT INTO nuts_issue_boards VALUES (?1, ?2)",
        params![issue_id, board_id],
    )
    .map_err(err)?;
    super::settings::save_task(&tx, board_id, &issue_id, template, goal)?;
    tx.commit().map_err(err)?;
    Ok(issue_id)
}

pub fn attach_card(
    data_dir: &Path,
    board_id: &str,
    issue_id: &str,
    card_id: &str,
    x: i64,
    y: i64,
) -> Result<()> {
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    attach_card_in_transaction(&tx, board_id, issue_id, card_id, x, y)?;
    tx.commit().map_err(|e| e.to_string())
}

fn attach_card_in_transaction(
    tx: &rusqlite::Transaction<'_>,
    board_id: &str,
    issue_id: &str,
    card_id: &str,
    x: i64,
    y: i64,
) -> Result<()> {
    let (mut source, mut names): (String,String) = tx.query_row(
        "SELECT source, source_name FROM issues WHERE id = ?1 AND
         COALESCE((SELECT board_id FROM nuts_issue_boards WHERE issue_id = issues.id), 'default') = ?2",
        params![issue_id, board_id], |r| Ok((r.get(0)?,r.get(1)?)),
    ).map_err(|_| "Issue does not belong to this board")?;
    let (title, markdown): (String,String) = tx.query_row(
        "SELECT title, markdown FROM board_cards WHERE id = ?1 AND issue_id IS NULL AND
         COALESCE((SELECT board_id FROM nuts_card_boards WHERE card_id = board_cards.id), 'default') = ?2",
        params![card_id, board_id], |r| Ok((r.get(0)?,r.get(1)?)),
    ).map_err(|_| "Card is missing or already belongs to an issue")?;
    source.push_str(&format!("\n\n## {title}\n\n{markdown}\n"));
    validate_markdown(&source)?;
    names.push_str(" · ");
    names.push_str(&title);
    tx.execute(
        "UPDATE board_cards SET issue_id=?2, x=?3, y=?4 WHERE id=?1",
        params![card_id, issue_id, x, y],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "UPDATE issues SET source=?2, source_name=?3 WHERE id=?1",
        params![issue_id, source, names],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn open_issue(data_dir: &Path, id: &str) -> Result<()> {
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    let changed = tx
        .execute(
            "UPDATE issues SET status = 'open' WHERE id = ?1 AND status = 'draft'",
            [id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Issue is no longer waiting to be opened".into());
    }
    super::enqueue_open(&tx, id)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn batch_removal_rolls_back_if_selection_crosses_boards() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let other = create_board(dir, "Other", "article", "en-US").unwrap();
        let first = add(dir, DEFAULT, "First", "First", "note", 0, 0).unwrap();
        let second = add(dir, DEFAULT, "Second", "Second", "note", 0, 0).unwrap();
        let outside = add(dir, &other, "Outside", "Outside", "note", 0, 0).unwrap();
        assert!(remove(dir, DEFAULT, &[first.clone(), outside], None).is_err());
        assert_eq!(list(dir, DEFAULT).unwrap().len(), 2);
        remove(dir, DEFAULT, &[first, second], None).unwrap();
        assert!(list(dir, DEFAULT).unwrap().is_empty());
        assert_eq!(list(dir, &other).unwrap().len(), 1);
    }

    #[test]
    fn grouped_link_removal_updates_the_next_claim() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let note = add(dir, DEFAULT, "Notes", "Keep this", "note", 0, 0).unwrap();
        let url = "https://example.com/unavailable";
        let link = add(dir, DEFAULT, "example.com", url, "link", 0, 0).unwrap();
        let issue = create_issue(dir, DEFAULT, "Issue", &[note, link.clone()], None, "").unwrap();
        assert!(remove(dir, DEFAULT, std::slice::from_ref(&link), None).is_err());
        remove(dir, DEFAULT, &[link], Some(&issue)).unwrap();
        assert_eq!(list(dir, DEFAULT).unwrap().len(), 1);
        open_issue(dir, &issue).unwrap();
        let claim = super::super::claim(dir, &issue, None).unwrap();
        assert!(claim.source.contains("Keep this"));
        assert!(!claim.source.contains(url));
        assert_eq!(claim.issue.source_name, "Notes");
    }

    #[test]
    fn saved_cards_become_one_claimable_issue() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let note = add(dir, DEFAULT, "想法", "比较提问", "note", 10, 20).unwrap();
        let sample = include_str!("../../../../tests/fixtures/nuts/classroom-observation.md");
        let file = add(dir, DEFAULT, "课堂.md", sample, "markdown", 240, 40).unwrap();
        let other = create_board(dir, "另一张板", "article", "en-US").unwrap();
        let other_card = add(dir, &other, "独立内容", "正文", "note", 32, 40).unwrap();
        assert_eq!(list(dir, &other).unwrap().len(), 1);
        assert!(create_issue(
            dir,
            DEFAULT,
            "跨板混合",
            &[note.clone(), other_card.clone()],
            None,
            ""
        )
        .is_err());
        let other_issue = create_issue(
            dir,
            &other,
            "另一张板的议题",
            &[other_card],
            Some("做提纲"),
            "比较课堂问题",
        )
        .unwrap();
        assert_eq!(crate::core::nuts::list(dir).unwrap()[0].board_id, other);
        assert_eq!(
            list(dir, &other).unwrap()[0].issue_id.as_deref(),
            Some(other_issue.as_str())
        );
        let rules =
            super::super::settings::save_rules(dir, &other, "验证规则", "保留证据", 1).unwrap();
        assert_eq!(rules.version, 2);
        assert!(super::super::settings::save_rules(dir, &other, "旧编辑", "冲突", 1).is_err());
        open_issue(dir, &other_issue).unwrap();
        let claim = crate::core::nuts::claim(dir, &other_issue, None).unwrap();
        assert_eq!(claim.task.template.as_deref(), Some("做提纲"));
        assert_eq!(claim.task.goal, "比较课堂问题");
        assert_eq!(claim.rules.text, "保留证据");
        super::super::settings::save_rules(dir, &other, "新规则", "另行规则", 2).unwrap();
        let from_issue = super::super::settings::issue_context(dir, &other_issue, "en-US").unwrap();
        assert_eq!(from_issue["rules"]["version"], 2);
        assert_eq!(from_issue["rules"]["text"], "保留证据");
        move_card(dir, &note, 65, 75).unwrap();
        assert_eq!(
            (
                list(dir, DEFAULT).unwrap()[0].x,
                list(dir, DEFAULT).unwrap()[0].y
            ),
            (65, 75)
        );
        assert!(create_issue(
            dir,
            DEFAULT,
            "课堂",
            &[note.clone(), note.clone()],
            None,
            ""
        )
        .is_err());
        assert_eq!(list(dir, DEFAULT).unwrap().len(), 2);
        let issue = create_issue(dir, DEFAULT, "课堂", &[note, file], None, "").unwrap();
        let cards = list(dir, DEFAULT).unwrap();
        assert_eq!(cards.len(), 2);
        assert_eq!((cards[0].x, cards[0].y), (65, 75));
        assert!(cards
            .iter()
            .all(|card| card.issue_id.as_deref() == Some(issue.as_str())
                && card.issue_title.as_deref() == Some("课堂")));
        move_card(dir, &cards[0].id, 90, 100).unwrap();
        assert_eq!(
            (
                list(dir, DEFAULT).unwrap()[0].x,
                list(dir, DEFAULT).unwrap()[0].y
            ),
            (90, 100)
        );
        assert!(create_issue(dir, DEFAULT, "重复成题", &[cards[0].id.clone()], None, "").is_err());
        let before = list(dir, DEFAULT).unwrap();
        move_group(dir, &issue, -1000, 5000).unwrap();
        let after = list(dir, DEFAULT).unwrap();
        assert_eq!(after[0].x, before[0].x - 1000);
        assert_eq!(after[1].x - after[0].x, before[1].x - before[0].x);
        assert!(before
            .iter()
            .zip(after.iter())
            .all(|(old, new)| new.y == old.y + 5000));
        assert!(crate::core::nuts::claim(dir, &issue, None).is_err());
        open_issue(dir, &issue).unwrap();
        let claim = crate::core::nuts::claim(dir, &issue, None).unwrap();
        assert!(claim.source.contains("比较提问") && claim.source.contains(sample));
        let link = add(
            dir,
            DEFAULT,
            "example.org",
            "https://example.org/study",
            "link",
            2010,
            -1250,
        )
        .unwrap();
        attach_card(dir, DEFAULT, &issue, &link, 2250, -1230).unwrap();
        let current_card = list(dir, DEFAULT)
            .unwrap()
            .into_iter()
            .find(|card| card.id == link)
            .unwrap();
        assert_eq!((current_card.x, current_card.y), (2250, -1230));
        assert_eq!(
            current_card.url.as_deref(),
            Some("https://example.org/study")
        );
        assert!(!claim.source.contains("example.org"));
        assert!(attach_card(dir, DEFAULT, &issue, &link, 3500, 2500).is_err());
        crate::core::nuts::reopen(dir, &issue).unwrap();
        let next = crate::core::nuts::claim(dir, &issue, None).unwrap();
        assert!(next.source.contains("https://example.org/study"));
        detach_card(dir, DEFAULT, &issue, &link, -500, 900).unwrap();
        let detached = list(dir, DEFAULT).unwrap().into_iter().find(|card| card.id == link).unwrap();
        assert_eq!((detached.x, detached.y, detached.issue_id), (-500, 900, None));
        let next_issue = crate::core::nuts::list(dir).unwrap().remove(0);
        assert!(!next_issue.source_name.contains("example.org"));
        crate::core::nuts::submit(dir, &issue, &next.token, "## Draft").unwrap();
        crate::core::nuts::save_result(dir, &issue, 1, |_| Ok(())).unwrap();
        crate::core::nuts::set_archived(dir, &issue, true).unwrap();
        assert_eq!(list(dir, DEFAULT).unwrap().len(), 1);
        assert!(crate::core::nuts::claim(dir, &issue, Some("supplement".into())).is_err());
        assert!(crate::core::nuts::reopen(dir, &issue).is_err());
        crate::core::nuts::set_archived(dir, &issue, false).unwrap();
        assert_eq!(list(dir, DEFAULT).unwrap().len(), 3);
        crate::core::nuts::reopen(dir, &issue).unwrap();
        let restored = crate::core::nuts::claim_next(dir, Some(DEFAULT)).unwrap().unwrap();
        assert!(!restored.source.contains("https://example.org/study"));
    }
}
