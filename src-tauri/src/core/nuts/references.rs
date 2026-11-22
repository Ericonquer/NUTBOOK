use std::path::Path;

use rusqlite::{params, Connection};
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
    let changed = open(data_dir)?
        .execute(
            "UPDATE issue_refs SET adopted = 1 WHERE issue_id = ?1 AND id = ?2",
            params![issue_id, id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Recommendation not found in this issue".into());
    }
    Ok(())
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
