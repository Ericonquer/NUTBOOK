use super::{board, board_files, settings, Claim, Draft, Result};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::{Deserialize, Serialize};
use std::path::Path;
use uuid::Uuid;

pub(super) const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS nuts_retros (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    board_id TEXT NOT NULL,
    supplemental TEXT,
    token TEXT,
    expires_at INTEGER,
    state TEXT NOT NULL DEFAULT 'pending',
    proposal TEXT,
    UNIQUE(issue_id, version)
);
CREATE INDEX IF NOT EXISTS nuts_retros_queue ON nuts_retros(board_id, state, expires_at);
";

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ScheduledTask {
    Issue(Box<Claim>),
    Retrospective(Box<RetroClaim>),
}

#[derive(Serialize)]
pub struct RetroClaim {
    id: String,
    token: String,
    issue_id: String,
    board_id: String,
    title: String,
    goal: String,
    accepted: Draft,
    supplemental: Option<String>,
    prepared_proposal: Option<Proposal>,
    reviews: Vec<ReviewRound>,
    rules: settings::Rules,
}

#[derive(Serialize)]
struct ReviewRound {
    before: Draft,
    after: Draft,
    feedback: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Proposal {
    reason: String,
    change: Option<Change>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "target", rename_all = "snake_case", deny_unknown_fields)]
enum Change {
    Skill {
        skill_id: String,
        instruction: String,
    },
    Rules {
        instruction: String,
    },
}

pub(super) fn enqueue(db: &Connection, issue_id: &str, version: i64, board_id: &str) -> Result<()> {
    db.execute(
        "INSERT OR IGNORE INTO nuts_retros (id, issue_id, version, board_id, supplemental)
         SELECT ?1, i.id, ?3, ?4, i.supplemental FROM issues i
         JOIN drafts d ON d.issue_id=i.id AND d.version=?3
         JOIN nuts_claim_rules c ON c.token=d.token AND c.issue_id=i.id
         WHERE i.id=?2",
        params![Uuid::new_v4().to_string(), issue_id, version, board_id],
    )
    .map_err(db_error)?;
    Ok(())
}

fn db_error(error: rusqlite::Error) -> String {
    error.to_string()
}

fn snapshot(db: &Connection, issue_id: &str, version: i64) -> Result<(Draft, settings::Rules)> {
    let (markdown, rules): (String, String) = db
        .query_row(
            "SELECT d.markdown,c.rules FROM drafts d JOIN nuts_claim_rules c
         ON c.token=d.token AND c.issue_id=d.issue_id WHERE d.issue_id=?1 AND d.version=?2",
            params![issue_id, version],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(db_error)?;
    Ok((
        Draft { version, markdown },
        serde_json::from_str(&rules).map_err(|e| e.to_string())?,
    ))
}

pub fn claim_scheduled(data: &Path, board_id: Option<&str>) -> Result<Option<ScheduledTask>> {
    let mut db = super::open(data)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(db_error)?;
    if let Some(id) = board_id {
        board::ensure_board(&tx, id)?;
    }
    let queued = tx
        .query_row(
            "SELECT q.id, q.issue_id, q.version, q.board_id, i.title, q.supplemental, q.proposal
         FROM nuts_retros q JOIN issues i ON i.id=q.issue_id
         JOIN results r ON r.issue_id=q.issue_id AND r.version=q.version
         WHERE q.state='pending' AND (q.expires_at IS NULL OR q.expires_at <= unixepoch())
           AND (?1 IS NULL OR q.board_id=?1)
         ORDER BY q.rowid LIMIT 1",
            [board_id],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, i64>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                    r.get::<_, Option<String>>(5)?,
                    r.get::<_, Option<String>>(6)?,
                ))
            },
        )
        .optional()
        .map_err(db_error)?;
    let Some((id, issue_id, version, board_id, title, supplemental, prepared)) = queued else {
        tx.commit().map_err(db_error)?;
        return super::claim_next(data, board_id)
            .map(|claim| claim.map(|c| ScheduledTask::Issue(Box::new(c))));
    };

    let (accepted, rules) = snapshot(&tx, &issue_id, version)?;
    let goal = settings::load_task(&tx, &issue_id)?.goal;
    let prepared_proposal = prepared
        .map(|value| serde_json::from_str(&value))
        .transpose()
        .map_err(|e| e.to_string())?;
    let reviews = {
        let mut query = tx
            .prepare(
                "WITH RECURSIVE lineage(version) AS (
                SELECT ?2
                UNION ALL
                SELECT COALESCE(r.base_version, l.version-1)
                FROM lineage l LEFT JOIN nuts_review_rounds r
                ON r.issue_id=?1 AND r.next_version=l.version WHERE l.version>1
             )
             SELECT b.version,b.markdown,a.version,a.markdown,r.feedback FROM lineage l
             JOIN nuts_review_rounds r ON r.issue_id=?1 AND r.next_version=l.version
             JOIN drafts b ON b.issue_id=r.issue_id AND b.version=r.base_version
             JOIN drafts a ON a.issue_id=r.issue_id AND a.version=r.next_version
             ORDER BY a.version",
            )
            .map_err(db_error)?;
        let rows = query
            .query_map(params![issue_id, version], |r| {
                Ok(ReviewRound {
                    before: Draft {
                        version: r.get(0)?,
                        markdown: r.get(1)?,
                    },
                    after: Draft {
                        version: r.get(2)?,
                        markdown: r.get(3)?,
                    },
                    feedback: r.get(4)?,
                })
            })
            .map_err(db_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(db_error)?
    };
    let token = Uuid::new_v4().to_string();
    tx.execute(
        "UPDATE nuts_retros SET token=?2,expires_at=unixepoch()+3600 WHERE id=?1",
        params![id, token],
    )
    .map_err(db_error)?;
    tx.commit().map_err(db_error)?;
    Ok(Some(ScheduledTask::Retrospective(Box::new(RetroClaim {
        id,
        token,
        issue_id,
        board_id,
        title,
        goal,
        accepted,
        supplemental,
        prepared_proposal,
        reviews,
        rules,
    }))))
}

#[derive(Serialize)]
pub struct RetroOutcome {
    state: String,
}

pub fn finish(data: &Path, id: &str, token: &str, path: &Path) -> Result<RetroOutcome> {
    let input = super::read_markdown(path)?;
    let proposal: Proposal = serde_json::from_str(&input).map_err(|e| e.to_string())?;
    if proposal.reason.trim().is_empty() || proposal.reason.len() > 2048 {
        return Err("Enter a reason of up to 2048 bytes".into());
    }
    finish_proposal(data, id, token, &proposal)
}

fn finish_proposal(
    data: &Path,
    id: &str,
    token: &str,
    proposal: &Proposal,
) -> Result<RetroOutcome> {
    let mut db = super::open(data)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(db_error)?;
    let (issue_id, version, board_id, state, active, prepared): (
        String,
        i64,
        String,
        String,
        bool,
        Option<String>,
    ) = tx
        .query_row(
            "SELECT issue_id,version,board_id,state,COALESCE(expires_at>unixepoch(),0),proposal
         FROM nuts_retros WHERE id=?1 AND token=?2",
            params![id, token],
            |r| {
                Ok((
                    r.get(0)?,
                    r.get(1)?,
                    r.get(2)?,
                    r.get(3)?,
                    r.get(4)?,
                    r.get(5)?,
                ))
            },
        )
        .optional()
        .map_err(db_error)?
        .ok_or("Retrospective claim is unavailable")?;
    if state != "pending" {
        return Ok(RetroOutcome { state });
    }
    if !active {
        return Err("Retrospective claim expired".into());
    }
    let candidate = serde_json::to_string(&proposal).map_err(|e| e.to_string())?;
    if prepared.as_deref().is_some_and(|prior| prior != candidate) {
        return Err("Retry with the stored retrospective proposal".into());
    }
    let (accepted, rules) = snapshot(&tx, &issue_id, version)?;
    let instruction = match proposal.change.as_ref() {
        Some(Change::Skill { instruction, .. } | Change::Rules { instruction }) => {
            instruction.trim()
        }
        None => "",
    };
    if proposal.change.is_some()
        && (instruction.is_empty()
            || instruction.len() > 1500
            || instruction.lines().count() != 1
            || instruction.contains('`'))
    {
        return Err("Provide a short Markdown instruction without code".into());
    }

    let current_result = tx
        .query_row(
            "SELECT version FROM results WHERE issue_id=?1",
            [&issue_id],
            |r| r.get::<_, i64>(0),
        )
        .optional()
        .map_err(db_error)?;
    if current_result != Some(accepted.version) {
        return record(tx, id, "superseded", &candidate);
    }
    let Some(change) = proposal.change.as_ref() else {
        return record(tx, id, "no_change", &candidate);
    };
    let evidence: bool = tx.query_row(
        "WITH RECURSIVE lineage(version) AS (
            SELECT ?3 UNION ALL SELECT COALESCE(r.base_version,l.version-1) FROM lineage l
            LEFT JOIN nuts_review_rounds r ON r.issue_id=?2 AND r.next_version=l.version WHERE l.version>1
         ) SELECT COALESCE(trim(supplemental)<>'',0) OR EXISTS (
           SELECT 1 FROM nuts_review_rounds r JOIN lineage l ON l.version=r.next_version WHERE r.issue_id=?2
         ) FROM nuts_retros WHERE id=?1",
        params![id, issue_id, version], |r| r.get(0),
    ).map_err(db_error)?;
    if !evidence {
        return record(tx, id, "needs_evidence", &candidate);
    }

    match prepared {
        None => {
            // Journal the proposal before touching disk so a restarted agent can resume it.
            tx.execute(
                "UPDATE nuts_retros SET proposal=?2 WHERE id=?1",
                params![id, candidate],
            )
            .map_err(db_error)?;
            tx.commit().map_err(db_error)?;
            return finish_proposal(data, id, token, proposal);
        }
        _ => {}
    }
    let folder = board_files::board_directory(data, &board_id)?;
    let applied = match change {
        Change::Rules { .. } => {
            board_files::apply_retrospective_rule(&folder, &rules.text, instruction, false)?
        }
        Change::Skill { skill_id, .. } => match rules
            .file_skills
            .as_ref()
            .and_then(|skills| skills.iter().find(|s| &s.id == skill_id))
        {
            Some(skill) => {
                board_files::apply_retrospective_skill(&folder, skill, instruction, false)?
            }
            None => false,
        },
    };
    record(
        tx,
        id,
        if applied { "applied" } else { "conflict" },
        &candidate,
    )
}

fn record(
    tx: rusqlite::Transaction<'_>,
    id: &str,
    state: &str,
    proposal: &str,
) -> Result<RetroOutcome> {
    tx.execute(
        "UPDATE nuts_retros SET state=?2,proposal=?3 WHERE id=?1",
        params![id, state, proposal],
    )
    .map_err(db_error)?;
    tx.commit().map_err(db_error)?;
    Ok(RetroOutcome {
        state: state.into(),
    })
}

pub fn undo(data: &Path, id: &str) -> Result<RetroOutcome> {
    let mut db = super::open(data)?;
    let tx = db
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(db_error)?;
    let (issue, version, board_id, state, proposal): (String, i64, String, String, String) = tx.query_row(
        "SELECT issue_id,version,board_id,state,proposal FROM nuts_retros WHERE id=?1 AND state IN ('applied','undone')",
        [id], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?)),
    ).optional().map_err(db_error)?.ok_or("Applied retrospective not found")?;
    if state == "undone" {
        return Ok(RetroOutcome { state });
    }
    let (_, rules) = snapshot(&tx, &issue, version)?;
    let folder = board_files::board_directory(data, &board_id)?;
    let change: Proposal = serde_json::from_str(&proposal).map_err(|e| e.to_string())?;
    let restored = match change.change {
        Some(Change::Rules { instruction }) => {
            board_files::apply_retrospective_rule(&folder, &rules.text, instruction.trim(), true)?
        }
        Some(Change::Skill {
            skill_id,
            instruction,
        }) => {
            let skill = rules
                .file_skills
                .as_ref()
                .and_then(|skills| skills.iter().find(|s| s.id == skill_id))
                .ok_or("Original Skill is unavailable")?;
            board_files::apply_retrospective_skill(&folder, skill, instruction.trim(), true)?
        }
        None => false,
    };
    if !restored {
        return Err("Board files changed after the retrospective".into());
    }
    record(tx, id, "undone", &proposal)
}

#[derive(Serialize)]
pub struct RetroRecord {
    id: String,
    issue_id: String,
    version: i64,
    board_id: String,
    state: String,
    proposal: Option<Proposal>,
}

pub fn list(data: &Path, board_id: Option<&str>) -> Result<Vec<RetroRecord>> {
    let db = super::open(data)?;
    let mut query = db
        .prepare(
            "SELECT id,issue_id,version,board_id,state,proposal FROM nuts_retros
         WHERE (?1 IS NULL OR board_id=?1) ORDER BY rowid DESC",
        )
        .map_err(db_error)?;
    let rows = query
        .query_map([board_id], |r| {
            Ok((
                r.get(0)?,
                r.get(1)?,
                r.get(2)?,
                r.get(3)?,
                r.get(4)?,
                r.get::<_, Option<String>>(5)?,
            ))
        })
        .map_err(db_error)?;
    rows.map(|row| {
        let (id, issue_id, version, board_id, state, proposal) = row.map_err(db_error)?;
        let proposal = proposal
            .map(|text| serde_json::from_str(&text))
            .transpose()
            .map_err(|e| e.to_string())?;
        Ok(RetroRecord {
            id,
            issue_id,
            version,
            board_id,
            state,
            proposal,
        })
    })
    .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::nuts::{self, review};

    fn accept(data: &Path, id: &str, title: &str) -> i64 {
        let claim = nuts::claim(data, id, None).unwrap();
        let version = nuts::submit(data, id, &claim.token, title).unwrap();
        review::queue(
            data,
            id,
            version,
            &[review::Comment {
                start: None,
                end: None,
                quote: None,
                text: "以后每张分流图都先核对每条路径专属道具。".into(),
            }],
        )
        .unwrap();
        let revision = nuts::claim(data, id, None).unwrap();
        let version = nuts::submit(data, id, &revision.token, "Revised diagram").unwrap();
        for _ in 0..2 {
            nuts::save_result(data, id, version, None, |p| Ok(p.to_path_buf())).unwrap();
        }
        version
    }

    fn create_issue(data: &Path, board_id: &str) -> String {
        let card = board::add(data, board_id, "原始资料", "路径 A 和 B", "note", 0, 0).unwrap();
        let issue =
            board::create_issue(data, board_id, "分流图", &[card], None, "画分流图").unwrap();
        board::open_issue(data, &issue).unwrap();
        issue
    }

    fn take_retro(data: &Path, board_id: &str) -> Box<RetroClaim> {
        match claim_scheduled(data, Some(board_id)).unwrap().unwrap() {
            ScheduledTask::Retrospective(claim) => claim,
            ScheduledTask::Issue(_) => panic!("Expected a retrospective"),
        }
    }

    #[test]
    fn accepted_revision_is_claimed_once_and_applies_with_undo() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let board_id = board::create_board(data, "文章", "article", "zh-CN").unwrap();
        let issue = create_issue(data, &board_id);
        let version = accept(data, &issue, "Original diagram");
        assert!(nuts::claim_next(data, Some(&board_id)).unwrap().is_none());
        let claim = take_retro(data, &board_id);
        assert_eq!(claim.accepted.version, version);
        assert_eq!(claim.reviews.len(), 1);
        assert!(claim.reviews[0].feedback.contains("专属道具"));
        assert!(claim_scheduled(data, Some(&board_id)).unwrap().is_none());
        assert!(claim_scheduled(data, Some("default")).unwrap().is_none());

        let path = settings::open_skill_folder_path(data, &board_id, "illustrate")
            .unwrap()
            .join("SKILL.md");
        let original = std::fs::read_to_string(&path).unwrap();
        let proposal = data.join("proposal.json");
        std::fs::write(&proposal,
            r#"{"reason":"From the accepted review comment","change":{"target":"skill","skill_id":"illustrate","instruction":"Verify exclusive props for each diagram branch."}}"#,
        ).unwrap();
        for _ in 0..2 {
            assert_eq!(
                finish(data, &claim.id, &claim.token, &proposal)
                    .unwrap()
                    .state,
                "applied"
            );
        }
        let next_id = create_issue(data, &board_id);
        let next = nuts::claim_next(data, Some(&board_id)).unwrap().unwrap();
        assert_eq!(next.issue.id, next_id);
        let packages = next.rules.file_skills.unwrap();
        assert_eq!(
            packages
                .iter()
                .find(|p| p.id == "illustrate")
                .unwrap()
                .files["SKILL.md"]
                .matches("Verify exclusive props")
                .count(),
            1
        );
        assert_eq!(list(data, Some(&board_id)).unwrap().len(), 1);
        assert_eq!(undo(data, &claim.id).unwrap().state, "undone");
        assert_eq!(std::fs::read_to_string(&path).unwrap(), original);
    }

    #[test]
    fn expired_claim_is_replaced_and_user_edits_are_preserved() {
        let tmp = tempfile::tempdir().unwrap();
        let data = tmp.path();
        let board_id = board::create_board(data, "文章", "article", "zh-CN").unwrap();
        let issue = create_issue(data, &board_id);
        accept(data, &issue, "Original diagram");
        let first = take_retro(data, &board_id);
        nuts::open(data)
            .unwrap()
            .execute("UPDATE nuts_retros SET expires_at=0", [])
            .unwrap();
        let retry = take_retro(data, &board_id);
        assert_eq!(first.id, retry.id);
        assert_ne!(first.token, retry.token);
        let path = settings::open_skill_folder_path(data, &board_id, "illustrate")
            .unwrap()
            .join("SKILL.md");
        std::fs::write(&path, "# User's own edits").unwrap();
        let proposal = data.join("proposal.json");
        std::fs::write(&proposal,
            r#"{"reason":"From the accepted review comment","change":{"target":"skill","skill_id":"illustrate","instruction":"Verify branch props."}}"#,
        ).unwrap();
        assert!(finish(data, &first.id, &first.token, &proposal).is_err());
        assert_eq!(
            finish(data, &retry.id, &retry.token, &proposal)
                .unwrap()
                .state,
            "conflict"
        );
        assert_eq!(std::fs::read_to_string(path).unwrap(), "# User's own edits");
        assert!(list(data, Some(&board_id)).unwrap()[0].proposal.is_some());
    }
}
