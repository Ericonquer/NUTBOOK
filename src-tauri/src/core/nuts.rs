pub mod link_preview;
pub mod board;
pub mod materials;
pub mod references;
pub mod review;
pub mod settings;

use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::Duration,
};

use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::Serialize;
use uuid::Uuid;

const MAX_MARKDOWN_BYTES: usize = 2 * 1024 * 1024;

type Result<T> = std::result::Result<T, String>;

#[derive(Serialize)]
pub struct Issue {
    id: String,
    title: String,
    source_name: String,
    status: String,
    result_version: Option<i64>,
    board_id: String,
    latest_version: Option<i64>,
    archived_at: Option<String>,
}

#[derive(Serialize)]
pub struct Draft {
    version: i64,
    markdown: String,
}

#[derive(Serialize)]
pub struct Claim {
    issue: Issue,
    token: String,
    source: String,
    extra: Option<String>,
    previous: Option<Draft>,
    references: Vec<references::Reference>,
    library_references: Vec<references::LibraryReference>,
    images: Vec<materials::IssueImage>,
    rules: settings::Rules,
    task: settings::Task,
}

fn open(data_dir: &Path) -> Result<Connection> {
    fs::create_dir_all(data_dir).map_err(|error| error.to_string())?;
    let db = Connection::open(data_dir.join("nuts.sqlite3")).map_err(|error| error.to_string())?;
    db.busy_timeout(Duration::from_secs(3))
        .map_err(|error| error.to_string())?;
    db.execute_batch(
        "CREATE TABLE IF NOT EXISTS issues (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, source_name TEXT NOT NULL,
            source TEXT NOT NULL, status TEXT NOT NULL, token TEXT, supplemental TEXT
        );
        CREATE TABLE IF NOT EXISTS nuts_archived_issues (issue_id TEXT PRIMARY KEY, archived_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_review_rounds (
            issue_id TEXT NOT NULL, next_version INTEGER NOT NULL, base_version INTEGER NOT NULL,
            comments TEXT NOT NULL, feedback TEXT NOT NULL, PRIMARY KEY(issue_id,next_version)
        );
        CREATE TABLE IF NOT EXISTS nuts_open_order (seq INTEGER PRIMARY KEY, issue_id TEXT NOT NULL UNIQUE);
        CREATE TABLE IF NOT EXISTS drafts (
            issue_id TEXT NOT NULL, version INTEGER NOT NULL, token TEXT UNIQUE NOT NULL,
            markdown TEXT NOT NULL, PRIMARY KEY(issue_id, version)
        );
        CREATE TABLE IF NOT EXISTS board_cards (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, markdown TEXT NOT NULL, kind TEXT NOT NULL,
            x INTEGER NOT NULL, y INTEGER NOT NULL, issue_id TEXT
        );
        CREATE TABLE IF NOT EXISTS nuts_boards (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_board_locales (board_id TEXT PRIMARY KEY, language TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_board_scenes (board_id TEXT PRIMARY KEY, scene TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_board_rules (board_id TEXT PRIMARY KEY, name TEXT NOT NULL, text TEXT NOT NULL, version INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_issue_tasks (issue_id TEXT PRIMARY KEY, template TEXT, goal TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_claim_rules (token TEXT PRIMARY KEY, issue_id TEXT NOT NULL, rules TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_card_boards (card_id TEXT PRIMARY KEY, board_id TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_image_scales (card_id TEXT PRIMARY KEY, percent INTEGER NOT NULL CHECK(percent BETWEEN 25 AND 150));
        CREATE TABLE IF NOT EXISTS nuts_image_usage (card_id TEXT PRIMARY KEY, roles INTEGER NOT NULL, note TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_link_previews (
            card_id TEXT PRIMARY KEY, title TEXT, image TEXT
        );
        DELETE FROM nuts_link_previews
            WHERE trim(title) = '百度安全验证' OR (title IS NULL AND image IS NULL);
        CREATE TABLE IF NOT EXISTS nuts_issue_boards (issue_id TEXT PRIMARY KEY, board_id TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_library_refs (
            issue_id TEXT NOT NULL, path TEXT NOT NULL, title TEXT NOT NULL, format TEXT NOT NULL,
            PRIMARY KEY(issue_id, path)
        );
        CREATE TABLE IF NOT EXISTS issue_refs (
            id TEXT PRIMARY KEY, issue_id TEXT NOT NULL, url TEXT NOT NULL,
            title TEXT NOT NULL, reason TEXT NOT NULL, adopted INTEGER NOT NULL DEFAULT 0,
            UNIQUE(issue_id, url)
        );
        CREATE TABLE IF NOT EXISTS results (
            issue_id TEXT PRIMARY KEY, version INTEGER NOT NULL
        );",
    )
    .map_err(|error| error.to_string())?;
    Ok(db)
}

fn read_issue(row: &rusqlite::Row<'_>) -> rusqlite::Result<Issue> {
    Ok(Issue {
        id: row.get(0)?,
        title: row.get(1)?,
        source_name: row.get(2)?,
        status: row.get(3)?,
        result_version: row.get(4)?,
        board_id: row.get(5)?,
        latest_version: row.get(6)?,
        archived_at: row.get(7)?,
    })
}

fn validate_markdown(markdown: &str) -> Result<()> {
    if markdown.trim().is_empty() || markdown.len() > MAX_MARKDOWN_BYTES || markdown.contains('\0')
    {
        return Err("Markdown must contain text and be at most 2 MiB".into());
    }
    Ok(())
}

pub fn read_markdown(path: &Path) -> Result<String> {
    use std::io::Read;
    let file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut markdown = String::new();
    file.take((MAX_MARKDOWN_BYTES + 1) as u64)
        .read_to_string(&mut markdown)
        .map_err(|error| error.to_string())?;
    validate_markdown(&markdown)?;
    Ok(markdown)
}

pub fn create(data_dir: &Path, title: &str, source_name: &str, markdown: &str) -> Result<String> {
    let title = title.trim();
    if title.is_empty() || title.chars().count() > 160 {
        return Err("Enter an issue title of up to 160 characters".into());
    }
    if !matches!(
        Path::new(source_name)
            .extension()
            .and_then(|ext| ext.to_str())
            .map(str::to_ascii_lowercase)
            .as_deref(),
        Some("md" | "markdown")
    ) {
        return Err("Select a Markdown file".into());
    }
    validate_markdown(markdown)?;
    let id = Uuid::new_v4().to_string();
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO issues (id, title, source_name, source, status) VALUES (?1, ?2, ?3, ?4, 'open')",
        params![id, title, source_name, markdown],
    ).map_err(|error| error.to_string())?;
    enqueue_open(&tx, &id)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(id)
}

pub fn list(data_dir: &Path) -> Result<Vec<Issue>> {
    let db = open(data_dir)?;
    let mut statement = db
        .prepare("SELECT id, title, source_name, status,
            (SELECT version FROM results WHERE issue_id = issues.id),
            COALESCE((SELECT board_id FROM nuts_issue_boards WHERE issue_id = issues.id), 'default'), (SELECT MAX(version) FROM drafts WHERE issue_id = issues.id),
            (SELECT archived_at FROM nuts_archived_issues WHERE issue_id = issues.id) FROM issues ORDER BY rowid DESC")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], read_issue)
        .map_err(|error| error.to_string())?;
    rows.collect::<rusqlite::Result<_>>()
        .map_err(|error| error.to_string())
}

pub fn set_archived(data_dir: &Path, id: &str, archived: bool) -> Result<()> {
    let db = open(data_dir)?;
    let changed = if archived {
        db.execute(
            "INSERT OR IGNORE INTO nuts_archived_issues SELECT id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             FROM issues WHERE id = ?1 AND status = 'done'",
            [id],
        )
    } else {
        db.execute("DELETE FROM nuts_archived_issues WHERE issue_id = ?1", [id])
    }.map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Only a completed issue can be archived, and only an archived issue can be restored".into());
    }
    Ok(())
}

pub fn drafts(data_dir: &Path, id: &str) -> Result<Vec<Draft>> {
    let db = open(data_dir)?;
    let mut statement = db
        .prepare("SELECT version, markdown FROM drafts WHERE issue_id = ?1 ORDER BY version DESC")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([id], |row| {
            Ok(Draft {
                version: row.get(0)?,
                markdown: row.get(1)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<rusqlite::Result<_>>()
        .map_err(|error| error.to_string())
}

pub fn claim(data_dir: &Path, id: &str, supplement: Option<String>) -> Result<Claim> {
    if let Some(text) = &supplement {
        validate_markdown(text)?;
    }
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    let result = claim_in(&tx, id, supplement)?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(result)
}

pub fn claim_next(data_dir: &Path, board_id: Option<&str>) -> Result<Option<Claim>> {
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    if let Some(id) = board_id {
        board::ensure_board(&tx, id)?;
    }
    let issue = tx
        .query_row(
            "SELECT i.id FROM issues i LEFT JOIN nuts_open_order o ON o.issue_id = i.id
         LEFT JOIN nuts_issue_boards b ON b.issue_id = i.id
         WHERE i.status = 'open' AND (?1 IS NULL OR COALESCE(b.board_id, 'default') = ?1)
         ORDER BY o.seq IS NOT NULL, COALESCE(o.seq, i.rowid), i.rowid LIMIT 1",
            [board_id],
            |r| r.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    let next = issue.map(|id| claim_in(&tx, &id, None)).transpose()?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(next)
}

fn enqueue_open(db: &Connection, id: &str) -> Result<()> {
    db.execute(
        "INSERT OR REPLACE INTO nuts_open_order (issue_id) VALUES (?1)",
        [id],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}

fn claim_in(tx: &Connection, id: &str, supplement: Option<String>) -> Result<Claim> {
    let (mut issue, source, existing): (Issue, String, Option<String>) = tx
        .query_row(
            "SELECT id, title, source_name, status,
            (SELECT version FROM results WHERE issue_id = issues.id),
            COALESCE((SELECT board_id FROM nuts_issue_boards WHERE issue_id = issues.id), 'default'), (SELECT MAX(version) FROM drafts WHERE issue_id = issues.id),
            (SELECT archived_at FROM nuts_archived_issues WHERE issue_id = issues.id), source, supplemental FROM issues WHERE id = ?1",
            [id],
            |row| Ok((read_issue(row)?, row.get(8)?, row.get(9)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or("Issue not found")?;
    if issue.archived_at.is_some() {
        return Err("Restore this issue before claiming it".into());
    }
    let expected = if supplement.is_some() {
        "review"
    } else {
        "open"
    };
    if issue.status != expected && !(supplement.is_some() && issue.status == "done") {
        return Err(format!("Issue is {}; expected {expected}", issue.status));
    }
    let mut previous = tx.query_row(
        "SELECT version, markdown FROM drafts WHERE issue_id = ?1 ORDER BY version DESC LIMIT 1", [id],
        |row| Ok(Draft { version: row.get(0)?, markdown: row.get(1)? }),
    ).optional().map_err(|error| error.to_string())?;
    let extra = match (existing, supplement) {
        (Some(old), Some(new)) => Some(format!("{old}\n\n{new}")),
        (old, new) => new.or(old),
    };
    if let Some(text) = &extra {
        validate_markdown(text)?;
    }
    let references = references::read(tx, id, true)?;
    let library_references = references::library_items(tx, id)?;
    let images = materials::issue_images(tx, id)?;
    let rules = settings::load_rules(tx, &issue.board_id)?;
    let task = settings::load_task(tx, id)?;
    let token = Uuid::new_v4().to_string();
    tx.execute(
        "UPDATE issues SET status = 'claimed', token = ?2, supplemental = ?3 WHERE id = ?1",
        params![id, token, extra],
    )
    .map_err(|error| error.to_string())?;
    tx.execute(
        "INSERT INTO nuts_claim_rules VALUES (?1, ?2, ?3)",
        params![
            token,
            id,
            serde_json::to_string(&rules).map_err(|e| e.to_string())?
        ],
    )
    .map_err(|e| e.to_string())?;
    let mut extra = extra;
    if let Some((base, feedback)) = review::pending(tx, id)? {
        previous = Some(base);
        extra = Some(match extra {
            Some(text) => format!("{text}\n\n{feedback}"),
            None => feedback,
        });
    }
    issue.status = "claimed".into();
    Ok(Claim {
        issue,
        token,
        source,
        extra,
        previous,
        references,
        library_references,
        images,
        rules,
        task,
    })
}

pub fn submit(data_dir: &Path, id: &str, token: &str, markdown: &str) -> Result<i64> {
    validate_markdown(markdown)?;
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    let already: Option<(i64, String)> = tx
        .query_row(
            "SELECT version, markdown FROM drafts WHERE issue_id = ?1 AND token = ?2",
            params![id, token],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some((version, previous)) = already {
        return if previous == markdown {
            Ok(version)
        } else {
            Err("This claim already has a different draft".into())
        };
    }
    let updated = tx.execute(
        "UPDATE issues SET status = 'review', token = NULL WHERE id = ?1 AND token = ?2 AND status = 'claimed'",
        params![id, token],
    ).map_err(|error| error.to_string())?;
    if updated != 1 {
        return Err("Claim expired or does not match this issue".into());
    }
    let version: i64 = tx
        .query_row(
            "SELECT COALESCE(MAX(version), 0) + 1 FROM drafts WHERE issue_id = ?1",
            [id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    tx.execute(
        "INSERT INTO drafts VALUES (?1, ?2, ?3, ?4)",
        params![id, version, token, markdown],
    )
    .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(version)
}

pub fn save_result<T>(
    data_dir: &Path,
    issue_id: &str,
    version: i64,
    index: impl FnOnce(&Path) -> Result<T>,
) -> Result<T> {
    let error = |error: rusqlite::Error| error.to_string();
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(error)?;
    let (title, status, markdown, published): (String, String, String, Option<i64>) = tx
        .query_row(
            "SELECT issues.title, issues.status, drafts.markdown, results.version
         FROM drafts JOIN issues ON issues.id = drafts.issue_id
         LEFT JOIN results ON results.issue_id = issues.id
         WHERE drafts.issue_id = ?1 AND drafts.version = ?2",
            params![issue_id, version],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .optional()
        .map_err(error)?
        .ok_or("Draft version not found")?;

    if status != "review" && published != Some(version) {
        return Err("This version is no longer available to save as the result".into());
    }
    let issue_id = Uuid::parse_str(issue_id).map_err(|_| "Invalid issue ID")?;
    let directory = data_dir.join("nuts-results").join(issue_id.to_string());
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let directory = directory
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let safe_title: String = title
        .trim_matches(['.', ' '])
        .chars()
        .take(48)
        .map(|ch| {
            if ch.is_control() || matches!(ch, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|')
            {
                '_'
            } else {
                ch
            }
        })
        .collect();
    let path: PathBuf = directory.join(format!("NUTS - {safe_title} - v{version}.md"));

    if !path.is_file() {
        let mut staged =
            tempfile::NamedTempFile::new_in(&directory).map_err(|error| error.to_string())?;
        staged
            .write_all(markdown.as_bytes())
            .map_err(|error| error.to_string())?;
        staged
            .as_file()
            .sync_all()
            .map_err(|error| error.to_string())?;
        staged
            .persist_noclobber(&path)
            .map_err(|error| error.to_string())?;
    } else if published != Some(version) && read_markdown(&path)? != markdown {
        return Err("An existing file conflicts with this result".into());
    }

    let indexed = index(&path)?;
    if published == Some(version) {
        tx.commit().map_err(error)?;
        return Ok(indexed);
    }
    tx.execute(
        "INSERT INTO results (issue_id, version) VALUES (?1, ?2) ON CONFLICT(issue_id) DO UPDATE SET version=excluded.version",
        params![issue_id.to_string(), version],
    )
    .map_err(error)?;
    tx.execute(
        "UPDATE issues SET status = 'done' WHERE id = ?1",
        [issue_id.to_string()],
    )
    .map_err(error)?;
    tx.commit().map_err(error)?;
    Ok(indexed)
}

pub fn withdraw(data_dir: &Path, issue_id: &str) -> Result<()> {
    let changed = open(data_dir)?
        .execute(
            "UPDATE issues SET status = CASE WHEN EXISTS (
                SELECT 1 FROM nuts_review_rounds WHERE issue_id=?1
                AND next_version=(SELECT MAX(version)+1 FROM drafts WHERE issue_id=?1)
            ) THEN 'review' ELSE 'draft' END WHERE id = ?1 AND status = 'open'",
            [issue_id],
        )
        .map_err(|e| e.to_string())?;
    if changed == 0 {
        return Err("This issue is no longer waiting for an agent".into());
    }
    Ok(())
}

pub fn reopen(data_dir: &Path, issue_id: &str) -> Result<()> {
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    let updated = tx
        .execute(
            "UPDATE issues SET status = 'open', token = NULL WHERE id = ?1 AND status IN ('claimed', 'done') AND NOT EXISTS (SELECT 1 FROM nuts_archived_issues WHERE issue_id = ?1)",
            [issue_id],
        )
        .map_err(|error| error.to_string())?;
    if updated != 1 {
        return Err("Only a claimed or completed issue can be reopened".into());
    }
    enqueue_open(&tx, issue_id)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn next_claim_follows_open_order_and_board_scope() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let first_card = board::add(dir, "default", "第一张", "第一份资料", "note", 0, 0).unwrap();
        let first = board::create_issue(dir, "default", "先创建", &[first_card], None, "").unwrap();
        let second = create(dir, "先开放", "观察.md", "内容").unwrap();
        let other = board::create_board(dir, "研究", "research", "en-US").unwrap();
        let other_card = board::add(dir, &other, "证据", "课堂观察", "note", 0, 0).unwrap();
        let other_issue =
            board::create_issue(dir, &other, "研究题", &[other_card], None, "").unwrap();
        board::open_issue(dir, &other_issue).unwrap();
        board::open_issue(dir, &first).unwrap();
        assert_eq!(claim_next(dir, None).unwrap().unwrap().issue.id, second);
        let scoped = claim_next(dir, Some(&other)).unwrap().unwrap();
        assert_eq!(scoped.issue.id, other_issue);
        assert!(scoped.rules.text.starts_with("# Board rules"));
        assert_eq!(claim_next(dir, None).unwrap().unwrap().issue.id, first);
        assert!(claim_next(dir, None).unwrap().is_none());
        reopen(dir, &second).unwrap();
        assert_eq!(claim_next(dir, None).unwrap().unwrap().issue.id, second);
    }

    #[test]
    fn reviewed_version_is_a_reopenable_library_document() {
        use crate::core::cli::{self, CliRequest};
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let id = create(dir, "课堂 / 讨论", "观察.md", "# 初始观察").unwrap();
        let first = claim(dir, &id, None).unwrap();
        submit(dir, &id, &first.token, "# 第一版").unwrap();
        let second = claim(dir, &id, Some("# 新证据".into())).unwrap();
        submit(dir, &id, &second.token, "# 第二版").unwrap();

        assert!(save_result(dir, &id, 2, |_| Err::<(), _>("index failed".into())).is_err());
        assert_eq!(list(dir).unwrap()[0].status, "review");

        let index = |path: &Path| {
            let database = crate::db::Database::new(dir.join("library.sqlite3")).unwrap();
            let response = cli::execute(
                &database,
                &CliRequest {
                    action: "add".into(),
                    path: path.to_str().unwrap().into(),
                    caller_agent: None,
                    paths: None,
                },
            )
            .map_err(|error| error.message)?;
            cli::active_item_for_path(&database, &response.path)
                .map_err(|error| error.message)?
                .ok_or_else(|| "Missing library item".into())
        };
        let item = save_result(dir, &id, 2, index).unwrap();
        assert_eq!(fs::read_to_string(&item.file_path).unwrap(), "# 第二版");
        assert_eq!(list(dir).unwrap()[0].result_version, Some(2));
        assert_eq!(drafts(dir, &id).unwrap()[1].markdown, "# 第一版");
        fs::write(&item.file_path, "# 人工编辑").unwrap();
        let reopened = save_result(dir, &id, 2, index).unwrap();
        assert_eq!(reopened.id, item.id);
        assert_eq!(
            fs::read_to_string(reopened.file_path).unwrap(),
            "# 人工编辑"
        );
        assert!(save_result(dir, &id, 1, index).is_err());
        references::attach_library_item(dir, &id, &item).unwrap();
        references::attach_library_item(dir, &id, &item).unwrap();
        let again = claim(dir, &id, Some("补充发现".into())).unwrap();
        let references = serde_json::to_value(&again).unwrap();
        assert_eq!(
            references["library_references"].as_array().unwrap().len(),
            1
        );
        assert_eq!(references["library_references"][0]["path"], item.file_path);
        assert_eq!(again.previous.unwrap().version, 2);
        save_result(dir, &id, 2, index).unwrap();
        assert_eq!(list(dir).unwrap()[0].status, "claimed");
        submit(dir, &id, &again.token, "# 第三版").unwrap();
        let revised = save_result(dir, &id, 3, index).unwrap();
        assert_ne!(revised.file_path, item.file_path);
        assert_eq!(fs::read_to_string(&item.file_path).unwrap(), "# 人工编辑");
        assert_eq!(list(dir).unwrap()[0].result_version, Some(3));
    }

    #[test]
    fn issue_claims_and_revisions_are_atomic() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let id = create(dir, "课堂讨论", "观察.md", "# 初始观察").unwrap();

        let claims = std::thread::scope(|scope| {
            let one = scope.spawn(|| claim(dir, &id, None));
            let other = scope.spawn(|| claim(dir, &id, None));
            [one.join().unwrap(), other.join().unwrap()]
        });
        assert_eq!(claims.iter().filter(|result| result.is_ok()).count(), 1);
        let first = claims
            .into_iter()
            .find_map(std::result::Result::ok)
            .unwrap();

        reopen(dir, &id).unwrap();
        let active = claim(dir, &id, None).unwrap();
        assert!(submit(dir, &id, &first.token, "# 过期稿").is_err());
        assert_eq!(submit(dir, &id, &active.token, "# 第一版").unwrap(), 1);
        assert_eq!(submit(dir, &id, &active.token, "# 第一版").unwrap(), 1);
        assert!(submit(dir, &id, &active.token, "# 改过的第一版").is_err());

        let revised = claim(dir, &id, Some("# 新证据".into())).unwrap();
        assert_eq!(revised.source, "# 初始观察");
        assert_eq!(revised.extra.as_deref(), Some("# 新证据"));
        assert_eq!(revised.previous.unwrap().markdown, "# 第一版");
        assert_eq!(submit(dir, &id, &revised.token, "# 第二版").unwrap(), 2);
        let versions = drafts(dir, &id).unwrap();
        assert_eq!(versions.len(), 2);
        assert_eq!(versions[0].markdown, "# 第二版");
        assert_eq!(versions[1].markdown, "# 第一版");
    }
}
