use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::{board, board_files::{self, BoardSkill}, open, Result};

const CATALOG: &str = include_str!("../../../../dist/assets/nuts/scenes.json");
const CATALOG_EN: &str = include_str!("../../../../dist/assets/nuts/scenes.en.json");

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Rules {
    pub name: String,
    pub text: String,
    pub version: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scene_skill: Option<SceneSkill>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_skills: Option<Vec<BoardSkill>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SceneSkill {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    pub version: u32,
    pub instructions: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub workflows: Vec<SceneWorkflow>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SceneWorkflow {
    pub id: String,
    pub name: String,
    pub steps: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference: Option<String>,
    #[serde(default, skip_serializing_if = "std::collections::BTreeMap::is_empty")]
    pub references: std::collections::BTreeMap<String, String>,
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

fn board_language(db: &Connection, board_id: &str) -> Result<String> {
    let language: Option<String> = db.query_row(
        "SELECT language FROM nuts_board_locales WHERE board_id = ?1",
        [board_id],
        |row| row.get(0),
    ).optional().map_err(|error| error.to_string())?;
    Ok(language.unwrap_or_else(|| "zh-CN".into()))
}

pub fn remember_default_language(data_dir: &Path, language: &str) -> Result<()> {
    open(data_dir)?.execute(
        "INSERT OR IGNORE INTO nuts_board_locales
         SELECT 'default', ?1 WHERE EXISTS(SELECT 1 FROM nuts_boards WHERE id='default') AND NOT EXISTS(
            SELECT 1 FROM nuts_board_file_initialized WHERE board_id = 'default'
         )",
        [language],
    ).map_err(|error| error.to_string())?;
    Ok(())
}

pub(super) fn results_directory_name(db: &Connection, board_id: &str) -> Result<&'static str> {
    Ok(board_files::result_directory_name(&board_language(db, board_id)?))
}

fn workspace(
    data_dir: &Path,
    db: &Connection,
    board_id: &str,
    imported_rules: Option<&str>,
    imported_skills: &[BoardSkill],
) -> Result<(PathBuf, Rules, SceneSkill)> {
    board::ensure_board(db, board_id)?;
    let language = board_language(db, board_id)?;
    let language = language.as_str();
    let id = board_scene(db, board_id)?;
    let preset = localized_scene(&id, language)?;
    let mut skill: SceneSkill = serde_json::from_value(preset["skill"].clone())
        .map_err(|error| error.to_string())?;
    skill.id = id;
    skill.name = preset["name"].as_str().unwrap_or(&skill.id).into();
    let stored: Option<(String, String, i64)> = db.query_row(
        "SELECT name, text, version FROM nuts_board_rules WHERE board_id = ?1",
        [board_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).optional().map_err(|error| error.to_string())?;
    let heading = if language == "en-US" { "Board rules" } else { "白板工作规则" };
    let (name, recorded, mut version) = stored.clone().unwrap_or_else(|| {
        let defaults = preset["rules"].as_str().unwrap_or("");
        let text = imported_rules.map(str::to_owned).unwrap_or_else(|| {
            if defaults.is_empty() { String::new() } else { format!("# {heading}\n\n{defaults}\n") }
        });
        (skill.name.clone(), text, preset["ruleVersion"].as_i64().unwrap_or(1))
    });
    let initialized = folder_initialized(db, board_id)?;
    let target = board_files::board_directory(data_dir, board_id)?;
    if initialized && !target.is_dir() {
        return Err("The whiteboard folder is missing. Restore it before continuing.".into());
    }
    let folder = board_files::ensure(data_dir, board_id, &recorded, &skill, language, imported_skills)?;
    if !initialized {
        db.execute("INSERT INTO nuts_board_file_initialized VALUES (?1)", [board_id])
            .map_err(|error| error.to_string())?;
    }
    let text = board_files::read_rules(&folder)?;
    if text != recorded {
        version += 1;
    }
    let rules = Rules { name, text, version, scene_skill: None, file_skills: None };
    if stored.is_none() || rules.text != recorded {
        remember_rules(db, board_id, &rules)?;
    }
    Ok((folder, rules, skill))
}

fn remember_rules(db: &Connection, board_id: &str, rules: &Rules) -> Result<()> {
    db.execute(
        "INSERT INTO nuts_board_rules VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(board_id) DO UPDATE SET name=excluded.name, text=excluded.text, version=excluded.version",
        params![board_id, rules.name, rules.text, rules.version],
    ).map_err(|error| error.to_string())?;
    Ok(())
}

pub(super) fn initialize_folder(
    data_dir: &Path,
    db: &Connection,
    board_id: &str,
    imported_rules: Option<&str>,
    imported_skills: &[BoardSkill],
) -> Result<()> {
    if let Some(text) = imported_rules {
        super::validate_markdown(text)?;
    }
    workspace(data_dir, db, board_id, imported_rules, imported_skills)?;
    Ok(())
}

pub(super) fn load_rules(data_dir: &Path, db: &Connection, board_id: &str) -> Result<Rules> {
    let (folder, mut rules, skill) = workspace(data_dir, db, board_id, None, &[])?;
    let files = board_files::read_skills(&folder)?;
    if board_files::read_rules(&folder)? != rules.text || board_files::read_skills(&folder)? != files {
        return Err("Board files changed during the claim. Try again.".into());
    }
    rules.file_skills = Some(files);
    rules.scene_skill = Some(skill);
    Ok(rules)
}

pub fn config(data_dir: &Path, board_id: &str) -> Result<Value> {
    let mut db = open(data_dir)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|error| error.to_string())?;
    let (folder, mut rules, skill) = workspace(data_dir, &tx, board_id, None, &[])?;
    let scene = skill.id.clone();
    rules.scene_skill = Some(skill);
    let skill_error = match board_files::read_skills(&folder) {
        Ok(skills) => { rules.file_skills = Some(skills); None }
        Err(error) => Some(error),
    };
    tx.commit().map_err(|error| error.to_string())?;
    Ok(serde_json::json!({ "scene": scene, "rules": rules, "folder": folder, "skill_error": skill_error }))
}

fn folder_initialized(db: &Connection, board_id: &str) -> Result<bool> {
    db.query_row(
        "SELECT EXISTS(SELECT 1 FROM nuts_board_file_initialized WHERE board_id = ?1)", [board_id],
        |row| row.get(0),
    ).map_err(|error| error.to_string())
}

pub(super) fn result_folder(data_dir: &Path, db: &Connection, board_id: &str) -> Result<PathBuf> {
    board::ensure_board(db, board_id)?;
    let path = board_files::board_directory(data_dir, board_id)?;
    if !folder_initialized(db, board_id)? {
        initialize_folder(data_dir, db, board_id, None, &[])?;
    }
    if !path.symlink_metadata().is_ok_and(|meta| meta.is_dir())
        || !path.parent().is_some_and(|parent| parent.symlink_metadata().is_ok_and(|meta| meta.is_dir()))
    {
        return Err("The whiteboard folder is missing or invalid".into());
    }
    Ok(path)
}

pub fn open_folder_path(data_dir: &Path, board_id: &str) -> Result<PathBuf> {
    let mut db = open(data_dir)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|error| error.to_string())?;
    let path = result_folder(data_dir, &tx, board_id)?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(path)
}

pub fn open_skill_folder_path(data_dir: &Path, board_id: &str, skill_id: &str) -> Result<PathBuf> {
    let board = open_folder_path(data_dir, board_id)?;
    board_files::skill_folder(&board, skill_id)
}

pub fn import_skill(data_dir: &Path, board_id: &str, skill: &BoardSkill) -> Result<()> {
    let mut db = open(data_dir)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|error| error.to_string())?;
    let (folder, _, _) = workspace(data_dir, &tx, board_id, None, &[])?;
    board_files::add_skill(&folder, skill)?;
    tx.commit().map_err(|error| error.to_string())
}

pub fn export_rules(data_dir: &Path, board_id: &str) -> Result<String> {
    let mut db = open(data_dir)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|error| error.to_string())?;
    let (_, rules, _) = workspace(data_dir, &tx, board_id, None, &[])?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(rules.text)
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
    if !text.is_empty() { super::validate_markdown(text)?; }
    let mut db = open(data_dir)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|error| error.to_string())?;
    let (folder, mut rules, _) = workspace(data_dir, &tx, board_id, None, &[])?;
    if rules.version != expected {
        return Err("Board rules changed. Reopen the rules before editing.".into());
    }
    board_files::save_rules(&folder, &rules.text, text)?;
    rules.name = name.into();
    rules.text = text.into();
    rules.version += 1;
    remember_rules(&tx, board_id, &rules)?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(rules)
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
    let mut db = open(data_dir)?;
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
        None => {
            let tx = db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|error| error.to_string())?;
            let rules = load_rules(data_dir, &tx, &board_id)?;
            tx.commit().map_err(|error| error.to_string())?;
            rules
        }
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
         FROM board_cards WHERE issue_id = ?1 AND kind <> 'library'
           AND NOT EXISTS (SELECT 1 FROM nuts_reference_cards WHERE card_id = board_cards.id)
         ORDER BY rowid",
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
