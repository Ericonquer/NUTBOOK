use std::{
    fs,
    io::{ErrorKind, Write},
    path::Path,
};

use rusqlite::params;
use serde::Serialize;
use sha2::{Digest, Sha256};

use super::{open, Result};

const CLAIM_ALPHABET: &[u8; 32] = b"0123456789ABCDEFGHJKMNPQRSTVWXYZ";

#[derive(Serialize)]
struct Handoff<'a> {
    cli: &'a Path,
    app_data_dir: &'a Path,
    issue_id: &'a str,
}

pub fn publish(data_dir: &Path, cli: &Path, issue_id: &str) -> Result<String> {
    let home = crate::core::cli::home_dir().map_err(|error| error.message)?;
    publish_in(
        &home.join(".nutbook").join("nuts-claims"),
        data_dir,
        cli,
        issue_id,
    )
}

fn publish_in(registry: &Path, data_dir: &Path, cli: &Path, issue_id: &str) -> Result<String> {
    let available: bool = open(data_dir)?
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM issues WHERE id = ?1 AND status = 'open')",
            params![issue_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if !available {
        return Err("This issue is no longer waiting for an agent".into());
    }
    let data_dir = data_dir.canonicalize().map_err(|error| error.to_string())?;
    let cli = cli.canonicalize().map_err(|error| error.to_string())?;
    let record = serde_json::to_vec(&Handoff {
        cli: &cli,
        app_data_dir: &data_dir,
        issue_id,
    })
    .map_err(|error| error.to_string())?;
    let mut builder = fs::DirBuilder::new();
    builder.recursive(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        builder.mode(0o700);
    }
    builder
        .create(registry)
        .map_err(|error| error.to_string())?;

    let hash = Sha256::digest(&record);
    for part in hash.chunks_exact(4) {
        let value = u32::from_be_bytes(part.try_into().expect("four digest bytes"));
        let mut code = String::from("NUT-");
        for shift in [25, 20, 15, 10, 5, 0] {
            code.push(char::from(CLAIM_ALPHABET[((value >> shift) & 31) as usize]));
        }
        let path = registry.join(format!("{code}.json"));
        let mut staged =
            tempfile::NamedTempFile::new_in(registry).map_err(|error| error.to_string())?;
        staged
            .write_all(&record)
            .map_err(|error| error.to_string())?;
        match staged.persist_noclobber(&path) {
            Ok(_) => return Ok(code),
            Err(error) if error.error.kind() == ErrorKind::AlreadyExists => {
                let current = fs::symlink_metadata(&path).map_err(|error| error.to_string())?;
                if current.is_file() && current.len() <= 16384 {
                    let stored = fs::read(&path).map_err(|error| error.to_string())?;
                    if stored == record {
                        return Ok(code);
                    }
                }
            }
            Err(error) => return Err(error.error.to_string()),
        }
    }
    Err("Could not allocate a unique issue number".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn short_number_identifies_the_correct_local_library() {
        let root = tempfile::tempdir().unwrap();
        let data_dir = root.path().join("preview");
        let other_dir = root.path().join("production");
        let registry = root.path().join("numbers");
        let cli = std::env::current_exe().unwrap();
        let issue =
            crate::core::nuts::create(&data_dir, "Preview task", "sample.md", "sample").unwrap();
        let other =
            crate::core::nuts::create(&other_dir, "Other task", "sample.md", "sample").unwrap();
        let code = publish_in(&registry, &data_dir, &cli, &issue).unwrap();
        let suffix = code.strip_prefix("NUT-").unwrap();
        assert_eq!(suffix.len(), 6);
        assert!(suffix.bytes().all(|byte| CLAIM_ALPHABET.contains(&byte)));
        assert_eq!(
            publish_in(&registry, &data_dir, &cli, &issue).unwrap(),
            code
        );
        assert_ne!(
            publish_in(&registry, &other_dir, &cli, &other).unwrap(),
            code
        );
        assert!(publish_in(&registry, &other_dir, &cli, &issue).is_err());
        let record: serde_json::Value =
            serde_json::from_slice(&fs::read(registry.join(format!("{code}.json"))).unwrap())
                .unwrap();
        assert_eq!(record["issue_id"], issue);
        assert_eq!(
            record["app_data_dir"],
            data_dir.canonicalize().unwrap().to_str().unwrap()
        );
        assert!(record.get("token").is_none());

        let occupied = registry.join(format!("{code}.json"));
        fs::write(&occupied, b"already reserved").unwrap();
        let fallback = publish_in(&registry, &data_dir, &cli, &issue).unwrap();
        assert_ne!(fallback, code);
        assert_eq!(fallback.len(), code.len());
        assert_eq!(fs::read(&occupied).unwrap(), b"already reserved");
        assert_eq!(
            publish_in(&registry, &data_dir, &cli, &issue).unwrap(),
            fallback
        );
        let claim = crate::core::nuts::claim(&data_dir, &issue, None).unwrap();
        assert!(publish_in(&registry, &data_dir, &cli, &issue).is_err());
        crate::core::nuts::submit(&data_dir, &issue, &claim.token, "## Draft").unwrap();
    }
}
