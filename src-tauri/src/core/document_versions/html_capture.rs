//! Bounded static HTML graph capture. Never executes JS or fetches a URL.
//! The captured graph is archived with each snapshot for inert preview and
//! resource relocation; capture itself never publishes source changes.
use super::{
    capture::{capture_reference, CapturedDocument},
    digest, Dependency, HistoryError, Result, Snapshot,
};
use html5ever::{parse_document, tendril::TendrilSink};
use markup5ever_rcdom::{Handle, NodeData, RcDom};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, BTreeSet, VecDeque},
    path::Path,
};
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HtmlDependencyEdge {
    pub source: String,
    pub reference: String,
    pub target: String,
}
pub struct CapturedHtml {
    pub document: CapturedDocument,
    pub document_path: String,
    pub edges: Vec<HtmlDependencyEdge>,
}
impl CapturedHtml {
    pub fn recheck(&self) -> Result<()> {
        self.document.recheck()
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
enum Kind {
    Blob,
    Css,
    Js,
}
#[derive(Clone)]
struct Reference {
    value: String,
    kind: Kind,
}
struct Scan {
    refs: Vec<Reference>,
    warnings: Vec<String>,
    base: Option<String>,
    nodes: usize,
}
fn invalid(message: &str) -> HistoryError {
    HistoryError::Invalid(message.into())
}
fn text(handle: &Handle) -> String {
    handle
        .children
        .borrow()
        .iter()
        .filter_map(|node| match &node.data {
            NodeData::Text { contents } => Some(contents.borrow().to_string()),
            _ => None,
        })
        .collect()
}
fn visit(handle: &Handle, scan: &mut Scan, depth: usize) -> Result<()> {
    scan.nodes += 1;
    if depth > 256 || scan.nodes > 100_000 {
        return Err(invalid("HTML node/depth limit exceeded"));
    }
    if let NodeData::Element { name, attrs, .. } = &handle.data {
        let attrs = attrs.borrow();
        let attr = |key: &str| {
            attrs
                .iter()
                .find(|a| a.name.local.as_ref() == key)
                .map(|a| a.value.to_string())
        };
        let tag = name.local.as_ref();
        if tag == "base" && scan.base.is_none() {
            scan.base = attr("href");
            if scan.base.is_some() {
                scan.warnings
                    .push("base URL relocation requires explicit handling".into());
            }
        }
        let mut add = |key: &str, kind: Kind| {
            if let Some(value) = attr(key) {
                scan.refs.push(Reference { value, kind });
            }
        };
        match tag {
            "img" => add("src", Kind::Blob),
            "script" => add("src", Kind::Js),
            "link" => {
                let rel = attr("rel").unwrap_or_default();
                if rel
                    .split_whitespace()
                    .any(|r| r.eq_ignore_ascii_case("stylesheet"))
                {
                    add("href", Kind::Css);
                } else if rel
                    .split_whitespace()
                    .any(|r| matches!(r, "icon" | "preload" | "modulepreload"))
                {
                    add(
                        "href",
                        if rel == "modulepreload" {
                            Kind::Js
                        } else {
                            Kind::Blob
                        },
                    );
                }
            }
            "video" => add("poster", Kind::Blob),
            "image" | "use" => {
                add("href", Kind::Blob);
                scan.warnings
                    .push("SVG nested resource dependencies are not fully captured".into());
            }
            _ => {}
        }
        if attr("srcset").is_some() {
            scan.warnings
                .push("responsive srcset is not yet captured".into());
        }
        if matches!(tag, "iframe" | "object" | "embed" | "audio" | "video") {
            scan.warnings
                .push("embedded/media runtime resources are not captured".into());
        }
        if let Some(style) = attr("style") {
            scan_css(&style, scan)?;
        }
        if tag == "style" {
            scan_css(&text(handle), scan)?;
        }
        if tag == "script" && attr("src").is_none() {
            let kind = attr("type").unwrap_or_default();
            if kind.is_empty() || kind == "module" || kind.contains("javascript") {
                scan_js(&text(handle), scan)?;
            }
        }
    }
    for child in handle.children.borrow().iter() {
        visit(child, scan, depth + 1)?;
    }
    Ok(())
}
#[derive(Debug)]
struct Token {
    value: String,
    quoted: bool,
    start: usize,
    end: usize,
    escaped: bool,
}
fn tokens(source: &str, js: bool) -> Result<(Vec<Token>, bool)> {
    let bytes = source.as_bytes();
    let mut i = 0;
    let mut out = Vec::new();
    let uncertain = false;
    while i < bytes.len() {
        if out.len() > 200_000 {
            return Err(invalid("resource token limit exceeded"));
        }
        if bytes[i].is_ascii_whitespace() {
            i += 1;
            continue;
        }
        if bytes[i..].starts_with(b"/*") {
            let Some(end) = source[i + 2..].find("*/") else {
                return Ok((out, true));
            };
            i += end + 4;
            continue;
        }
        if js && bytes[i..].starts_with(b"//") {
            i = source[i..]
                .find('\n')
                .map(|n| i + n + 1)
                .unwrap_or(bytes.len());
            continue;
        }
        if bytes[i] == b'\'' || bytes[i] == b'"' {
            let quote = bytes[i];
            let start = i;
            i += 1;
            let value_start = i;
            let mut escaped = false;
            while i < bytes.len() && bytes[i] != quote {
                if bytes[i] == b'\\' {
                    escaped = true;
                    i += 1;
                }
                i += 1;
            }
            if i >= bytes.len() {
                return Ok((out, true));
            }
            let value = source[value_start..i].to_owned();
            i += 1;
            out.push(Token {
                value,
                quoted: true,
                start,
                end: i,
                escaped,
            });
            continue;
        }
        let start = i;
        if bytes[i].is_ascii_alphabetic() || bytes[i] == b'_' || bytes[i] == b'$' {
            i += 1;
            while i < bytes.len()
                && (bytes[i].is_ascii_alphanumeric()
                    || bytes[i] == b'_'
                    || bytes[i] == b'$'
                    || bytes[i] == b'-')
            {
                i += 1;
            }
        } else {
            i += source[i..].chars().next().unwrap().len_utf8();
        }
        let value = source[start..i].to_owned();
        if js && (value == "`" || value == "/" || value == "\\") {
            return Ok((out, true));
        }
        out.push(Token {
            value,
            quoted: false,
            start,
            end: i,
            escaped: false,
        });
    }
    Ok((out, uncertain))
}
// Parser-token ranges avoid replacing lookalikes in comments or content strings.
pub(super) fn project_css(source: &str, replacements: &BTreeMap<String, String>) -> Result<String> {
    let (tokens, uncertain) = tokens(source, false)?;
    if uncertain { return Err(invalid("incomplete CSS projection syntax")); }
    let mut edits = Vec::new();
    let mut i = 0;
    while i < tokens.len() {
        let token = &tokens[i];
        if !token.quoted && token.value == "@"
            && tokens.get(i + 1).is_some_and(|t| t.value.eq_ignore_ascii_case("import")) {
            if let Some(value) = tokens.get(i + 2).filter(|t| t.quoted) {
                let target = replacements.get(&value.value).map(String::as_str).unwrap_or("about:blank");
                edits.push((value.start, value.end, format!("\"{target}\"")));
                i += 3; continue;
            }
        }
        if !token.quoted && token.value.eq_ignore_ascii_case("url")
            && tokens.get(i + 1).is_some_and(|t| t.value == "(") {
            let start = i + 2;
            let end = (start..tokens.len()).find(|&n| !tokens[n].quoted && tokens[n].value == ")")
                .ok_or_else(|| invalid("unresolved CSS URL"))?;
            let value = if end == start + 1 && tokens[start].quoted {
                tokens[start].value.clone()
            } else { source[tokens[i + 1].end..tokens[end].start].trim().to_owned() };
            let target = replacements.get(&value).map(String::as_str).unwrap_or("about:blank");
            edits.push((token.start, tokens[end].end, format!("url(\"{target}\")")));
            i = end + 1; continue;
        }
        i += 1;
    }
    let mut output = source.to_owned();
    for (start, end, value) in edits.into_iter().rev() { output.replace_range(start..end, &value); }
    Ok(output)
}
/// Preserve non-resource CSS bytes; rewrite only captured reference tokens.
pub(crate) fn relocate_css(source: &str, replacements: &BTreeMap<String, String>) -> Result<String> {
    let mut scan = scan();
    scan_css(source, &mut scan)?;
    if !scan.warnings.is_empty() { return Err(invalid("unsupported CSS relocation syntax")); }
    let identity = scan.refs.into_iter().map(|r| {
        let value = replacements.get(&r.value).cloned().unwrap_or_else(|| r.value.clone());
        (r.value, value)
    }).collect();
    project_css(source, &identity)
}
/// Rewrite only static import/export specifier tokens, never ordinary strings.
pub(crate) fn relocate_modules(source: &str, replacements: &BTreeMap<String, String>) -> Result<String> {
    let (tokens, uncertain) = tokens(source, true)?;
    if uncertain { return Err(invalid("ambiguous module relocation syntax")); }
    let mut edits = Vec::new();
    for (i, token) in tokens.iter().enumerate() {
        if token.quoted || !matches!(token.value.as_str(), "import" | "export") { continue; }
        let next = tokens.get(i + 1);
        if token.value == "import" && next.is_some_and(|t| t.value == "(" || t.value == ".") {
            return Err(invalid("dynamic module relocation unsupported"));
        }
        let value = if token.value == "import" && next.is_some_and(|t| t.quoted) { next } else {
            tokens.iter().enumerate().skip(i + 1).take_while(|(_,t)| t.value != ";")
                .find_map(|(n,t)| if !t.quoted && t.value == "from" { tokens.get(n+1).filter(|t|t.quoted) } else { None })
        };
        if let Some(value) = value {
            if value.escaped { return Err(invalid("escaped module relocation unsupported")); }
            if let Some(target) = replacements.get(&value.value) {
                edits.push((value.start, value.end, serde_json::to_string(target).map_err(|_| invalid("module URL"))?));
            }
        }
    }
    let mut output = source.to_owned();
    for (start,end,value) in edits.into_iter().rev() { output.replace_range(start..end,&value); }
    Ok(output)
}
fn scan_css(source: &str, scan: &mut Scan) -> Result<()> {
    let (tokens, uncertain) = tokens(source, false)?;
    if uncertain { scan.warnings.push("incomplete CSS syntax is not fully captured".into()); return Ok(()); }
    if source.contains('\\') {
        scan.warnings
            .push("escaped CSS syntax is not fully captured".into());
    }
    let mut i = 0;
    while i < tokens.len() {
        let token = &tokens[i];
        if !token.quoted
            && token.value == "@"
            && tokens
                .get(i + 1)
                .is_some_and(|t| t.value.eq_ignore_ascii_case("import"))
        {
            if let Some(value) = tokens.get(i + 2).filter(|t| t.quoted) {
                if value.escaped {
                    scan.warnings
                        .push("escaped CSS import is unsupported".into());
                } else {
                    scan.refs.push(Reference {
                        value: value.value.clone(),
                        kind: Kind::Css,
                    });
                }
                i += 3;
                continue;
            }
        }
        if !token.quoted
            && token.value.eq_ignore_ascii_case("url")
            && tokens.get(i + 1).is_some_and(|t| t.value == "(")
        {
            let start = i + 2;
            let Some(end) =
                (start..tokens.len()).find(|&n| !tokens[n].quoted && tokens[n].value == ")")
            else {
                scan.warnings.push("unresolved CSS url()".into());
                break;
            };
            let value = if end == start + 1 && tokens[start].quoted && !tokens[start].escaped {
                Some(tokens[start].value.clone())
            } else if end > start
                && !tokens[start..end]
                    .iter()
                    .any(|t| t.quoted || t.escaped || t.value == "(")
            {
                let raw = source[tokens[i + 1].end..tokens[end].start].trim();
                if raw.contains('\\') || raw.contains("/*") || raw.chars().any(char::is_whitespace)
                {
                    None
                } else {
                    Some(raw.to_owned())
                }
            } else {
                None
            };
            if let Some(value) = value {
                let import = i >= 2
                    && tokens[i - 2].value == "@"
                    && tokens[i - 1].value.eq_ignore_ascii_case("import");
                scan.refs.push(Reference {
                    value,
                    kind: if import { Kind::Css } else { Kind::Blob },
                });
            } else {
                scan.warnings
                    .push("dynamic/escaped CSS URL is not captured".into());
            }
            i = end + 1;
            continue;
        }
        if !token.quoted
            && token.value.eq_ignore_ascii_case("local")
            && tokens.get(i + 1).is_some_and(|t| t.value == "(")
        {
            scan.warnings
                .push("system-local font is not archived".into());
        }
        if !token.quoted && matches!(token.value.as_str(), "image-set" | "-webkit-image-set") {
            scan.warnings
                .push("CSS image-set resources are not yet captured".into());
        }
        i += 1;
    }
    Ok(())
}
fn scan_js(source: &str, scan: &mut Scan) -> Result<()> {
    // Static imports are followed, but executable code can construct additional
    // runtime resources. Preserve that uncertainty instead of claiming complete.
    scan.warnings
        .push("script runtime dependencies cannot be proven statically".into());
    let (tokens, uncertain) = tokens(source, true)?;
    if uncertain {
        scan.warnings
            .push("template/regexp or ambiguous script syntax is not followed".into());
        return Ok(());
    }
    for (i, token) in tokens.iter().enumerate() {
        if token.quoted || !matches!(token.value.as_str(), "import" | "export") {
            continue;
        }
        let next = tokens.get(i + 1);
        if token.value == "import" && next.is_some_and(|t| t.value == "(" || t.value == ".") {
            scan.warnings.push("dynamic module references cannot be relocated".into());
            continue;
        }
        let value = if token.value == "import" && next.is_some_and(|t| t.quoted) {
            next
        } else {
            tokens
                .iter()
                .enumerate()
                .skip(i + 1)
                .take_while(|(_, t)| t.value != ";")
                .find_map(|(n, t)| {
                    if !t.quoted && t.value == "from" {
                        tokens.get(n + 1).filter(|t| t.quoted)
                    } else {
                        None
                    }
                })
        };
        if let Some(value) = value {
            if value.escaped {
                scan.warnings
                    .push("escaped module specifier is unsupported".into());
            } else if value.value.starts_with('.')
                || value.value.starts_with('/')
                || value.value.contains("://")
            {
                scan.refs.push(Reference {
                    value: value.value.clone(),
                    kind: Kind::Js,
                });
            } else {
                scan.warnings
                    .push("bare module/import-map specifier is not captured".into());
            }
        }
    }
    Ok(())
}
fn scan() -> Scan {
    Scan {
        refs: Vec::new(),
        warnings: Vec::new(),
        base: None,
        nodes: 0,
    }
}
/// Captures only under the caller's canonical authorized root. Bounds fail
/// explicitly; missing and unsupported references remain distinct states.
pub fn capture_html(
    path: &Path,
    authorized_root: &Path,
    body: &[u8],
    budget: u64,
) -> Result<CapturedHtml> {
    let root = authorized_root.canonicalize()?;
    let path = match path.canonicalize() {
        Ok(p) => p,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => path
            .parent()
            .ok_or_else(|| invalid("source parent"))?
            .canonicalize()?
            .join(path.file_name().ok_or_else(|| invalid("source filename"))?),
        Err(e) => return Err(e.into()),
    };
    if !path.starts_with(&root) {
        return Err(invalid("HTML source outside authorized root"));
    }
    if body.len() as u64 > budget {
        return Err(invalid("capture budget exceeded"));
    }
    let source = std::str::from_utf8(body).map_err(|_| invalid("HTML is not UTF-8"))?;
    let mut html = scan();
    let dom: RcDom = parse_document(RcDom::default(), Default::default()).one(source);
    visit(&dom.document, &mut html, 0)?;
    let mut base = url::Url::from_file_path(&path).map_err(|_| invalid("source URL"))?;
    if let Some(href) = &html.base {
        base = base.join(href).map_err(|_| invalid("invalid HTML base"))?;
    }
    let document_path = path
        .strip_prefix(&root)
        .unwrap()
        .to_string_lossy()
        .replace('\\', "/");
    let mut document = CapturedDocument {
        snapshot: Snapshot {
            body: digest(body),
            dependencies: BTreeMap::new(),
            html: None,
        },
        objects: BTreeMap::from([(digest(body), body.to_vec())]),
        reads: BTreeMap::new(),
        absent: BTreeSet::new(),
        bindings: BTreeMap::new(),
    };
    let mut queue = VecDeque::new();
    for reference in html.refs {
        queue.push_back((document_path.clone(), base.clone(), reference, 0usize));
    }
    for (n, warning) in html.warnings.into_iter().enumerate() {
        document.snapshot.dependencies.insert(
            format!("html:warning:document:{n}"),
            Dependency::NotCaptured { reason: warning },
        );
    }
    let mut edges = Vec::new();
    let mut visited = BTreeSet::new();
    let mut used = body.len() as u64;
    while let Some((from, base, reference, depth)) = queue.pop_front() {
        if edges.len() >= 4096 || depth > 16 {
            return Err(invalid("HTML resource graph limit exceeded"));
        }
        if reference.value.starts_with("data:")
            || reference.value.starts_with('#')
            || reference.value.is_empty()
        {
            continue;
        }
        let mut url = base
            .join(&reference.value)
            .map_err(|_| invalid("unresolvable resource URL"))?;
        url.set_fragment(None);
        url.set_query(None);
        let key = url
            .to_file_path()
            .ok()
            .and_then(|p| {
                p.strip_prefix(&root)
                    .ok()
                    .map(|p| p.to_string_lossy().replace('\\', "/"))
            })
            .unwrap_or_else(|| url.to_string());
        let dependency = if let Some(existing) = document.snapshot.dependencies.get(&key) {
            existing.clone()
        } else {
            let captured = capture_reference(
                &mut document,
                &root,
                &base,
                &reference.value,
                &mut used,
                budget,
            )?;
            document
                .snapshot
                .dependencies
                .insert(key.clone(), captured.clone());
            captured
        };
        edges.push(HtmlDependencyEdge {
            source: from,
            reference: reference.value,
            target: key.clone(),
        });
        if !visited.insert((key.clone(), reference.kind)) {
            continue;
        }
        if let Dependency::Captured { object, .. } = dependency {
            if reference.kind == Kind::Blob {
                if key.to_ascii_lowercase().ends_with(".svg")
                    && crate::core::markdown_cover_assets::validate_safe_svg(&document.objects[&object], Path::new("history.svg")).is_err() {
                    document.snapshot.dependencies.insert(
                        format!("html:warning:svg:{key}"),
                        Dependency::NotCaptured {
                            reason: "SVG nested resource dependencies are not fully captured"
                                .into(),
                        },
                    );
                }
                continue;
            }
            let bytes = &document.objects[&object];
            let code = std::str::from_utf8(bytes)
                .map_err(|_| invalid("CSS/module resource is not UTF-8"))?;
            let mut nested = scan();
            match reference.kind {
                Kind::Css => scan_css(code, &mut nested)?,
                Kind::Js => scan_js(code, &mut nested)?,
                Kind::Blob => {}
            }
            for (n, warning) in nested.warnings.into_iter().enumerate() {
                document.snapshot.dependencies.insert(
                    format!("html:warning:{key}:{n}"),
                    Dependency::NotCaptured { reason: warning },
                );
            }
            for reference in nested.refs {
                queue.push_back((key.clone(), url.clone(), reference, depth + 1));
            }
        }
    }
    document.snapshot.html = Some(super::HtmlResourceGraph {
        document_path: document_path.clone(),
        edges: edges.clone(),
    });
    document.recheck()?;
    Ok(CapturedHtml {
        document,
        document_path,
        edges,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    #[test]
    fn real_html_fixture_collects_transitive_css_modules_fonts_and_deduplicates_cycles() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("tests/fixtures/document-save-versions");
        let source = root.join("ordinary.html");
        let body = fs::read(&source).unwrap();
        let captured = capture_html(&source, &root, &body, 2_000_000).unwrap();
        assert_eq!(captured.document.objects[&digest(&body)], body);
        for key in [
            "shared/style.css",
            "nested/inner.css",
            "shared/image.svg",
            "shared/script.js",
            "nested/message.js",
            "shared/symbols.ttf",
        ] {
            let Dependency::Captured { object, .. } = &captured.document.snapshot.dependencies[key]
            else {
                panic!("not captured: {key}");
            };
            assert_eq!(
                captured.document.objects[object],
                fs::read(root.join(key)).unwrap()
            );
        }
        assert_eq!(captured.document.objects.len(), 7);
        assert_eq!(captured.document_path, "ordinary.html");
        assert!(captured
            .edges
            .iter()
            .any(|e| e.source == "nested/inner.css" && e.target == "shared/style.css"));
        assert!(captured
            .edges
            .iter()
            .any(|e| e.source == "shared/script.js" && e.target == "nested/message.js"));
        assert!(captured
            .document
            .snapshot
            .dependencies
            .values()
            .any(|d| matches!(d,Dependency::NotCaptured{reason} if reason.contains("runtime"))));
        captured.recheck().unwrap();
        assert!(capture_html(&source, &root, &body, body.len() as u64).is_err());
    }
    #[test]
    fn comments_strings_remote_dynamic_and_missing_are_not_invented_resources() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("a.html");
        let body=br#"<style>/* url(fake.png) */ a::before{content:"url(fake2.png)"}a{background:url('missing.png')}</style><script type="module">// import './fake.js';
const example="import './fake2.js'"; import './real.js'; import('./dynamic.js');</script><img src="https://example.invalid/remote.png"><img srcset="one.png 1x,two.png 2x">"#;
        fs::write(&source, body).unwrap();
        fs::write(dir.path().join("real.js"), b"export const n=1;").unwrap();
        let captured = capture_html(&source, dir.path(), body, 100_000).unwrap();
        assert!(matches!(
            captured.document.snapshot.dependencies["missing.png"],
            Dependency::MissingAtSave { .. }
        ));
        assert!(matches!(
            captured.document.snapshot.dependencies["real.js"],
            Dependency::Captured { .. }
        ));
        assert!(captured
            .document
            .snapshot
            .dependencies
            .keys()
            .all(|key| !key.contains("fake") && !key.ends_with("dynamic.js")));
        assert!(matches!(
            captured.document.snapshot.dependencies["https://example.invalid/remote.png"],
            Dependency::NotCaptured { .. }
        ));
        fs::write(dir.path().join("missing.png"), b"appeared").unwrap();
        assert!(matches!(captured.recheck(), Err(HistoryError::Conflict)));
    }
    #[test]
    fn transitive_changes_and_authorization_escape_are_detected() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().join("allowed");
        fs::create_dir(&root).unwrap();
        let source = root.join("a.html");
        let body = b"<link rel=stylesheet href=style.css><img src='../secret.png'>";
        fs::write(&source, body).unwrap();
        fs::write(root.join("style.css"), b"a{background:url(image.png)}").unwrap();
        fs::write(root.join("image.png"), b"image").unwrap();
        fs::write(dir.path().join("secret.png"), b"SECRET_CANARY").unwrap();
        let captured = capture_html(&source, &root, body, 100_000).unwrap();
        assert!(!captured
            .document
            .objects
            .values()
            .any(|bytes| bytes == b"SECRET_CANARY"));
        assert!(captured
            .document
            .snapshot
            .dependencies
            .values()
            .any(|d| matches!(d,Dependency::NotCaptured{reason} if reason.contains("outside"))));
        fs::write(root.join("image.png"), b"changed").unwrap();
        assert!(matches!(captured.recheck(), Err(HistoryError::Conflict)));
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(dir.path().join("secret.png"), root.join("escape.png"))
                .unwrap();
            let body = b"<img src=escape.png>";
            let captured = capture_html(&source, &root, body, 100_000).unwrap();
            assert!(!captured
                .document
                .objects
                .values()
                .any(|bytes| bytes == b"SECRET_CANARY"));
        }
    }
    #[test]
    fn unsupported_css_and_svg_never_claim_complete_capture() {
        let mut parsed = scan();
        scan_css(r"a{background:u\72l(hidden.png)} @font-face{src:local(SystemFont)} b{background:url(/* unsupported */ hidden.png)}", &mut parsed).unwrap();
        assert!(parsed.refs.is_empty());
        assert!(parsed.warnings.iter().any(|w| w.contains("escaped CSS")));
        assert!(parsed.warnings.iter().any(|w| w.contains("system-local")));
        assert!(parsed.warnings.iter().any(|w| w.contains("URL")));
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("a.html");
        let body = b"<img src=image.svg>";
        fs::write(&source, body).unwrap();
        fs::write(
            dir.path().join("image.svg"),
            b"<svg><image href='nested.png'/></svg>",
        )
        .unwrap();
        let captured = capture_html(&source, dir.path(), body, 100_000).unwrap();
        assert!(captured
            .document
            .snapshot
            .dependencies
            .values()
            .any(|d| matches!(d, Dependency::NotCaptured {reason} if reason.contains("SVG"))));
    }
    #[test]
    fn same_resource_alias_does_not_consume_budget_twice() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("a.html");
        let body = b"<img src=image.png><img src='./image.png?x=1'>";
        fs::write(&source, body).unwrap();
        fs::write(dir.path().join("image.png"), b"image").unwrap();
        let captured = capture_html(&source, dir.path(), body, body.len() as u64 + 5).unwrap();
        assert_eq!(captured.document.objects.len(), 2);
        assert_eq!(captured.edges.len(), 2);
    }
}
