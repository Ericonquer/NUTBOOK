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
pub struct SearchCard {
    id: String,
    title: String,
    board_id: String,
    kind: String,
}

fn is_han(character: char) -> bool {
    matches!(character, '\u{3400}'..='\u{4dbf}' | '\u{4e00}'..='\u{9fff}'
        | '\u{f900}'..='\u{faff}' | '\u{20000}'..='\u{323af}')
}

fn matches_with_extra_han(longer: &[char], shorter: &[char]) -> bool {
    // Keep both ends anchored so short queries cannot match across unrelated words.
    (1..shorter.len()).any(|gap| {
        is_han(longer[gap]) && longer[..gap] == shorter[..gap] && longer[gap + 1..] == shorter[gap..]
    })
}

pub fn search_cards(data_dir: &Path, query: &str) -> Result<Vec<SearchCard>> {
    let db = open(data_dir)?;
    let mut statement = db.prepare(
        "SELECT c.id, COALESCE(p.title, c.title), COALESCE(cb.board_id, 'default'),
                COALESCE((SELECT format FROM nuts_library_refs r
                    WHERE c.kind = 'library' AND r.issue_id = c.issue_id AND r.path = c.markdown), c.kind),
                CASE WHEN c.kind = 'note' THEN c.markdown ELSE '' END
         FROM board_cards c
         LEFT JOIN nuts_link_previews p ON p.card_id = c.id
         LEFT JOIN nuts_card_boards cb ON cb.card_id = c.id
         WHERE NOT EXISTS (SELECT 1 FROM nuts_archived_issues WHERE issue_id = c.issue_id)
         ORDER BY c.rowid DESC",
    ).map_err(|error| error.to_string())?;
    let rows = statement.query_map([], |row| {
        Ok((SearchCard {
            id: row.get(0)?,
            title: row.get(1)?,
            board_id: row.get(2)?,
            kind: row.get(3)?,
        }, row.get::<_, String>(4)?))
    }).map_err(|error| error.to_string())?;
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let query_chars: Vec<_> = query.chars().collect();
    let allow_approximate = query_chars.len() >= 2 && query_chars.iter().copied().all(is_han);
    let matches_approximately = |text: &str| {
        let chars: Vec<_> = text.chars().collect();
        let length = query_chars.len();
        chars.windows(length + 1).any(|window| matches_with_extra_han(window, &query_chars))
            || (length >= 3 && chars.windows(length - 1).any(|window| matches_with_extra_han(&query_chars, window)))
    };
    let mut matches = Vec::new();
    let mut approximate = Vec::new();
    for row in rows {
        let (card, body) = row.map_err(|error| error.to_string())?;
        let title = card.title.to_lowercase();
        let body = body.to_lowercase();
        if title.contains(&query) || body.contains(&query) {
            matches.push(card);
        } else if allow_approximate && (matches_approximately(&title) || matches_approximately(&body)) {
            approximate.push(card);
        }
    }
    matches.extend(approximate);
    Ok(matches)
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
    library_format: Option<String>,
    image_scale: Option<u16>,
}

pub fn list(data_dir: &Path, board_id: &str) -> Result<Vec<Card>> {
    let mut db = open(data_dir)?;
    super::references::backfill_board(&mut db, board_id)?;
    super::references::backfill_library_cards(&mut db, board_id)?;
    let mut query = db
        .prepare("SELECT board_cards.id, COALESCE(nuts_link_previews.title, board_cards.title), CASE WHEN kind = 'note' THEN board_cards.markdown ELSE substr(board_cards.markdown, 1, 360) END, kind, x, y,
            board_cards.issue_id, issues.title, CASE WHEN kind = 'link' THEN board_cards.markdown END, nuts_link_previews.image, nuts_link_previews.card_id IS NOT NULL, nuts_image_scales.percent,
            (SELECT format FROM nuts_library_refs r WHERE board_cards.kind = 'library'
             AND r.issue_id = board_cards.issue_id AND r.path = board_cards.markdown)
            FROM board_cards LEFT JOIN nuts_image_scales ON nuts_image_scales.card_id = board_cards.id LEFT JOIN nuts_link_previews ON nuts_link_previews.card_id = board_cards.id LEFT JOIN issues ON issues.id = board_cards.issue_id  WHERE COALESCE((SELECT board_id FROM nuts_card_boards WHERE card_id = board_cards.id), 'default') = ?1 AND NOT EXISTS (SELECT 1 FROM nuts_archived_issues WHERE issue_id = board_cards.issue_id) ORDER BY board_cards.rowid")
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
                library_format: row.get(12)?,
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
            let removed_library = tx.execute(
                "DELETE FROM nuts_library_refs WHERE issue_id = ?2 AND path = (
                    SELECT markdown FROM board_cards WHERE id = ?1 AND issue_id = ?2 AND kind = 'library'
                )", params![id, issue_id],
            ).map_err(|error| error.to_string())?;
            if removed_library == 0 && !super::references::unlink_card(&tx, id)? {
                remove_material(&tx, id, issue_id)?;
            }
        }
        let removed = tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM board_cards WHERE id = ?1 AND issue_id IS ?3
             AND COALESCE((SELECT board_id FROM nuts_card_boards WHERE card_id = ?1), 'default') = ?2)",
            params![id, board_id, issue_id], |row| row.get::<_,bool>(0),
        ).map_err(|error| error.to_string())?;
        if !removed {
            return Err("Selection changed. Select the cards again.".into());
        }
        delete_card(&tx, id)?;
    }
    tx.commit().map_err(|error| error.to_string())
}

pub(super) fn delete_card(tx: &rusqlite::Transaction<'_>, id: &str) -> Result<()> {
    for table in ["nuts_card_boards", "nuts_image_scales", "nuts_image_usage", "nuts_link_previews"] {
        tx.execute(&format!("DELETE FROM {table} WHERE card_id = ?1"), [id])
            .map_err(|error| error.to_string())?;
    }
    tx.execute("DELETE FROM board_cards WHERE id = ?1", [id])
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub(super) fn remove_material(tx: &rusqlite::Transaction<'_>, id: &str, issue_id: &str) -> Result<()> {
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
            "SELECT title, markdown FROM board_cards WHERE issue_id = ?1 AND id <> ?2 AND kind <> 'library'
                AND NOT EXISTS (SELECT 1 FROM nuts_reference_cards WHERE card_id = board_cards.id)
                ORDER BY rowid",
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
    let library_card = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM board_cards WHERE id = ?1 AND kind = 'library')",
        [id], |row| row.get::<_, bool>(0),
    ).map_err(|error| error.to_string())?;
    if library_card {
        return Err("Remove this library reference from the issue instead".into());
    }
    if !super::references::unlink_card(&tx, id)? {
        remove_material(&tx, id, issue_id)?;
    }
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
         COALESCE((SELECT board_id FROM nuts_issue_boards WHERE issue_id = issues.id), 'default') = ?2
         AND NOT EXISTS(SELECT 1 FROM nuts_archived_issues WHERE issue_id = issues.id)",
        params![issue_id, board_id], |r| Ok((r.get(0)?,r.get(1)?)),
    ).map_err(|_| "Issue does not belong to this board or is archived")?;
    let (title, markdown, kind): (String,String,String) = tx.query_row(
        "SELECT title, markdown, kind FROM board_cards WHERE id = ?1 AND issue_id IS NULL AND
         COALESCE((SELECT board_id FROM nuts_card_boards WHERE card_id = board_cards.id), 'default') = ?2",
        params![card_id, board_id], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?)),
    ).map_err(|_| "Card is missing or already belongs to an issue")?;
    tx.execute(
        "UPDATE board_cards SET issue_id=?2, x=?3, y=?4 WHERE id=?1",
        params![card_id, issue_id, x, y],
    )
    .map_err(|e| e.to_string())?;
    if kind == "link" && super::references::attach_matching_card(tx, issue_id, card_id, &markdown)? {
        return Ok(());
    }
    source.push_str(&format!("\n\n## {title}\n\n{markdown}\n"));
    validate_markdown(&source)?;
    names.push_str(" · ");
    names.push_str(&title);
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
    fn search_finds_full_note_body_and_card_titles_across_boards() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let other = create_board(dir, "Other", "article", "en-US").unwrap();
        let body = format!("为什么AI 这么厉害，大多数人却没办法用AI 赚到钱？\n{}真正赚到钱", "还有很多人想知道怎么".repeat(50));
        let note = add(dir, &other, "Idea", &body, "note", 0, 0).unwrap();
        let file = add(dir, DEFAULT, "ÉTUDE.md", &body, "markdown", 0, 0).unwrap();

        assert_eq!(list(dir, &other).unwrap()[0].excerpt, body);
        for query in ["赚钱", "赚到钱", "真正赚钱", "到钱"] {
            let results = search_cards(dir, query).unwrap();
            assert_eq!(results.len(), 1);
            assert_eq!(results[0].id, note);
            assert_eq!(results[0].board_id, other);
        }
        let short = add(dir, DEFAULT, "怎么赚钱", "正文", "note", 0, 0).unwrap();
        assert!(search_cards(dir, "怎么赚到钱").unwrap().iter().any(|card| card.id == short));
        assert!(search_cards(dir, "赚了很多钱").unwrap().is_empty());
        let results = search_cards(dir, "étude").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, file);
        assert_eq!(results[0].board_id, DEFAULT);
    }

    #[test]
    fn search_matches_one_extra_han_character_and_ranks_exact_first() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let exact = add(dir, DEFAULT, "一起复盘", "正文", "note", 0, 0).unwrap();
        let approximate = add(dir, DEFAULT, "周报", "明天复个盘", "note", 0, 0).unwrap();
        add(dir, DEFAULT, "计划", "安排复习，盘点资料", "note", 0, 0).unwrap();

        let ids = |query| {
            search_cards(dir, query).unwrap().into_iter().map(|card| card.id).collect::<Vec<_>>()
        };
        assert_eq!(ids("复盘"), [exact.clone(), approximate.clone()]);
        assert_eq!(ids("复个盘"), [approximate, exact]);
        assert!(ids(" ").is_empty());
    }

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
        crate::core::nuts::save_result(dir, &issue, 1, None, |_| Ok(())).unwrap();
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
