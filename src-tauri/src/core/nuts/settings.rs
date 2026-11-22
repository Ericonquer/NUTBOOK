use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::{board, open, Result};

const CATALOG: &str = include_str!("../../../../dist/assets/nuts/scenes.json");
const CATALOG_EN: &str = include_str!("../../../../dist/assets/nuts/scenes.en.json");

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Rules {
    pub name: String,
    pub text: String,
    pub version: i64,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Task {
    pub template: Option<String>,
    pub goal: String,
}

pub fn catalog(language: &str) -> Result<Value> {
    serde_json::from_str(if language == "en-US" {
        CATALOG_EN
    } else {
        CATALOG
    })
    .map_err(|e| e.to_string())
}

pub fn scene(id: &str) -> Result<Value> {
    localized_scene(id, "zh-CN")
}

fn localized_scene(id: &str, language: &str) -> Result<Value> {
    catalog(language)?["scenes"]
        .as_array()
        .and_then(|scenes| scenes.iter().find(|scene| scene["id"] == id))
        .cloned()
        .ok_or_else(|| "Unknown board scene".into())
}

fn board_scene(db: &Connection, board_id: &str) -> Result<String> {
    db.query_row(
        "SELECT scene FROM nuts_board_scenes WHERE board_id = ?1",
        [board_id],
        |row| row.get(0),
    )
    .optional()
    .map(|value| value.unwrap_or_else(|| "quick".into()))
    .map_err(|e| e.to_string())
}

pub fn config(data_dir: &Path, board_id: &str, language: &str) -> Result<Value> {
    let db = open(data_dir)?;
    board::ensure_board(&db, board_id)?;
    let id = board_scene(&db, board_id)?;
    Ok(
        serde_json::json!({ "scene": id, "rules": load_rules_for_language(&db, board_id, language)? }),
    )
}

pub(super) fn load_rules(db: &Connection, board_id: &str) -> Result<Rules> {
    let language: Option<String> = db
        .query_row(
            "SELECT language FROM nuts_board_locales WHERE board_id = ?1",
            [board_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    load_rules_for_language(db, board_id, language.as_deref().unwrap_or("zh-CN"))
}

fn load_rules_for_language(db: &Connection, board_id: &str, language: &str) -> Result<Rules> {
    let stored = db
        .query_row(
            "SELECT name, text, version FROM nuts_board_rules WHERE board_id = ?1",
            [board_id],
            |row| {
                Ok(Rules {
                    name: row.get(0)?,
                    text: row.get(1)?,
                    version: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if let Some(rules) = stored {
        return Ok(rules);
    }
    let preset = localized_scene(&board_scene(db, board_id)?, language)?;
    let heading = if language == "en-US" {
        "Board rules"
    } else {
        "白板工作规则"
    };
    Ok(Rules {
        name: preset["name"].as_str().unwrap_or("").into(),
        text: format!(
            "# {heading}\n\n{}\n",
            preset["rules"].as_str().unwrap_or("")
        ),
        version: 1,
    })
}

pub fn save_rules(
    data_dir: &Path,
    board_id: &str,
    name: &str,
    text: &str,
    expected: i64,
) -> Result<Rules> {
    let name = name.trim();
    let text = text.trim();
    if name.is_empty() || name.chars().count() > 100 {
        return Err("Enter a rule name of up to 100 characters".into());
    }
    super::validate_markdown(text)?;
    let mut db = open(data_dir)?;
    let tx = db
        .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    board::ensure_board(&tx, board_id)?;
    let version = load_rules(&tx, board_id)?.version;
    if version != expected {
        return Err("Board rules changed. Reopen the rules before editing.".into());
    }
    tx.execute(
        "INSERT INTO nuts_board_rules VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(board_id) DO UPDATE SET name=excluded.name, text=excluded.text, version=excluded.version",
        params![board_id, name, text, version+1],
    ).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(Rules {
        name: name.into(),
        text: text.into(),
        version: version + 1,
    })
}

pub(super) fn save_task(
    db: &Connection,
    board_id: &str,
    issue_id: &str,
    template: Option<&str>,
    goal: &str,
) -> Result<()> {
    let goal = goal.trim();
    if !goal.is_empty() {
        super::validate_markdown(goal)?;
    }
    if let Some(name) = template {
        let scene = scene(&board_scene(db, board_id)?)?;
        if !scene["tasks"]
            .as_array()
            .is_some_and(|tasks| tasks.iter().any(|task| task["name"] == name))
        {
            return Err("Template does not belong to this board".into());
        }
    }
    db.execute(
        "INSERT INTO nuts_issue_tasks VALUES (?1, ?2, ?3)",
        params![issue_id, template, goal],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub(super) fn load_task(db: &Connection, id: &str) -> Result<Task> {
    db.query_row(
        "SELECT template, goal FROM nuts_issue_tasks WHERE issue_id = ?1",
        [id],
        |row| {
            Ok(Task {
                template: row.get(0)?,
                goal: row.get(1)?,
            })
        },
    )
    .optional()
    .map(|value| value.unwrap_or_default())
    .map_err(|e| e.to_string())
}

pub fn issue_context(data_dir: &Path, id: &str, language: &str) -> Result<Value> {
    let db = open(data_dir)?;
    let board_id: String = db.query_row("SELECT COALESCE((SELECT board_id FROM nuts_issue_boards WHERE issue_id = issues.id), 'default') FROM issues WHERE id = ?1",[id],|r|r.get(0)).map_err(|e|e.to_string())?;
    let snapshot = db
        .query_row(
            "SELECT rules FROM nuts_claim_rules WHERE issue_id = ?1 ORDER BY rowid DESC LIMIT 1",
            [id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    let rules = match &snapshot {
        Some(json) => serde_json::from_str(json).map_err(|e| e.to_string())?,
        None => load_rules_for_language(&db, &board_id, language)?,
    };
    let task = load_task(&db, id)?;
    let preset = localized_scene(&board_scene(&db, &board_id)?, language)?;
    let template_label = task.template.as_deref().and_then(|name| {
        preset["tasks"]
            .as_array()?
            .iter()
            .find(|item| item["key"] == name || item["name"] == name)
            .and_then(|item| item["name"].as_str())
    });
    let mut query = db
        .prepare(
            "SELECT id, title, kind, CASE WHEN kind IN ('note','link') THEN markdown ELSE '' END
         FROM board_cards WHERE issue_id = ?1 ORDER BY rowid",
        )
        .map_err(|error| error.to_string())?;
    let materials = query
        .query_map([id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_,String>(0)?, "title": row.get::<_,String>(1)?,
                "kind": row.get::<_,String>(2)?, "body": row.get::<_,String>(3)?,
            }))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    let library_refs = super::references::library_items(&db, id)?;
    Ok(serde_json::json!({
        "rules": rules, "task": task, "template_label": template_label,
        "snapshot": snapshot.is_some(), "materials": materials, "library_refs": library_refs,
    }))
}
