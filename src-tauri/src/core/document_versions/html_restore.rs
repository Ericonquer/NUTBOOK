//! Plan immutable HTML recovery before creating anything in a user directory.
use super::{digest, Dependency, HistoryError, Result, Snapshot};
use std::collections::BTreeMap;
fn invalid(message: &str) -> HistoryError {
    HistoryError::Invalid(message.into())
}
fn safe_path(path: &str) -> bool {
    !path.is_empty()
        && !path.contains(['\\', ':', '\0'])
        && path
            .split('/')
            .all(|part| !part.is_empty() && part != "." && part != "..")
}
fn encoded_path(path: &str) -> Result<String> {
    let mut url = url::Url::parse("file:///").map_err(|_| invalid("recovery URL"))?;
    {
        let mut segments = url
            .path_segments_mut()
            .map_err(|_| invalid("recovery URL"))?;
        segments.clear();
        for segment in path.split('/') {
            segments.push(segment);
        }
    }
    Ok(url.path().trim_start_matches('/').to_string())
}
pub(super) struct HtmlRestorePlan {
    pub body: Vec<u8>,
    pub files: BTreeMap<String, Vec<u8>>,
}
pub(super) fn plan(
    snapshot: &Snapshot,
    objects: &BTreeMap<String, Vec<u8>>,
    directory: &str,
    allow_incomplete: bool,
) -> Result<HtmlRestorePlan> {
    if !safe_path(directory) || directory.contains('/') {
        return Err(invalid("recovery directory"));
    }
    let graph = snapshot
        .html
        .as_ref()
        .ok_or_else(|| invalid("missing HTML graph"))?;
    if !safe_path(&graph.document_path) {
        return Err(invalid("recovery entry path"));
    }
    if !allow_incomplete
        && snapshot
            .dependencies
            .values()
            .any(|d| !matches!(d, Dependency::Captured { .. }))
    {
        return Err(invalid("incomplete version requires explicit confirmation"));
    }
    let read = |hash: &str| -> Result<Vec<u8>> {
        let bytes = objects
            .get(hash)
            .ok_or_else(|| invalid("missing recovery object"))?;
        if digest(bytes) != hash {
            return Err(invalid("recovery object hash"));
        }
        Ok(bytes.clone())
    };
    let mut files = BTreeMap::new();
    for (key, dep) in &snapshot.dependencies {
        match dep {
            Dependency::Captured { object, .. } => {
                if !safe_path(key) || key == &graph.document_path || key == ".nutbook-owner.json" {
                    return Err(invalid("unsafe recovery resource path"));
                }
                files.insert(key.clone(), read(object)?);
            }
            Dependency::NotCaptured { reason } if key.starts_with("html:warning:") => {
                // Scripts remain executable in restored normal reading. This
                // generic uncertainty is confirmed by the caller; unsupported
                // syntax/base/srcset/media cannot be relocated safely.
                if reason != "script runtime dependencies cannot be proven statically" {
                    return Err(invalid("unsupported dependency prevents HTML relocation"));
                }
            }
            _ => {}
        }
    }
    let mut replacements = BTreeMap::new();
    for edge in &graph.edges {
        if edge.source != graph.document_path {
            continue;
        }
        let mut target = match snapshot.dependencies.get(&edge.target) {
            Some(Dependency::Captured { .. }) | Some(Dependency::MissingAtSave { .. }) => {
                if !safe_path(&edge.target) {
                    return Err(invalid("unsafe recovery edge"));
                }
                format!("./{}", encoded_path(&format!("{directory}/{}", edge.target))?)
            }
            _ => "about:blank".into(),
        };
        if let Some(index) = edge.reference.find(['?', '#']) {
            target.push_str(&edge.reference[index..]);
        }
        replacements.insert(edge.reference.clone(), target);
    }
    // Resource trees keep their original relative topology, including cycles.
    // Reject absolute/base/dynamic cases instead of reading a new live location.
    for edge in &graph.edges {
        if edge.source == graph.document_path {
            continue;
        }
        if edge.reference.starts_with('/') || edge.reference.contains(':') {
            return Err(invalid("absolute nested dependency cannot be relocated"));
        }
        if !matches!(
            snapshot.dependencies.get(&edge.target),
            Some(Dependency::Captured { .. }) | Some(Dependency::MissingAtSave { .. })
        ) {
            return Err(invalid("uncaptured nested dependency cannot be relocated"));
        }
    }
    let body =
        String::from_utf8(read(&snapshot.body)?).map_err(|_| invalid("HTML recovery encoding"))?;
    let body = crate::core::html_edit::relocate_archived_html_entry(&body, &replacements)
        .map_err(|_| invalid("unsupported HTML entry relocation"))?
        .into_bytes();
    Ok(HtmlRestorePlan { body, files })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    #[test]
    fn entry_relocation_preserves_code_comments_json_and_only_changes_resource_tokens() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("entry.html");
        let body = br#"<!doctype html><!-- img src='a.png' --><h1 data-x='a.png'>Title</h1><img src='a.png?cache=1#x'><style>p{background:url(a.png)}p:before{content:'a.png'}</style><script type='module'>const example='a.png'; import './module.js';</script><script type='application/json'>{"text":"a.png","regex":"/raw/"}</script>"#;
        fs::write(&path,body).unwrap();
        fs::write(dir.path().join("a.png"),b"image").unwrap();
        fs::write(dir.path().join("module.js"),b"export const a=1;").unwrap();
        let captured = super::super::capture_html(&path,dir.path(),body,100_000).unwrap();
        let result = plan(&captured.document.snapshot,&captured.document.objects,".recovery",true).unwrap();
        let text = String::from_utf8(result.body).unwrap();
        assert!(text.contains("<!-- img src='a.png' -->"));
        assert!(text.contains("data-x='a.png'"));
        assert!(text.contains("src=\"./.recovery/a.png?cache=1#x\""));
        assert!(text.contains("const example='a.png'; import \"./.recovery/module.js\""));
        assert!(text.contains("content:'a.png'"));
        assert!(text.contains(r#"{"text":"a.png","regex":"/raw/"}"#));
        assert_eq!(result.files.len(),2);
    }
    #[test]
    fn unsupported_graph_refuses_before_any_files_are_created() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("entry.html");
        let body = br#"<base href="nested/"><img src="a.png">"#;
        fs::write(&path,body).unwrap();
        let captured = super::super::capture_html(&path,dir.path(),body,100_000).unwrap();
        assert!(plan(&captured.document.snapshot,&captured.document.objects,".recovery",true).is_err());
        assert!(!dir.path().join(".recovery").exists());
        assert!(plan(&captured.document.snapshot,&captured.document.objects,"../escape",true).is_err());
    }
}
