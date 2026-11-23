use std::path::Path;

use rusqlite::{params, Connection, Transaction, TransactionBehavior};
use serde::Serialize;
use url::Url;
use uuid::Uuid;

use super::{open, Result};

#[derive(Serialize)]
pub struct Reference {
    id: String,
    title: String,
    url: String,
    reason: String,
    adopted: bool,
}

pub fn recommend(
    data_dir: &Path,
    issue_id: &str,
    link: &str,
    title: &str,
    reason: &str,
) -> Result<String> {
    let link = link.trim();
    let mut url = Url::parse(link).map_err(|_| "Enter a valid HTTP or HTTPS link")?;
    if link.len() > 4096
        || !matches!(url.scheme(), "http" | "https")
        || !url.has_host()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("Enter an HTTP or HTTPS link without credentials".into());
    }
    url.set_fragment(None);
    let title = title.trim();
    let reason = reason.trim();
    if title.is_empty()
        || title.chars().count() > 200
        || reason.is_empty()
        || reason.chars().count() > 1000
    {
        return Err(
            "Provide a title up to 200 characters and a reason up to 1000 characters".into(),
        );
    }
    let db = open(data_dir)?;
    db.execute(
        "INSERT INTO issue_refs (id, issue_id, url, title, reason)
         SELECT ?1, id, ?3, ?4, ?5 FROM issues WHERE id = ?2
         ON CONFLICT(issue_id, url) DO NOTHING",
        params![
            Uuid::new_v4().to_string(),
            issue_id,
            url.as_str(),
            title,
            reason
        ],
    )
    .map_err(|error| error.to_string())?;
    db.query_row(
        "SELECT id FROM issue_refs WHERE issue_id = ?1 AND url = ?2",
        params![issue_id, url.as_str()],
        |row| row.get(0),
    )
    .map_err(|error| match error {
        rusqlite::Error::QueryReturnedNoRows => "Issue not found".into(),
        other => other.to_string(),
    })
}

pub fn adopt(data_dir: &Path, issue_id: &str, id: &str) -> Result<()> {
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    adopt_in(&tx, issue_id, id)?;
    tx.commit().map_err(|error| error.to_string())
}

fn adopt_in(tx: &Transaction<'_>, issue_id: &str, id: &str) -> Result<()> {
    let (url, title, board_id, has_card): (String, String, String, bool) = tx
        .query_row(
            "SELECT r.url, r.title, COALESCE(b.board_id, 'default'),
            EXISTS(SELECT 1 FROM nuts_reference_cards WHERE ref_id = r.id)
         FROM issue_refs r LEFT JOIN nuts_issue_boards b ON b.issue_id = r.issue_id
         WHERE r.id = ?1 AND r.issue_id = ?2
           AND NOT EXISTS(SELECT 1 FROM nuts_archived_issues WHERE issue_id = r.issue_id)",
            params![id, issue_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|error| error.to_string())?;
    if !has_card {
        let mut query = tx
            .prepare(
                "SELECT c.id, c.markdown, c.issue_id IS NOT NULL FROM board_cards c
             LEFT JOIN nuts_card_boards b ON b.card_id = c.id
             WHERE c.kind = 'link' AND COALESCE(b.board_id, 'default') = ?1
               AND (c.issue_id = ?2 OR c.issue_id IS NULL)
             ORDER BY (c.issue_id IS NOT NULL) DESC, c.rowid",
            )
            .map_err(|error| error.to_string())?;
        let rows = query
            .query_map(params![board_id, issue_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, bool>(2)?,
                ))
            })
            .map_err(|error| error.to_string())?;
        let mut existing = None;
        for row in rows {
            let (card, link, attached) = row.map_err(|error| error.to_string())?;
            if same_link(&link, &url) {
                existing = Some((card, attached));
                break;
            }
        }
        let created = existing.is_none();
        let (card, already_attached) =
            existing.unwrap_or_else(|| (Uuid::new_v4().to_string(), false));
        if already_attached {
            super::board::remove_material(tx, &card, issue_id)?;
        } else {
            let (x,y): (i64,i64) = tx.query_row(
                "SELECT COALESCE(MAX(c.x + CASE WHEN c.kind IN ('png','jpg','jpeg','gif','webp')
                       THEN MAX(220, 12 + 440 * COALESCE(s.percent,100) / 100) ELSE 220 END) + 24,
                        (SELECT MAX(other.x) + 700 FROM board_cards other
                         LEFT JOIN nuts_card_boards b ON b.card_id = other.id
                         WHERE COALESCE(b.board_id, 'default') = ?2), 30),
                        COALESCE(MIN(c.y), 52)
                 FROM board_cards c LEFT JOIN nuts_image_scales s ON s.card_id = c.id
                 WHERE c.issue_id = ?1",
                params![issue_id, board_id], |row| Ok((row.get(0)?,row.get(1)?)),
            ).map_err(|error| error.to_string())?;
            if created {
                tx.execute(
                    "INSERT INTO board_cards (id,title,markdown,kind,x,y,issue_id)
                     VALUES (?1,?2,?3,'link',?4,?5,?6)",
                    params![card, title, url, x, y, issue_id],
                )
                .map_err(|error| error.to_string())?;
                tx.execute(
                    "INSERT INTO nuts_card_boards VALUES (?1,?2)",
                    params![card, board_id],
                )
                .map_err(|error| error.to_string())?;
            } else {
                tx.execute(
                    "UPDATE board_cards SET issue_id = ?2, x = ?3, y = ?4 WHERE id = ?1",
                    params![card, issue_id, x, y],
                )
                .map_err(|error| error.to_string())?;
            }
        }
        tx.execute(
            "INSERT INTO nuts_reference_cards VALUES (?1,?2,?3)",
            params![id, card, created],
        )
        .map_err(|error| error.to_string())?;
    }
    tx.execute("UPDATE issue_refs SET adopted = 1 WHERE id = ?1", [id])
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn same_link(candidate: &str, reference: &str) -> bool {
    Url::parse(candidate.trim()).is_ok_and(|mut url| {
        url.set_fragment(None);
        url.as_str() == reference
    })
}

pub(super) fn backfill_board(db: &mut Connection, board_id: &str) -> Result<()> {
    const PENDING: &str = "SELECT r.issue_id,r.id FROM issue_refs r
        LEFT JOIN nuts_issue_boards b ON b.issue_id = r.issue_id
        WHERE r.adopted = 1 AND COALESCE(b.board_id, 'default') = ?1
          AND NOT EXISTS(SELECT 1 FROM nuts_reference_cards WHERE ref_id = r.id)
          AND NOT EXISTS(SELECT 1 FROM nuts_archived_issues WHERE issue_id = r.issue_id)";
    let exists: bool = db
        .query_row(&format!("SELECT EXISTS({PENDING})"), [board_id], |row| {
            row.get(0)
        })
        .map_err(|error| error.to_string())?;
    if !exists {
        return Ok(());
    }
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    let refs = {
        let mut query = tx.prepare(PENDING).map_err(|error| error.to_string())?;
        let rows = query
            .query_map([board_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|error| error.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|error| error.to_string())?
    };
    for (issue_id, id) in refs {
        adopt_in(&tx, &issue_id, &id)?;
    }
    tx.commit().map_err(|error| error.to_string())
}

pub fn revoke(data_dir: &Path, issue_id: &str, id: &str) -> Result<()> {
    use rusqlite::OptionalExtension;
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    let changed = tx
        .execute(
            "UPDATE issue_refs SET adopted = 0 WHERE issue_id = ?1 AND id = ?2",
            params![issue_id, id],
        )
        .map_err(|error| error.to_string())?;
    if changed != 1 {
        return Err("Recommendation not found in this issue".into());
    }
    let linked: Option<(String, bool)> = tx
        .query_row(
            "SELECT card_id, created_for_reference FROM nuts_reference_cards WHERE ref_id = ?1",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some((card, created)) = linked {
        tx.execute("DELETE FROM nuts_reference_cards WHERE ref_id = ?1", [id])
            .map_err(|error| error.to_string())?;
        if created {
            super::board::delete_card(&tx, &card)?;
        } else {
            tx.execute(
                "UPDATE board_cards SET issue_id = NULL WHERE id = ?1 AND issue_id = ?2",
                params![card, issue_id],
            )
            .map_err(|error| error.to_string())?;
        }
    }
    tx.commit().map_err(|error| error.to_string())
}

pub(super) fn attach_matching_card(
    tx: &Transaction<'_>,
    issue_id: &str,
    card_id: &str,
    url: &str,
) -> Result<bool> {
    let mut query = tx
        .prepare(
            "SELECT r.id,r.url,EXISTS(SELECT 1 FROM nuts_reference_cards WHERE ref_id = r.id)
         FROM issue_refs r WHERE r.issue_id = ?1",
        )
        .map_err(|error| error.to_string())?;
    let rows = query
        .query_map([issue_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, bool>(2)?,
            ))
        })
        .map_err(|error| error.to_string())?;
    for row in rows {
        let (id, reference, already_linked) = row.map_err(|error| error.to_string())?;
        if !same_link(url, &reference) {
            continue;
        }
        if already_linked {
            return Err("This reference already has a card in the issue".into());
        }
        tx.execute(
            "INSERT INTO nuts_reference_cards VALUES (?1,?2,0)",
            params![id, card_id],
        )
        .map_err(|error| error.to_string())?;
        tx.execute("UPDATE issue_refs SET adopted = 1 WHERE id = ?1", [id])
            .map_err(|error| error.to_string())?;
        return Ok(true);
    }
    Ok(false)
}

pub(super) fn unlink_card(tx: &Transaction<'_>, card: &str) -> Result<bool> {
    let changed = tx.execute(
        "UPDATE issue_refs SET adopted = 0 WHERE id = (SELECT ref_id FROM nuts_reference_cards WHERE card_id = ?1)",
        [card],
    ).map_err(|error| error.to_string())?;
    tx.execute(
        "DELETE FROM nuts_reference_cards WHERE card_id = ?1",
        [card],
    )
    .map_err(|error| error.to_string())?;
    Ok(changed == 1)
}

pub fn list(data_dir: &Path, issue_id: &str) -> Result<Vec<Reference>> {
    read(&open(data_dir)?, issue_id, false)
}

pub(super) fn read(db: &Connection, issue_id: &str, adopted_only: bool) -> Result<Vec<Reference>> {
    let mut query = db
        .prepare(
            "SELECT id, title, url, reason, adopted FROM issue_refs
         WHERE issue_id = ?1 AND (?2 = 0 OR adopted = 1) ORDER BY rowid",
        )
        .map_err(|error| error.to_string())?;
    let rows = query
        .query_map(params![issue_id, adopted_only], |row| {
            Ok(Reference {
                id: row.get(0)?,
                title: row.get(1)?,
                url: row.get(2)?,
                reason: row.get(3)?,
                adopted: row.get(4)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<rusqlite::Result<_>>()
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::nuts;

    #[test]
    fn adopted_links_enter_only_subsequent_claims() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let issue = nuts::create(dir, "课堂", "观察.md", "课堂观察").unwrap();
        let other = nuts::create(dir, "另一题", "观察.md", "课堂观察").unwrap();
        assert!(recommend(dir, "absent", "https://example.org/", "来源", "背景").is_err());
        assert!(recommend(dir, &issue, "file:///tmp/test", "来源", "背景").is_err());
        let id = recommend(dir, &issue, "https://example.org/#section", "来源", "背景").unwrap();
        let claim = nuts::claim(dir, &issue, None).unwrap();
        assert!(claim.references.is_empty());
        assert!(adopt(dir, &other, &id).is_err());
        adopt(dir, &issue, &id).unwrap();
        assert_eq!(
            recommend(dir, &issue, "https://EXAMPLE.org/", "重复来源", "背景").unwrap(),
            id
        );
        let refs = list(dir, &issue).unwrap();
        assert_eq!(refs.len(), 1);
        assert!(refs[0].adopted);
        assert!(claim.references.is_empty());
        nuts::submit(dir, &issue, &claim.token, "# 初稿").unwrap();
        let revision = nuts::claim(dir, &issue, Some("补充观察".into())).unwrap();
        assert_eq!(revision.references.len(), 1);
        assert_eq!(revision.references[0].url, "https://example.org/");
        assert_eq!(revision.references[0].title, "来源");
    }
    #[test]
    fn reference_cards_backfill_reuse_and_follow_board_operations() {
        use nuts::board;
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let note = board::add(dir, "default", "观察", "原素材", "note", 30, 52).unwrap();
        let original = board::add(
            dir,
            "default",
            "原始链接卡",
            "https://EXAMPLE.org/#part",
            "link",
            300,
            52,
        )
        .unwrap();
        let issue =
            board::create_issue(dir, "default", "课堂", &[note, original.clone()], None, "")
                .unwrap();
        let reused =
            recommend(dir, &issue, "https://example.org/", "推荐链接", "推荐理由").unwrap();
        let generated =
            recommend(dir, &issue, "https://example.net/", "另一个链接", "补充").unwrap();
        let db = open(dir).unwrap();
        db.execute(
            "UPDATE issue_refs SET adopted = 1 WHERE issue_id = ?1",
            [&issue],
        )
        .unwrap();
        let count = |sql| db.query_row(sql, [], |r| r.get::<_, i64>(0)).unwrap();
        assert_eq!(count("SELECT COUNT(*) FROM board_cards"), 2);
        board::list(dir, "default").unwrap();
        board::list(dir, "default").unwrap();
        adopt(dir, &issue, &reused).unwrap();
        assert_eq!(count("SELECT COUNT(*) FROM board_cards"), 3);
        assert_eq!(count("SELECT COUNT(*) FROM nuts_reference_cards"), 2);
        let original_link: String = db
            .query_row(
                "SELECT card_id FROM nuts_reference_cards WHERE ref_id=?1",
                [&reused],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(original_link, original);
        board::open_issue(dir, &issue).unwrap();
        let claim = nuts::claim(dir, &issue, None).unwrap();
        assert_eq!(claim.references.len(), 2);
        assert!(claim.source.contains("原素材"));
        assert!(!claim.source.contains("EXAMPLE.org"));

        revoke(dir, &issue, &generated).unwrap();
        assert_eq!(count("SELECT COUNT(*) FROM board_cards"), 2);
        board::detach_card(dir, "default", &issue, &original, -50, 100).unwrap();
        assert!(list(dir, &issue)
            .unwrap()
            .iter()
            .all(|reference| !reference.adopted));
        assert_eq!(
            count("SELECT COUNT(*) FROM board_cards WHERE issue_id IS NULL"),
            1
        );
        assert_eq!(claim.references.len(), 2);
        nuts::reopen(dir, &issue).unwrap();
        let next = nuts::claim(dir, &issue, None).unwrap();
        assert!(next.references.is_empty());
        assert!(!next.source.contains("example.net"));
        board::attach_card(dir, "default", &issue, &original, 300, 52).unwrap();
        assert_eq!(
            list(dir, &issue)
                .unwrap()
                .iter()
                .filter(|reference| reference.adopted)
                .count(),
            1
        );
        revoke(dir, &issue, &reused).unwrap();
        assert_eq!(
            count("SELECT COUNT(*) FROM board_cards WHERE issue_id IS NULL"),
            1
        );
        assert_eq!(count("SELECT COUNT(*) FROM nuts_reference_cards"), 0);
        assert_eq!(list(dir, &issue).unwrap()[0].reason, "推荐理由");
    }
}

#[derive(Serialize)]
pub struct LibraryReference {
    path: String,
    title: String,
    format: String,
}

pub fn attach_library_item(
    data_dir: &Path,
    issue_id: &str,
    item: &crate::models::ItemSummary,
) -> Result<()> {
    if !Path::new(&item.file_path).is_file() {
        return Err("The source file is no longer available".into());
    }
    let db = open(data_dir)?;
    db.execute(
        "INSERT INTO nuts_library_refs (issue_id, path, title, format)
         SELECT id, ?2, ?3, ?4 FROM issues WHERE id = ?1
         ON CONFLICT(issue_id, path) DO NOTHING",
        params![
            issue_id,
            item.file_path,
            item.title.as_deref().unwrap_or(&item.file_name),
            item.file_type
        ],
    )
    .map_err(|error| error.to_string())?;
    let exists = db
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM issues WHERE id=?1)",
            [issue_id],
            |row| row.get::<_, bool>(0),
        )
        .map_err(|error| error.to_string())?;
    if !exists {
        return Err("Issue not found".into());
    }
    Ok(())
}

pub(super) fn library_items(db: &Connection, issue_id: &str) -> Result<Vec<LibraryReference>> {
    let mut statement = db
        .prepare(
            "SELECT path, title, format FROM nuts_library_refs WHERE issue_id = ?1 ORDER BY rowid",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([issue_id], |row| {
            Ok(LibraryReference {
                path: row.get(0)?,
                title: row.get(1)?,
                format: row.get(2)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())
}
