pub mod link_preview;
pub mod board;
pub mod board_files;
pub mod export;
pub mod draft_assets;
pub mod handoff;
pub mod materials;
pub mod references;
pub mod result_references;
pub mod review;
pub mod retro;
pub mod settings;

use std::{
    fs,
    io::Write,
    path::Path,
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
        CREATE TABLE IF NOT EXISTS nuts_draft_images (
            issue_id TEXT NOT NULL, version INTEGER NOT NULL, name TEXT NOT NULL,
            bytes BLOB NOT NULL, PRIMARY KEY(issue_id, version, name)
        );
        CREATE TABLE IF NOT EXISTS board_cards (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, markdown TEXT NOT NULL, kind TEXT NOT NULL,
            x INTEGER NOT NULL, y INTEGER NOT NULL, issue_id TEXT
        );
        CREATE TABLE IF NOT EXISTS nuts_boards (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_board_locales (board_id TEXT PRIMARY KEY, language TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_board_scenes (board_id TEXT PRIMARY KEY, scene TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_board_file_initialized (board_id TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS nuts_board_rules (board_id TEXT PRIMARY KEY, name TEXT NOT NULL, text TEXT NOT NULL, version INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_issue_tasks (issue_id TEXT PRIMARY KEY, template TEXT, goal TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_claim_rules (token TEXT PRIMARY KEY, issue_id TEXT NOT NULL, rules TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nuts_markdown_sources (card_id TEXT PRIMARY KEY, path TEXT NOT NULL);
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
        CREATE TABLE IF NOT EXISTS nuts_reference_cards (
            ref_id TEXT PRIMARY KEY, card_id TEXT NOT NULL UNIQUE, created_for_reference INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS nuts_result_reference_options (
            issue_id TEXT NOT NULL, version INTEGER NOT NULL, keep INTEGER NOT NULL,
            PRIMARY KEY(issue_id, version)
        );
        CREATE TABLE IF NOT EXISTS nuts_result_paths (
            issue_id TEXT NOT NULL, version INTEGER NOT NULL, path TEXT NOT NULL,
            PRIMARY KEY(issue_id, version)
        );
        CREATE TABLE IF NOT EXISTS results (
            issue_id TEXT PRIMARY KEY, version INTEGER NOT NULL
        );",
    )
    .map_err(|error| error.to_string())?;
    // Older databases represented the first board implicitly.
    db.execute_batch(
        "SAVEPOINT migrate_nuts_boards;
         CREATE TABLE IF NOT EXISTS nuts_board_registry (id INTEGER PRIMARY KEY CHECK(id=1));
         INSERT OR IGNORE INTO nuts_boards (id,name)
           SELECT 'default','随手记' WHERE NOT EXISTS (SELECT 1 FROM nuts_board_registry);
         INSERT OR IGNORE INTO nuts_board_registry VALUES (1);
         RELEASE migrate_nuts_boards;",
    ).map_err(|error| error.to_string())?;
    db.execute_batch(retro::SCHEMA).map_err(|error| error.to_string())?;
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
    tx.execute(
        "INSERT INTO nuts_issue_boards (issue_id, board_id)
         SELECT ?1,id FROM nuts_boards ORDER BY (id='default') DESC,rowid LIMIT 1",
        [&id],
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

pub fn delete_issue(data_dir: &Path, id: &str, delete_cards: bool) -> Result<()> {
    let mut db = open(data_dir)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    tx.execute("DELETE FROM nuts_reference_cards WHERE ref_id IN
        (SELECT id FROM issue_refs WHERE issue_id=?1)", [id]).map_err(|error| error.to_string())?;
    let cards_to_delete = {
        let mut query = tx.prepare("SELECT id FROM board_cards WHERE issue_id=?1 AND (?2 OR kind='library')")
            .map_err(|error| error.to_string())?;
        let rows = query.query_map(params![id, delete_cards], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|error| error.to_string())?
    };
    for card in cards_to_delete {
        board::delete_card(&tx, &card)?;
    }
    tx.execute("UPDATE board_cards SET issue_id=NULL WHERE issue_id=?1", [id])
        .map_err(|error| error.to_string())?;
    for table in [
        "nuts_archived_issues", "nuts_review_rounds", "nuts_open_order", "nuts_draft_images",
        "nuts_issue_tasks", "nuts_claim_rules", "nuts_issue_boards", "nuts_library_refs",
        "issue_refs", "nuts_result_reference_options", "nuts_result_paths", "nuts_retros",
        "drafts", "results",
    ] {
        tx.execute(&format!("DELETE FROM {table} WHERE issue_id=?1"), [id])
            .map_err(|error| error.to_string())?;
    }
    tx.execute("DELETE FROM issues WHERE id=?1", [id]).map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())
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
    let result = claim_in(data_dir, &tx, id, supplement)?;
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
    let next = issue.map(|id| claim_in(data_dir, &tx, &id, None)).transpose()?;
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

fn claim_in(data_dir: &Path, tx: &Connection, id: &str, supplement: Option<String>) -> Result<Claim> {
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
    let rules = settings::load_rules(data_dir, tx, &issue.board_id)?;
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

pub fn submit_file(data_dir: &Path, id: &str, token: &str, path: &Path) -> Result<i64> {
    let markdown = read_markdown(path)?;
    let assets = draft_assets::collect(path, &markdown)?;
    submit_with_assets(data_dir, id, token, &markdown, &assets)
}

pub fn submit(data_dir: &Path, id: &str, token: &str, markdown: &str) -> Result<i64> {
    submit_with_assets(data_dir, id, token, markdown, &[])
}

fn submit_with_assets(data_dir: &Path, id: &str, token: &str, markdown: &str, assets: &[draft_assets::Asset]) -> Result<i64> {
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
        if previous != markdown {
            return Err("This claim already has a different draft".into());
        }
        draft_assets::store(&tx, id, version, assets)?;
        tx.commit().map_err(|error| error.to_string())?;
        return Ok(version);
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
    draft_assets::store(&tx, id, version, assets)?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(version)
}

fn safe_file_title(title: &str) -> String {
    title
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
        .collect()
}

fn result_file_name(title: &str, version: i64) -> String {
    format!("NUTS - {} - v{version}.md", safe_file_title(title))
}

fn result_path(
    db: &Connection,
    data_dir: &Path,
    issue_id: &str,
    version: i64,
    filename: &str,
) -> Result<std::path::PathBuf> {
    let stored: Option<String> = db.query_row(
        "SELECT path FROM nuts_result_paths WHERE issue_id = ?1 AND version = ?2",
        params![issue_id, version], |row| row.get(0),
    ).optional().map_err(|error| error.to_string())?;
    if let Some(path) = stored {
        return Ok(path.into());
    }
    let id = Uuid::parse_str(issue_id).map_err(|_| "Invalid issue ID")?;
    let root = data_dir.join("nuts-results").join(id.to_string());
    let versioned = root.join(format!("v{version}"));
    let direct = root.join(filename);
    Ok(if versioned.join(filename).exists() || (!direct.exists() && versioned.is_dir()) {
        versioned.join(filename)
    } else {
        direct
    })
}

pub fn save_result<T>(
    data_dir: &Path,
    issue_id: &str,
    version: i64,
    keep_references: Option<bool>,
    index: impl FnOnce(&Path) -> Result<T>,
) -> Result<T> {
    let error = |error: rusqlite::Error| error.to_string();
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(error)?;
    let (title, status, markdown, published, board_id): (String, String, String, Option<i64>, String) = tx
        .query_row(
            "SELECT issues.title, issues.status, drafts.markdown, results.version,
                COALESCE((SELECT board_id FROM nuts_issue_boards WHERE issue_id = issues.id), 'default')
         FROM drafts JOIN issues ON issues.id = drafts.issue_id
         LEFT JOIN results ON results.issue_id = issues.id
         WHERE drafts.issue_id = ?1 AND drafts.version = ?2",
            params![issue_id, version],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .optional()
        .map_err(error)?
        .ok_or("Draft version not found")?;

    if status != "review" && published != Some(version) {
        return Err("This version is no longer available to save as the result".into());
    }
    let filename = result_file_name(&title, version);
    let existing = (published == Some(version))
        .then(|| result_path(&tx, data_dir, issue_id, version, &filename))
        .transpose()?;
    if let Some(path) = &existing {
        match fs::symlink_metadata(path) {
            Ok(metadata) if metadata.is_file() => {
                let indexed = index(path)?;
                tx.commit().map_err(error)?;
                return Ok(indexed);
            }
            Ok(_) => return Err("The saved result is not a regular file".into()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.to_string()),
        }
    }

    let keep_references = if existing.is_some() {
        tx.query_row(
            "SELECT keep FROM nuts_result_reference_options WHERE issue_id = ?1 AND version = ?2",
            params![issue_id, version],
            |row| row.get(0),
        ).optional().map_err(error)?.unwrap_or(true)
    } else {
        keep_references.unwrap_or(false)
    };
    let markdown = result_references::for_result(&markdown, keep_references);
    validate_markdown(&markdown)?;
    let issue_id = Uuid::parse_str(issue_id).map_err(|_| "Invalid issue ID")?;
    let path = if let Some(path) = existing {
        let parent = path.parent().ok_or("Result directory is missing")?;
        if !parent.symlink_metadata().is_ok_and(|meta| meta.is_dir()) {
            return Err("The result directory is missing or invalid".into());
        }
        let filename = path.file_name().ok_or("Result filename is missing")?;
        let directory = parent.canonicalize().map_err(|error| error.to_string())?;
        draft_assets::restore_result_assets(&tx, &issue_id.to_string(), version, directory.join(filename))?
    } else {
        let folder = settings::result_folder(data_dir, &tx, &board_id)?;
        let root = folder.join(settings::results_directory_name(&tx, &board_id)?);
        board_files::ensure_directory(&root)?;
        let directory = root.join(issue_id.to_string());
        board_files::ensure_directory(&directory)?;
        let directory = directory.canonicalize().map_err(|error| error.to_string())?;
        draft_assets::prepare_result(&tx, &issue_id.to_string(), version, directory.join(filename))?
    };
    let directory = path.parent().ok_or("Result directory is missing")?;

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
    } else if !fs::symlink_metadata(&path).is_ok_and(|meta| meta.is_file()) || read_markdown(&path)? != markdown {
        return Err("An existing file conflicts with this result".into());
    }

    let indexed = index(&path)?;
    let stored_path = path.to_str().ok_or("Result path is not valid UTF-8")?;
    tx.execute(
        "INSERT INTO nuts_result_paths VALUES (?1, ?2, ?3)
         ON CONFLICT(issue_id,version) DO UPDATE SET path=excluded.path",
        params![issue_id.to_string(), version, stored_path],
    ).map_err(error)?;
    tx.execute(
        "INSERT INTO nuts_result_reference_options VALUES (?1,?2,?3)
         ON CONFLICT(issue_id,version) DO UPDATE SET keep=excluded.keep",
        params![issue_id.to_string(), version, keep_references],
    ).map_err(error)?;
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
    if published != Some(version) {
        retro::enqueue(&tx, &issue_id.to_string(), version, &board_id)?;
    }
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
    fn deleting_an_issue_can_move_materials_back_to_the_same_board() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path();
        let board_id = board::create_board(data, "Board", "quick", "en-US").unwrap();
        let card = board::add(data, &board_id, "Material", "Keep this", "note", 0, 0).unwrap();
        let issue = board::create_issue(data, &board_id, "One", &[card.clone()], None, "").unwrap();
        let db = open(data).unwrap();
        db.execute("INSERT INTO board_cards VALUES ('library','Reference','original.md','library',0,0,?1)",
            [&issue]).unwrap();
        db.execute("INSERT INTO nuts_card_boards VALUES ('library',?1)", [&board_id]).unwrap();

        delete_issue(data, &issue, false).unwrap();

        let cards = board::list(data, &board_id).unwrap();
        let row = serde_json::to_value(&cards[0]).unwrap();
        assert_eq!(cards.len(), 1);
        assert_eq!(row["id"], card);
        assert!(row["issue_id"].is_null());
        assert!(list(data).unwrap().is_empty());
    }

    #[test]
    fn deleting_an_issue_frees_the_board_and_preserves_the_saved_file() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path();
        let other = board::create_board(data, "Other", "custom", "en-US").unwrap();
        let card = board::add(data, "default", "Material", "Example", "note", 0, 0).unwrap();
        let issue = board::create_issue(data, "default", "One", &[card], None, "").unwrap();
        board::open_issue(data, &issue).unwrap();
        let first = claim(data, &issue, None).unwrap();
        submit(data, &issue, &first.token, "# Saved").unwrap();
        let result = save_result(data, &issue, 1, None, |path| Ok(path.to_path_buf())).unwrap();
        let late = claim(data, &issue, Some("Update".into())).unwrap();
        assert!(!board::remove_empty_board(data, "default", false).unwrap());

        delete_issue(data, &issue, true).unwrap();
        delete_issue(data, &issue, true).unwrap();
        assert!(submit(data, &issue, &late.token, "# Late draft").is_err());
        assert!(board::list(data, "default").unwrap().is_empty());
        assert!(retro::list(data, Some("default")).unwrap().is_empty());
        assert_eq!(fs::read_to_string(result).unwrap(), "# Saved");
        assert!(board::remove_empty_board(data, "default", false).unwrap());
        assert!(board::remove_empty_board(data, &other, false).is_err());
    }

    #[test]
    fn external_board_file_edits_apply_to_new_claims_only() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path();
        let custom = board_files::BoardSkill {
            id: "my-style".into(),
            files: std::collections::BTreeMap::from([
                ("SKILL.md".into(), "# Style guide\n\nRead references/voice.md".into()),
                ("references/voice.md".into(), "Use the original wording.".into()),
            ]),
        };
        let original = "# Rules\n\nKeep the original example.";
        let board_id = board::create_board_with_files(
            data, "Article board", "article", "en-US", Some(original), &[custom],
        ).unwrap();
        let config = settings::config(data, &board_id).unwrap();
        let folder = std::path::PathBuf::from(config["folder"].as_str().unwrap());
        assert_eq!(fs::read_to_string(folder.join("AGENTS.md")).unwrap(), original);
        assert!(folder.join("results").is_dir());
        assert!(!folder.join("成果").exists());
        assert!(folder.join("skills/illustrate/references/checklist.md").is_file());

        let new_issue = || {
            let card = board::add(data, &board_id, "Evidence", "Evidence", "note", 0, 0).unwrap();
            let id = board::create_issue(data, &board_id, "Article", &[card], None, "").unwrap();
            board::open_issue(data, &id).unwrap();
            id
        };
        let first_id = new_issue();
        let first = claim(data, &first_id, None).unwrap();

        fs::write(folder.join("skills/write/SKILL.md"), "# My writing workflow").unwrap();
        fs::write(folder.join("AGENTS.md"), "# External revision").unwrap();
        fs::write(folder.join("skills/my-style/references/voice.md"), "Use compact paragraphs.").unwrap();
        assert!(settings::save_rules(data, &board_id, "Stale", "# Stale", first.rules.version).is_err());

        let second = claim(data, &new_issue(), None).unwrap();
        assert_eq!(second.rules.version, first.rules.version + 1);
        assert_eq!(second.rules.text, "# External revision");
        let captured = second.rules.file_skills.unwrap();
        let writing = captured.iter().find(|skill| skill.id == "write").unwrap();
        assert_eq!(writing.files["SKILL.md"], "# My writing workflow");
        let style = captured.iter().find(|skill| skill.id == "my-style").unwrap();
        assert_eq!(style.files["references/voice.md"], "Use compact paragraphs.");
        let historical = settings::issue_context(data, &first_id, "en-US").unwrap();
        assert_eq!(historical["rules"], serde_json::to_value(first.rules).unwrap());
    }

    #[test]
    fn migrates_older_saved_rules_and_keeps_localized_folder_names() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path();
        let id = Uuid::new_v4().to_string();
        let db = open(data).unwrap();
        db.execute("INSERT INTO nuts_boards VALUES (?1, 'Existing board')", [&id]).unwrap();
        db.execute("INSERT INTO nuts_board_scenes VALUES (?1, 'research')", [&id]).unwrap();
        db.execute(
            "INSERT INTO nuts_board_rules VALUES (?1, 'My rules', 'Keep this text', 9)", [&id],
        ).unwrap();
        let config = settings::config(data, &id).unwrap();
        let folder = std::path::PathBuf::from(config["folder"].as_str().unwrap());
        assert_eq!(config["rules"]["version"], 9);
        assert_eq!(fs::read_to_string(folder.join("AGENTS.md")).unwrap(), "Keep this text");
        assert!(folder.join("skills/brief/SKILL.md").is_file());
        assert!(folder.join("成果").is_dir());

        settings::remember_default_language(data, "en-US").unwrap();
        let default = settings::open_folder_path(data, "default").unwrap();
        assert!(default.join("results").is_dir());
        settings::remember_default_language(data, "zh-CN").unwrap();
        assert_eq!(settings::results_directory_name(&db, "default").unwrap(), "results");
    }

    #[test]
    fn saved_rules_and_scene_skill_are_captured_at_claim_time() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        for scene in ["research", "product", "article", "quick"] {
            let board_id = board::create_board(dir, scene, scene, "en-US").unwrap();
            let open_issue = || {
                let card = board::add(dir, &board_id, "Evidence", "Source notes", "note", 0, 0).unwrap();
                let id = board::create_issue(dir, &board_id, "Review evidence", &[card], None, "").unwrap();
                board::open_issue(dir, &id).unwrap();
                id
            };
            let first_id = open_issue();
            let first = claim(dir, &first_id, None).unwrap();
            let skill = first.rules.scene_skill.as_ref().unwrap();
            assert_eq!(skill.id, scene);
            let packages = first.rules.file_skills.as_ref().unwrap();
            for workflow in &skill.workflows {
                let package = packages.iter().find(|p| p.id == workflow.id).unwrap();
                assert!(!workflow.references.is_empty());
                for (name, expected) in &workflow.references {
                    let path = format!("references/{name}");
                    assert_eq!(package.files.get(&path), Some(expected));
                    assert!(package.files["SKILL.md"].contains(&format!("]({path})")));
                }
            }
            assert_eq!(skill.version, 4);
            assert!(first.rules.text.lines().filter(|line| line.starts_with("- ")).count() >= 4);
            assert!(!skill.workflows.is_empty());
            assert!(skill.workflows.iter().all(|workflow| !workflow.steps.is_empty()));
            if scene == "article" {
                assert!(first.rules.text.contains("Editing out generic AI phrasing"));
                let workflows = skill.workflows.iter().map(|workflow| workflow.id.as_str()).collect::<Vec<_>>();
                assert_eq!(workflows, ["write", "edit", "illustrate"]);
            }

            let imported = "# Rules\n\nCite evidence for each conclusion.";
            let saved = settings::save_rules(dir, &board_id, "Rules", imported, first.rules.version).unwrap();
            assert!(settings::save_rules(dir, &board_id, "Stale", "Stale import", first.rules.version).is_err());
            assert_eq!(settings::export_rules(dir, &board_id).unwrap(), imported);

            let next = claim(dir, &open_issue(), None).unwrap();
            assert_eq!(next.rules.version, saved.version);
            assert_eq!(next.rules.text, imported);
            assert_eq!(next.rules.scene_skill.unwrap().id, scene);
            let context = settings::issue_context(dir, &first_id, "en-US").unwrap();
            assert_eq!(context["rules"]["version"], first.rules.version);
            assert_eq!(context["rules"]["text"], first.rules.text);
            assert_eq!(context["rules"]["scene_skill"], serde_json::to_value(skill).unwrap());
        }
    }

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

        assert!(save_result(dir, &id, 2, None, |_| Err::<(), _>("index failed".into())).is_err());
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
        let item = save_result(dir, &id, 2, None, index).unwrap();
        assert_eq!(fs::read_to_string(&item.file_path).unwrap(), "# 第二版");
        assert_eq!(list(dir).unwrap()[0].result_version, Some(2));
        assert_eq!(drafts(dir, &id).unwrap()[1].markdown, "# 第一版");
        fs::write(&item.file_path, "# 人工编辑").unwrap();
        let reopened = save_result(dir, &id, 2, None, index).unwrap();
        assert_eq!(reopened.id, item.id);
        assert_eq!(
            fs::read_to_string(reopened.file_path).unwrap(),
            "# 人工编辑"
        );
        assert!(save_result(dir, &id, 1, None, index).is_err());
        references::attach_library_item(dir, &id, &item).unwrap();
        references::attach_library_item(dir, &id, &item).unwrap();
        let cards = serde_json::to_value(board::list(dir, "default").unwrap()).unwrap();
        let cards = cards.as_array().unwrap();
        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0]["issue_id"], id);
        assert_eq!(cards[0]["kind"], "library");
        assert_eq!(cards[0]["library_format"], item.file_type);
        let again = claim(dir, &id, Some("补充发现".into())).unwrap();
        let references = serde_json::to_value(&again).unwrap();
        assert_eq!(
            references["library_references"].as_array().unwrap().len(),
            1
        );
        assert_eq!(references["library_references"][0]["path"], item.file_path);
        assert_eq!(again.previous.unwrap().version, 2);
        save_result(dir, &id, 2, None, index).unwrap();
        assert_eq!(list(dir).unwrap()[0].status, "claimed");
        submit(dir, &id, &again.token, "# 第三版").unwrap();
        let revised = save_result(dir, &id, 3, None, index).unwrap();
        assert_ne!(revised.file_path, item.file_path);
        assert_eq!(fs::read_to_string(&item.file_path).unwrap(), "# 人工编辑");
        assert_eq!(list(dir).unwrap()[0].result_version, Some(3));
        references::remove_library_item(dir, &id, &item.file_path).unwrap();
        let db = open(dir).unwrap();
        assert!(references::library_items(&db, &id).unwrap().is_empty());
        assert!(board::list(dir, "default").unwrap().is_empty());
        assert_eq!(fs::read_to_string(&item.file_path).unwrap(), "# 人工编辑");
        db.execute(
            "INSERT INTO nuts_library_refs VALUES (?1, ?2, 'Existing reference', 'markdown')",
            rusqlite::params![id, item.file_path],
        ).unwrap();
        let cards = serde_json::to_value(board::list(dir, "default").unwrap()).unwrap();
        let card_id = cards[0]["id"].as_str().unwrap().to_owned();
        board::remove(dir, "default", &[card_id], Some(&id)).unwrap();
        assert!(references::library_items(&db, &id).unwrap().is_empty());
        assert!(board::list(dir, "default").unwrap().is_empty());
        assert!(std::path::Path::new(&item.file_path).is_file());
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
