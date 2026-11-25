use std::{
    collections::BTreeMap,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

use super::{settings::SceneSkill, Result};

const MAX_FILES: usize = 64;
const MAX_FILE_BYTES: usize = 256 * 1024;
const MAX_SKILLS: usize = 24;
const MAX_SNAPSHOT_BYTES: usize = 2 * 1024 * 1024;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct BoardSkill {
    pub id: String,
    pub files: BTreeMap<String, String>,
}

fn file_error(error: std::io::Error) -> String {
    error.to_string()
}

fn component(name: &str) -> bool {
    !name.is_empty()
        && !name.starts_with('.')
        && !name.ends_with(['.', ' '])
        && name.len() <= 120
        && !name
            .chars()
            .any(|ch| ch.is_control() || "/\\:*?\"<>|".contains(ch))
}

fn supported_file(name: &str) -> bool {
    Path::new(name)
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| {
            matches!(
                ext.to_ascii_lowercase().as_str(),
                "md" | "txt"
                    | "json"
                    | "yaml"
                    | "yml"
                    | "toml"
                    | "csv"
                    | "js"
                    | "mjs"
                    | "ts"
                    | "py"
                    | "sh"
                    | "ps1"
                    | "html"
                    | "css"
                    | "svg"
            )
        })
}

fn validate_skill(skill: &BoardSkill) -> Result<()> {
    if !component(&skill.id)
        || skill.files.len() > MAX_FILES
        || !skill
            .files
            .get("SKILL.md")
            .is_some_and(|text| !text.trim().is_empty())
    {
        return Err("Choose a Skill folder containing SKILL.md and at most 64 text files".into());
    }
    let mut paths = std::collections::BTreeSet::new();
    for (path, text) in &skill.files {
        let valid = path.split('/').all(component)
            && supported_file(path)
            && text.len() <= MAX_FILE_BYTES
            && !text.contains('\0');
        if !valid || !paths.insert(path.to_lowercase()) {
            return Err(format!("Invalid Skill resource: {path}"));
        }
    }
    if byte_count(skill) > MAX_SNAPSHOT_BYTES {
        return Err("Skill files exceed 2 MiB".into());
    }
    Ok(())
}

fn byte_count(skill: &BoardSkill) -> usize {
    skill.files.values().map(String::len).sum()
}

fn read_directory(
    root: &Path,
    directory: &Path,
    files: &mut BTreeMap<String, String>,
) -> Result<()> {
    for entry in fs::read_dir(directory).map_err(file_error)? {
        let entry = entry.map_err(file_error)?;
        let file_name = entry.file_name();
        let name = file_name
            .to_str()
            .ok_or("Skill filename is not valid UTF-8")?;
        if name.starts_with('.') || name == "__pycache__" || name == "node_modules" {
            continue;
        }
        if !component(name) {
            return Err(format!("Invalid Skill resource name: {name}"));
        }
        let path = entry.path();
        let kind = entry.file_type().map_err(file_error)?;
        if kind.is_dir() {
            if path
                .strip_prefix(root)
                .map_err(|error| error.to_string())?
                .components()
                .count()
                > 8
            {
                return Err("Skill folders can be at most eight levels deep".into());
            }
            read_directory(root, &path, files)?;
        } else if kind.is_file() && supported_file(name) {
            if files.len() >= MAX_FILES {
                return Err("A Skill can contain at most 64 text files".into());
            }
            let relative = path
                .strip_prefix(root)
                .map_err(|error| error.to_string())?
                .to_str()
                .ok_or("Skill path is not valid UTF-8")?
                .replace(std::path::MAIN_SEPARATOR, "/");
            let mut text = String::new();
            fs::File::open(&path)
                .map_err(file_error)?
                .take((MAX_FILE_BYTES + 1) as u64)
                .read_to_string(&mut text)
                .map_err(file_error)?;
            if text.len() > MAX_FILE_BYTES {
                return Err(format!("Skill resource exceeds 256 KiB: {relative}"));
            }
            files.insert(relative, text);
        } else {
            return Err(format!(
                "Unsupported Skill resource: {name}. Use regular UTF-8 text files."
            ));
        }
    }
    Ok(())
}

pub fn read_skill(path: &Path) -> Result<BoardSkill> {
    if !fs::symlink_metadata(path).is_ok_and(|meta| meta.is_dir()) {
        return Err("Choose a regular Skill directory".into());
    }
    let id = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("Invalid Skill folder name")?;
    let mut skill = BoardSkill {
        id: id.to_owned(),
        files: BTreeMap::new(),
    };
    read_directory(path, path, &mut skill.files)?;
    validate_skill(&skill)?;
    Ok(skill)
}

pub(super) fn skill_folder(board: &Path, skill_id: &str) -> Result<PathBuf> {
    if !component(skill_id) {
        return Err("Invalid Skill folder name".into());
    }
    let root = board.join("skills");
    let path = root.join(skill_id);
    if !root.symlink_metadata().is_ok_and(|meta| meta.is_dir())
        || !path.symlink_metadata().is_ok_and(|meta| meta.is_dir())
        || !path
            .join("SKILL.md")
            .symlink_metadata()
            .is_ok_and(|meta| meta.is_file())
    {
        return Err("The Skill folder is missing or invalid".into());
    }
    Ok(path)
}

#[derive(Serialize)]
pub struct SkillDocumentPreview {
    metadata_html: String,
    body_html: String,
}

pub fn render_preview(
    markdown: &str,
    file_name: &str,
    strip_first_heading: bool,
) -> Result<SkillDocumentPreview> {
    use crate::core::document::{is_skill_markdown_file_name, markdown_preview_parts};
    use pulldown_cmark::{html, Event, Options, Parser, Tag, TagEnd};

    if markdown.len() > MAX_FILE_BYTES {
        return Err("Skill preview exceeds 256 KiB".into());
    }
    let (body, metadata_html) = markdown_preview_parts(
        markdown.trim_start_matches('\u{feff}'),
        is_skill_markdown_file_name(file_name),
    );
    let trimmed = body.trim_start();
    let markdown =
        if strip_first_heading && (trimmed.starts_with("# ") || trimmed.starts_with("#\t")) {
            trimmed.split_once('\n').map_or("", |(_, rest)| rest)
        } else {
            body.as_ref()
        };
    let events = Parser::new_ext(
        markdown,
        Options::ENABLE_TABLES | Options::ENABLE_STRIKETHROUGH,
    )
    .filter_map(|event| match event {
        Event::Html(text) | Event::InlineHtml(text) => Some(Event::Text(text)),
        // Show the image label as text and leave all external loading to explicit actions.
        Event::Start(Tag::Image { .. }) | Event::End(TagEnd::Image) => None,
        Event::Start(Tag::Link {
            link_type,
            dest_url,
            title,
            id,
        }) => {
            let dest_url = if dest_url.contains(':')
                && !dest_url.starts_with("https://")
                && !dest_url.starts_with("http://")
            {
                "".into()
            } else {
                dest_url
            };
            Some(Event::Start(Tag::Link {
                link_type,
                dest_url,
                title,
                id,
            }))
        }
        event => Some(event),
    });
    let mut body_html = String::new();
    html::push_html(&mut body_html, events);
    Ok(SkillDocumentPreview {
        metadata_html,
        body_html,
    })
}

pub(super) fn read_skills(folder: &Path) -> Result<Vec<BoardSkill>> {
    let root = folder.join("skills");
    if !fs::symlink_metadata(&root).is_ok_and(|meta| meta.is_dir()) {
        return Err("The board's skills directory is missing or invalid".into());
    }
    let mut skills = Vec::new();
    let mut bytes = 0;
    for entry in fs::read_dir(root).map_err(file_error)? {
        let entry = entry.map_err(file_error)?;
        if entry.file_name().to_string_lossy().starts_with('.') {
            continue;
        }
        if skills.len() >= MAX_SKILLS {
            return Err("A board can contain at most 24 Skills".into());
        }
        let skill = read_skill(&entry.path())?;
        bytes += byte_count(&skill);
        if bytes > MAX_SNAPSHOT_BYTES {
            return Err("Board Skill files exceed 2 MiB".into());
        }
        skills.push(skill);
    }
    skills.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(skills)
}

fn builtin_skills(scene: &SceneSkill, language: &str) -> Vec<BoardSkill> {
    scene
        .workflows
        .iter()
        .map(|workflow| {
            let id = workflow.id.clone();
            let steps = workflow
                .steps
                .iter()
                .enumerate()
                .map(|(index, step)| format!("{}. {step}", index + 1))
                .collect::<Vec<_>>()
                .join("\n");
            let mut body = format!(
                "---\nname: {id}\ndescription: {}\n---\n\n# {}\n\n{}\n\n{steps}\n",
                serde_json::to_string(workflow.description.as_deref().unwrap_or(&workflow.name))
                    .expect("serialize Skill description"),
                workflow.name,
                scene.instructions
            );
            let mut files = BTreeMap::new();
            if let Some(reference) = &workflow.reference {
                let label = if language == "en-US" {
                    "Submission checklist"
                } else {
                    "交稿清单"
                };
                body.push_str(&format!("\n[{label}](references/checklist.md)\n"));
                files.insert("references/checklist.md".into(), reference.clone());
            }
            files.insert("SKILL.md".into(), body);
            BoardSkill { id, files }
        })
        .collect()
}

fn write_skill(directory: &Path, skill: &BoardSkill) -> Result<()> {
    validate_skill(skill)?;
    for (relative, text) in &skill.files {
        let destination = directory.join(relative);
        let parent = destination.parent().ok_or("Skill file has no parent")?;
        fs::create_dir_all(parent).map_err(file_error)?;
        fs::write(destination, text).map_err(file_error)?;
    }
    Ok(())
}

pub(super) fn board_directory(data_dir: &Path, board_id: &str) -> Result<PathBuf> {
    if board_id != "default" && uuid::Uuid::parse_str(board_id).is_err() {
        return Err("Invalid board ID".into());
    }
    Ok(data_dir.join("nuts-boards").join(board_id))
}

pub(super) fn ensure(
    data_dir: &Path,
    board_id: &str,
    rules: &str,
    scene: &SceneSkill,
    language: &str,
    imported: &[BoardSkill],
) -> Result<PathBuf> {
    let directory = board_directory(data_dir, board_id)?;
    let root = directory.parent().ok_or("Board directory has no parent")?;
    ensure_directory(root)?;
    match fs::symlink_metadata(&directory) {
        Ok(metadata) if metadata.is_dir() => return Ok(directory),
        Ok(_) => return Err("The board folder must be a regular directory".into()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(file_error(error)),
    }
    let mut skills = builtin_skills(scene, language);
    for skill in imported {
        validate_skill(skill)?;
        skills.retain(|existing| !existing.id.eq_ignore_ascii_case(&skill.id));
        skills.push(skill.clone());
    }
    if skills.len() > MAX_SKILLS
        || skills.iter().map(byte_count).sum::<usize>() > MAX_SNAPSHOT_BYTES
    {
        return Err("Board Skills exceed the supported file count or size".into());
    }
    let staged = tempfile::Builder::new()
        .prefix(".board-")
        .tempdir_in(root)
        .map_err(file_error)?;
    fs::write(staged.path().join("AGENTS.md"), rules).map_err(file_error)?;
    let skill_root = staged.path().join("skills");
    fs::create_dir(&skill_root).map_err(file_error)?;
    for skill in &skills {
        write_skill(&skill_root.join(&skill.id), skill)?;
    }
    fs::create_dir(staged.path().join(result_directory_name(language))).map_err(file_error)?;
    fs::rename(staged.path(), &directory).map_err(file_error)?;
    Ok(directory)
}

pub(super) fn result_directory_name(language: &str) -> &'static str {
    if language == "en-US" {
        "results"
    } else {
        "成果"
    }
}

pub(super) fn ensure_directory(path: &Path) -> Result<()> {
    match fs::create_dir(path) {
        Ok(()) => Ok(()),
        Err(error)
            if error.kind() == std::io::ErrorKind::AlreadyExists
                && fs::symlink_metadata(path).is_ok_and(|meta| meta.is_dir()) =>
        {
            Ok(())
        }
        Err(error) => Err(file_error(error)),
    }
}

pub(super) fn read_rules(directory: &Path) -> Result<String> {
    let file = directory.join("AGENTS.md");
    if !fs::symlink_metadata(&file).is_ok_and(|meta| meta.is_file()) {
        return Err("The board's AGENTS.md is missing or is not a regular file".into());
    }
    super::read_markdown(&file)
}

pub(super) fn save_rules(directory: &Path, expected: &str, text: &str) -> Result<()> {
    let mut staged = tempfile::NamedTempFile::new_in(directory).map_err(file_error)?;
    staged.write_all(text.as_bytes()).map_err(file_error)?;
    staged.as_file().sync_all().map_err(file_error)?;
    if read_rules(directory)? != expected {
        return Err("Board rules changed. Reopen the rules before editing.".into());
    }
    staged
        .persist(directory.join("AGENTS.md"))
        .map_err(|error| file_error(error.error))?;
    Ok(())
}

pub(super) fn add_skill(directory: &Path, skill: &BoardSkill) -> Result<()> {
    validate_skill(skill)?;
    let skills = read_skills(directory)?;
    if skills
        .iter()
        .any(|existing| existing.id.eq_ignore_ascii_case(&skill.id))
    {
        return Err(
            "A Skill with that folder name already exists. Rename it before importing.".into(),
        );
    }
    if skills.len() >= MAX_SKILLS
        || skills.iter().map(byte_count).sum::<usize>() + byte_count(skill) > MAX_SNAPSHOT_BYTES
    {
        return Err("Board Skills exceed the supported file count or size".into());
    }
    let root = directory.join("skills");
    let staged = tempfile::Builder::new()
        .prefix(".skill-")
        .tempdir_in(&root)
        .map_err(file_error)?;
    write_skill(staged.path(), skill)?;
    fs::rename(staged.path(), root.join(&skill.id)).map_err(file_error)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skill_folder_resolves_the_package_directory_within_its_board() {
        let board = tempfile::tempdir().unwrap();
        let folder = board.path().join("skills/example");
        fs::create_dir_all(&folder).unwrap();
        fs::write(folder.join("SKILL.md"), "# Example").unwrap();

        assert_eq!(skill_folder(board.path(), "example").unwrap(), folder);
        assert!(skill_folder(board.path(), "../example").is_err());
        assert!(skill_folder(board.path(), "skills/example").is_err());
        assert!(skill_folder(board.path(), "missing").is_err());

        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&folder, board.path().join("skills/linked")).unwrap();
            assert!(skill_folder(board.path(), "linked").is_err());
        }
    }

    #[test]
    fn skill_preview_reuses_document_metadata_and_separates_the_body() {
        let markdown = "---\nname: writing\ndescription: >\n  Revise the draft.\n  Check quotes.\ntrigger_keywords: [revise, proofread]\n---\n\n# Writing\n\nRead the draft.";
        let preview = render_preview(markdown, "SKILL.md", true).unwrap();
        let normal = crate::core::document::render_markdown_as_html_for_file(markdown, "SKILL.md");
        assert!(normal.starts_with(&preview.metadata_html));
        assert!(preview
            .metadata_html
            .contains("Revise the draft. Check quotes."));
        assert!(preview.metadata_html.contains("trigger_keywords"));
        assert!(!preview.metadata_html.contains("Read the draft."));
        assert_eq!(preview.body_html, "<p>Read the draft.</p>\n");
        let reference = render_preview(markdown, "references/checklist.md", false).unwrap();
        assert!(reference.metadata_html.is_empty());
        assert!(reference.body_html.contains("<h1>Writing</h1>"));
    }

    #[test]
    fn skill_preview_formats_steps_and_escapes_active_content() {
        let markdown = "# Example\n\n1. Read the brief.\n2. Write **a draft**.\n\n\
            [Checklist](references/checklist.md)\n\n            <script>alert(1)</script>\n\n            ![Track](https://example.com/image.png)\n\n            [Unsafe](javascript:alert%281%29)";
        let html = render_preview(markdown, "SKILL.md", false)
            .unwrap()
            .body_html;
        assert!(html.contains("<ol>"));
        assert!(html.contains("<strong>a draft</strong>"));
        assert!(html.contains("href=\"references/checklist.md\""));
        assert!(html.contains("&lt;script&gt;"));
        assert!(html.contains("Track"));
        assert!(!html.contains("<script"));
        assert!(!html.contains("<img"));
        assert!(!html.contains("href=\"javascript:"));
    }
}
