use std::path::Path;

use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::{Deserialize, Serialize};

use super::{enqueue_open, open, validate_markdown, Draft, Result};

#[derive(Deserialize, Serialize)]
pub struct Comment {
    pub start: Option<usize>,
    pub end: Option<usize>,
    pub quote: Option<String>,
    pub text: String,
}

pub fn history(dir: &Path, id: &str, version: i64) -> Result<Vec<Comment>> {
    let raw: Option<String> = open(dir)?
        .query_row(
            "SELECT comments FROM nuts_review_rounds WHERE issue_id=?1 AND base_version=?2
         ORDER BY next_version DESC LIMIT 1",
            params![id, version],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    raw.map(|text| serde_json::from_str(&text).map_err(|e| e.to_string()))
        .transpose()
        .map(Option::unwrap_or_default)
}

pub fn queue(dir: &Path, id: &str, version: i64, comments: &[Comment]) -> Result<()> {
    if comments.is_empty() || comments.len() > 100 {
        return Err("Provide between 1 and 100 comments".into());
    }
    let mut feedback = format!("# Review comments for version {version}");
    for comment in comments {
        let text = comment.text.trim();
        if text.is_empty() || text.chars().count() > 4000 {
            return Err("Each comment must contain 1 to 4000 characters".into());
        }
        match (&comment.quote, comment.start, comment.end) {
            (Some(quote), Some(start), Some(end))
                if !quote.trim().is_empty() && end > start && quote.chars().count() <= 2000 =>
            {
                feedback.push_str(&format!(
                    "\n\n## Selected text\n\n{quote}\n\n## Requested change\n\n{text}"
                ));
            }
            (None, None, None) => feedback.push_str(&format!("\n\n## Whole draft\n\n{text}")),
            _ => return Err("Invalid text selection".into()),
        }
    }
    validate_markdown(&feedback)?;
    let mut db = open(dir)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    let changed = tx
        .execute(
            "UPDATE issues SET status='open', token=NULL WHERE id=?1 AND status='review'
         AND EXISTS(SELECT 1 FROM drafts WHERE issue_id=?1 AND version=?2)",
            params![id, version],
        )
        .map_err(|e| e.to_string())?;
    if changed != 1 {
        return Err("The draft is no longer available for revision".into());
    }
    tx.execute(
        "INSERT INTO nuts_review_rounds (issue_id,next_version,base_version,comments,feedback)
         VALUES (?1,(SELECT MAX(version)+1 FROM drafts WHERE issue_id=?1),?2,?3,?4)
         ON CONFLICT(issue_id,next_version) DO UPDATE SET
           base_version=excluded.base_version, comments=excluded.comments, feedback=excluded.feedback",
        params![
            id,
            version,
            serde_json::to_string(comments).map_err(|e| e.to_string())?,
            feedback
        ],
    )
    .map_err(|e| e.to_string())?;
    enqueue_open(&tx, id)?;
    tx.commit().map_err(|e| e.to_string())
}

pub(super) fn pending(db: &Connection, id: &str) -> Result<Option<(Draft, String)>> {
    db.query_row(
        "SELECT draft.version, draft.markdown, review.feedback FROM nuts_review_rounds review
         JOIN drafts draft ON draft.issue_id=review.issue_id AND draft.version=review.base_version
         WHERE review.issue_id=?1 AND review.next_version=(SELECT MAX(version)+1 FROM drafts WHERE issue_id=?1)",
        [id], |row| Ok((Draft { version: row.get(0)?, markdown: row.get(1)? }, row.get(2)?)),
    ).optional().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn queued_review_uses_selected_version_and_does_not_leak_to_future_claims() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let id = super::super::create(dir, "Issue", "Source.md", "Source").unwrap();
        let first = super::super::claim(dir, &id, None).unwrap();
        super::super::submit(dir, &id, &first.token, "Draft one").unwrap();
        let second = super::super::claim(dir, &id, Some("More context".into())).unwrap();
        super::super::submit(dir, &id, &second.token, "Draft two").unwrap();
        let comments = [Comment {
            start: Some(0),
            end: Some(5),
            quote: Some("Draft".into()),
            text: "Clarify the example".into(),
        }];
        queue(dir, &id, 1, &comments).unwrap();
        assert!(queue(dir, &id, 2, &comments).is_err());
        super::super::withdraw(dir, &id).unwrap();
        queue(dir, &id, 1, &comments).unwrap();
        let claim = super::super::claim_next(dir, None).unwrap().unwrap();
        assert_eq!(claim.previous.unwrap().version, 1);
        assert!(claim.extra.unwrap().contains("Clarify the example"));
        assert_eq!(
            super::super::submit(dir, &id, &claim.token, "Draft three").unwrap(),
            3
        );
        assert_eq!(history(dir, &id, 1).unwrap().len(), 1);
        let next = super::super::claim(dir, &id, Some("Next round".into())).unwrap();
        assert!(!next.extra.unwrap().contains("Clarify the example"));
    }
}
