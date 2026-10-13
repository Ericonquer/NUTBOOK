//! Browser probe uses the real source-commit path, in an isolated temporary library.
use std::{env, fs, path::PathBuf};
use nutbook_backend::core::html_edit::{commit_html_edit_for_file, get_html_edit_patch_for_file, HtmlEditCommit, HtmlEditPatchLookup};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    let path = PathBuf::from(args.get(1).ok_or("HTML path required")?).canonicalize()?;
    let request = fs::read_to_string(args.get(2).ok_or("changes JSON required")?)?;
    let root = path.parent().ok_or("parent")?.to_path_buf();
    let opened = get_html_edit_patch_for_file(&HtmlEditPatchLookup { library_id: 1, item_id: 1, library_root: root.clone(), file_path: path.clone(), title_hint: "Motion probe".into() })?;
    let saved = commit_html_edit_for_file(&HtmlEditCommit { library_root: root, file_path: path, artifact_edit_id: opened.artifact_edit_id, expected_file_hash: opened.source_file_hash, expected_modified_at: opened.source_modified_at, changes: serde_json::from_str(&request)?, presentation_notes: None })?;
    println!("{}", serde_json::to_string(&saved)?);
    Ok(())
}
