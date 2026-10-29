//! Inert history projection. Reads immutable objects only; no live source paths.
use super::{digest, Dependency, HistoryError, Result, Snapshot};
use base64::Engine as _;
use html5ever::{parse_document, tendril::TendrilSink};
use markup5ever_rcdom::{Handle, NodeData, RcDom};
use std::collections::BTreeMap;

pub(super) struct HtmlProjection {
    pub page: String,
    pub source: String,
    pub files: BTreeMap<String, Vec<u8>>,
    pub incomplete: bool,
}
fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
fn rewrite_css(source: &str, replacements: &BTreeMap<String, String>) -> String {
    // Unknown grammar is isolated by CSP as well. Escapes can disguise url() or
    // @import tokens; do not render such styles until a full parser supports it.
    if source.contains('\\') {
        return String::new();
    }
    super::html_capture::project_css(source, replacements)
        .unwrap_or_default()
        .replace('<', "\\3c ")
}
fn render(
    node: &Handle,
    refs: &BTreeMap<String, String>,
    css: &BTreeMap<String, String>,
    out: &mut String,
    depth: usize,
) -> Result<()> {
    if depth > 256 {
        return Err(HistoryError::Invalid("HTML projection depth".into()));
    }
    match &node.data {
        NodeData::Text { contents } => out.push_str(&escape(&contents.borrow())),
        NodeData::Element { name, attrs, .. } => {
            let tag = name.local.as_ref();
            if matches!(
                tag,
                "script"
                    | "title"
                    | "iframe"
                    | "object"
                    | "embed"
                    | "base"
                    | "meta"
                    | "form"
                    | "input"
                    | "button"
                    | "textarea"
                    | "select"
                    | "audio"
                    | "video"
                    | "svg"
                    | "math"
            ) {
                return Ok(());
            }
            let attrs = attrs.borrow();
            let attr = |key: &str| {
                attrs
                    .iter()
                    .find(|a| a.name.local.as_ref() == key)
                    .map(|a| a.value.to_string())
            };
            if tag == "style" {
                let text = node
                    .children
                    .borrow()
                    .iter()
                    .filter_map(|child| match &child.data {
                        NodeData::Text { contents } => Some(contents.borrow().to_string()),
                        _ => None,
                    })
                    .collect::<String>();
                out.push_str("<style>");
                out.push_str(&rewrite_css(&text, refs));
                out.push_str("</style>");
                return Ok(());
            }
            if tag == "link" {
                if attr("rel").is_some_and(|rel| {
                    rel.split_whitespace()
                        .any(|v| v.eq_ignore_ascii_case("stylesheet"))
                }) {
                    if let Some(style) = attr("href").and_then(|href| css.get(&href)) {
                        out.push_str("<style>");
                        out.push_str(style);
                        out.push_str("</style>");
                    }
                }
                return Ok(());
            }
            if matches!(tag, "html" | "head" | "body") {
                // Root attributes are projected once onto the real roots below;
                // changing body into a div breaks body selectors and sizing.
                for child in node.children.borrow().iter() {
                    render(child, refs, css, out, depth + 1)?;
                }
                return Ok(());
            }
            out.push('<');
            out.push_str(if tag == "body" { "div" } else { tag });
            for a in attrs.iter() {
                let key = a.name.local.as_ref();
                if key.starts_with("on")
                    || matches!(
                        key,
                        "srcdoc"
                            | "srcset"
                            | "href"
                            | "action"
                            | "formaction"
                            | "contenteditable"
                            | "autofocus"
                            | "ping"
                            | "is"
                    )
                {
                    continue;
                }
                let value = a.value.to_string();
                let value = if key == "src" {
                    if tag != "img" {
                        continue;
                    }
                    match refs.get(&value) {
                        Some(v) => v.clone(),
                        None => continue,
                    }
                } else if key == "style" {
                    rewrite_css(&value, refs)
                } else {
                    value
                };
                out.push(' ');
                out.push_str(key);
                out.push_str("=\"");
                out.push_str(&escape(&value));
                out.push('"');
            }
            out.push('>');
            for child in node.children.borrow().iter() {
                render(child, refs, css, out, depth + 1)?;
            }
            if !matches!(
                tag,
                "img" | "br" | "hr" | "wbr" | "source" | "area" | "col" | "track" | "param"
            ) {
                out.push_str("</");
                out.push_str(if tag == "body" { "div" } else { tag });
                out.push('>');
            }
        }
        _ => {
            for child in node.children.borrow().iter() {
                render(child, refs, css, out, depth + 1)?;
            }
        }
    }
    Ok(())
}

fn root_attributes(node: &Handle, tag: &str, refs: &BTreeMap<String, String>) -> String {
    if let NodeData::Element { name, attrs, .. } = &node.data {
        if name.local.as_ref() == tag {
            let mut result = String::new();
            for attribute in attrs.borrow().iter() {
                let key = attribute.name.local.as_ref();
                if !matches!(key, "class" | "id" | "style" | "lang" | "dir") && !key.starts_with("data-") { continue; }
                let value = attribute.value.to_string();
                let value = if key == "style" { rewrite_css(&value, refs) } else { value };
                result.push_str(&format!(" {key}=\"{}\"", escape(&value)));
            }
            return result;
        }
    }
    for child in node.children.borrow().iter() {
        let result = root_attributes(child, tag, refs);
        if !result.is_empty() { return result; }
    }
    String::new()
}

pub(super) fn project(
    snapshot: &Snapshot,
    objects: &BTreeMap<String, Vec<u8>>,
    origin: &str,
) -> Result<HtmlProjection> {
    let graph = snapshot
        .html
        .as_ref()
        .ok_or_else(|| HistoryError::Invalid("missing HTML graph".into()))?;
    let read = |hash: &str| -> Result<&[u8]> {
        let bytes = objects
            .get(hash)
            .ok_or_else(|| HistoryError::Invalid("missing projection object".into()))?;
        if digest(bytes) != hash {
            return Err(HistoryError::Invalid("projection object hash".into()));
        }
        Ok(bytes)
    };
    let source = String::from_utf8(read(&snapshot.body)?.to_vec())
        .map_err(|_| HistoryError::Invalid("HTML encoding".into()))?;
    let mut incomplete = snapshot
        .dependencies
        .values()
        .any(|dep| !matches!(dep, Dependency::Captured { .. }));
    let mut inline_font_cost = 0usize;
    let mut names = BTreeMap::new();
    let mut files = BTreeMap::new();
    for (key, dep) in &snapshot.dependencies {
        let Dependency::Captured { object, .. } = dep else {
            continue;
        };
        let bytes = read(object)?;
        let suffix = key.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
        let allowed = match suffix.as_str() {
            "css" => true,
            "woff" | "woff2" | "ttf" | "otf" => true,
            "svg" => crate::core::markdown_cover_assets::validate_safe_svg(
                bytes,
                std::path::Path::new("history.svg"),
            )
            .is_ok(),
            "png" | "jpg" | "jpeg" | "gif" | "webp" => image::guess_format(bytes).is_ok(),
            _ => false,
        };
        if !allowed {
            incomplete = true;
            continue;
        }
        if matches!(suffix.as_str(), "woff" | "woff2" | "ttf" | "otf") {
            // Opaque sandbox frames cannot CORS-fetch fonts from the scoped
            // server. Inline verified objects without loosening server policy.
            // Bound expansion, counting repeated CSS references before encoding.
            let uses = graph.edges.iter().filter(|edge| edge.target == *key).count().max(1);
            let cost = bytes.len().saturating_mul(4).saturating_div(3).saturating_add(128).saturating_mul(uses);
            if inline_font_cost.saturating_add(cost) > 16_000_000 { return Err(HistoryError::Invalid("archived fonts exceed static preview budget".into())); }
            inline_font_cost += cost;
            names.insert(key.clone(), format!("data:font/{suffix};base64,{}",base64::engine::general_purpose::STANDARD.encode(bytes)));
            continue;
        }
        // Each projection owns its directory; reference slots preserve CSS base contexts
        // without repeating two hashes in Windows filesystem paths.
        let filename = format!("r{}.{suffix}", names.len());
        names.insert(key.clone(), format!("{origin}/{filename}"));
        files.insert(filename, bytes.to_vec());
    }
    let refs_for = |source: &str| {
        graph
            .edges
            .iter()
            .filter(|edge| edge.source == source)
            .filter_map(|edge| {
                names
                    .get(&edge.target)
                    .map(|name| (edge.reference.clone(), name.clone()))
            })
            .collect::<BTreeMap<_, _>>()
    };
    let mut styles = BTreeMap::new();
    for (key, name) in &names {
        if !key.to_ascii_lowercase().ends_with(".css") {
            continue;
        }
        let Dependency::Captured { object, .. } = &snapshot.dependencies[key] else {
            continue;
        };
        let text = std::str::from_utf8(read(object)?)
            .map_err(|_| HistoryError::Invalid("CSS encoding".into()))?;
        let text = rewrite_css(text, &refs_for(key));
        let filename = name.strip_prefix(&format!("{origin}/")).unwrap();
        files.insert(filename.to_string(), text.as_bytes().to_vec());
        for edge in graph
            .edges
            .iter()
            .filter(|edge| edge.source == graph.document_path && edge.target == *key)
        {
            styles.insert(edge.reference.clone(), text.clone());
        }
    }
    let dom: RcDom = parse_document(RcDom::default(), Default::default()).one(source.as_str());
    fn root(node: &Handle, tag: &str) -> Option<Handle> {
        if matches!(&node.data, NodeData::Element { name, .. } if name.local.as_ref() == tag) { return Some(node.clone()); }
        node.children.borrow().iter().find_map(|child| root(child, tag))
    }
    let clean_root = |tag: &str| -> Result<String> {
        let mut rendered = String::new();
        if let Some(node) = root(&dom.document, tag) {
            render(&node, &refs_for(&graph.document_path), &styles, &mut rendered, 0)?;
        }
        Ok(ammonia::Builder::default()
            .add_tags(["style", "section", "main"])
            .rm_clean_content_tags(["style"])
            .add_generic_attributes(["class", "id", "style"])
            .generic_attribute_prefixes(std::collections::HashSet::from(["data-"]))
            .add_tag_attributes("img", ["width", "height"])
            .clean(&rendered).to_string())
    };
    let clean_head = clean_root("head")?;
    let clean = clean_root("body")?;
    let html_attrs = root_attributes(&dom.document, "html", &refs_for(&graph.document_path));
    let body_attrs = root_attributes(&dom.document, "body", &refs_for(&graph.document_path));
    // Reading inset belongs to the trusted frame host, not the author's body.
    let page = format!("<!doctype html><html{html_attrs}><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'none'; connect-src 'none'; img-src {origin}; font-src data:; style-src 'unsafe-inline' {origin}; base-uri 'none'; form-action 'none'; object-src 'none'\">{clean_head}</head><body{body_attrs}>{clean}</body></html>");
    Ok(HtmlProjection {
        page,
        source,
        files,
        incomplete,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    #[test]
    fn fixed_canvas_history_preview_preserves_authored_geometry() {
        let temporary = tempfile::tempdir().unwrap();
        let external = std::env::var("NUTBOOK_FIXED_CANVAS_SOURCE").ok().map(std::path::PathBuf::from);
        let path = external.clone().unwrap_or_else(||temporary.path().join("fixed.html"));
        if external.is_none() { fs::write(&path, r#"<!doctype html><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}#deck{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform:translate(-50%,-50%) scale(var(--deck-scale,1))}.slide{position:absolute;inset:0;display:none}.slide.active{display:block}</style><main id="deck"><section class="slide active" data-nutbook-page-id="one"><h1>One</h1></section><section class="slide" data-nutbook-page-id="two"><h1>Two</h1></section></main>"#).unwrap(); }
        let source=fs::read_to_string(&path).unwrap();
        let capture=super::super::capture_html(&path,path.parent().unwrap(),source.as_bytes(),50_000_000).unwrap();
        let projection=project(&capture.document.snapshot,&capture.document.objects,"http://127.0.0.1:18439").unwrap();
        assert!(projection.page.contains("1920px"));
        if let Ok(script)=std::env::var("NUTBOOK_FIXED_CANVAS_BROWSER_SCRIPT") {
            let input=temporary.path().join("projection.json");
            fs::write(&input,serde_json::to_vec(&serde_json::json!({"html":projection.page,"source":source,"files":projection.files})).unwrap()).unwrap();
            assert!(std::process::Command::new("node").current_dir(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap()).arg(script).arg(input).status().unwrap().success());
        }
    }
    #[test]
    fn ordinary_html_keeps_author_body_geometry_inside_fitted_preview() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap()
            .join("tests/fixtures/document-save-versions");
        let path = root.join("ordinary.html");
        let source = fs::read_to_string(&path).unwrap().replace("<body>", "<body class=\"report\" data-layout=\"reading\" style=\"border:0\">");
        let source = source.replace("</head>", "<style>body.report > h1:first-child { border-left: 3px solid red; }</style></head>")
            .replace("</body>", "<div id=\"history-tail\" style=\"margin-top:1800px\">FULL TEXT END</div></body>");
        let capture = super::super::capture_html(&path, &root, source.as_bytes(), 2_000_000).unwrap();
        let projection = project(&capture.document.snapshot,&capture.document.objects,"http://127.0.0.1:18439").unwrap();
        assert!(projection.page.contains("<body class=\"report\" data-layout=\"reading\" style=\"border:0\">"));
        assert!(!projection.page.contains("max-width:100%!important"));
        if let Ok(script) = std::env::var("NUTBOOK_HTML_BODY_PREVIEW_BROWSER_SCRIPT") {
            let raw_files = capture.document.snapshot.dependencies.iter().filter_map(|(path,dep)| {
                if let Dependency::Captured{object,..}=dep {Some((path.clone(),capture.document.objects[object].clone()))}else{None}
            }).collect::<BTreeMap<_,_>>();
            let input=std::env::temp_dir().join(format!("nutbook-body-projection-{}.json",uuid::Uuid::new_v4()));
            fs::write(&input,serde_json::to_vec(&serde_json::json!({"html":projection.page,"source":source,"files":projection.files,"rawFiles":raw_files})).unwrap()).unwrap();
            let status=std::process::Command::new("node").arg(script).arg(&input).status().unwrap();
            let _=fs::remove_file(input);assert!(status.success());
        }
    }
    #[test]
    fn presentation_layout_containers_survive_static_sanitization() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent().unwrap().join("tests/fixtures/document-save-versions/native-presentation");
        let path = root.join("index.html");
        let body = fs::read(&path).unwrap();
        let capture = super::super::capture_html(&path, &root, &body, 2_000_000).unwrap();
        let projection = project(&capture.document.snapshot, &capture.document.objects, "http://127.0.0.1:18439").unwrap();
        assert!(projection.page.contains("<section class=\"page active\""));
        assert!(!projection.page.contains("NUTBOOK 原生演示验收样本"), "head title must not leak into visible content");
        assert!(!projection.page.contains("<script"));
        if let Ok(script) = std::env::var("NUTBOOK_HTML_PRESENTATION_PREVIEW_BROWSER_SCRIPT") {
            let input = std::env::temp_dir().join(format!("nutbook-presentation-projection-{}.json", uuid::Uuid::new_v4()));
            fs::write(&input, serde_json::to_vec(&serde_json::json!({"html":projection.page,"files":projection.files})).unwrap()).unwrap();
            let status = std::process::Command::new("node").arg(script).arg(&input).status().unwrap();
            let _ = fs::remove_file(input);
            assert!(status.success());
        }
    }
    #[test]
    fn captured_css_images_and_fonts_are_relocated_without_executable_content() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("tests/fixtures/document-save-versions");
        let path = root.join("ordinary.html");
        let body = fs::read(&path).unwrap();
        let capture = super::super::capture_html(&path, &root, &body, 2_000_000).unwrap();
        let origin = "http://127.0.0.1:18439";
        let projection = project(
            &capture.document.snapshot,
            &capture.document.objects,
            origin,
        )
        .unwrap();
        assert_eq!(projection.source.as_bytes(), body);
        assert!(projection.page.contains("HTML 版本验收 A"));
        assert!(projection.page.contains("<style>"));
        assert!(projection.page.contains("script-src 'none'"));
        assert!(!projection.page.contains("<script"));
        assert!(!projection.page.contains("shared/image.svg"));
        assert!(projection.files.values().any(|bytes| std::str::from_utf8(bytes).is_ok_and(|css| css.contains("data:font/ttf;base64,"))));
        assert!(projection.files.keys().any(|name| name.ends_with(".svg")));
        assert!(!projection.files.keys().any(|name| name.ends_with(".js")));
        for (name, bytes) in &projection.files {
            if name.ends_with(".css") {
                let css = std::str::from_utf8(bytes).unwrap();
                assert!(!css.contains("../"));
                assert!(css.contains(origin));
            }
        }
    }
    #[test]
    fn active_content_remote_urls_and_live_missing_files_are_excluded() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.html");
        let body = br#"<meta http-equiv=refresh content="0;url=https://evil.invalid"><base href="https://evil.invalid"><script>alert(1)</script><form><input autofocus></form><iframe srcdoc="bad"></iframe><img src="missing.png" onerror="alert(1)"><a href="https://evil.invalid" ping="https://evil.invalid">hello</a><style>a{background:url(https://evil.invalid/image.png)} a::after{content:'url(fake.png)'}</style>"#;
        fs::write(&path, body).unwrap();
        let capture = super::super::capture_html(&path, dir.path(), body, 100_000).unwrap();
        fs::write(dir.path().join("missing.png"), b"LIVE_CANARY").unwrap();
        let projection = project(
            &capture.document.snapshot,
            &capture.document.objects,
            "http://127.0.0.1:18439",
        )
        .unwrap();
        assert!(!projection.page.contains("evil.invalid"));
        assert!(!projection.page.contains("onerror"));
        assert!(!projection.page.contains("<script"));
        assert!(!projection.page.contains("<iframe"));
        assert!(!projection.page.contains("<form"));
        assert!(!projection.page.contains("LIVE_CANARY"));
        assert!(projection.page.contains("url(fake.png)"));
        assert!(projection.files.is_empty());
    }
    #[test]
    fn identical_css_at_different_paths_keeps_distinct_relative_bindings() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("one")).unwrap();
        fs::create_dir(dir.path().join("two")).unwrap();
        for name in ["one", "two"] {
            fs::write(
                dir.path().join(name).join("style.css"),
                b"a{background:url(image.svg)}",
            )
            .unwrap();
            let color = if name == "one" { "red" } else { "blue" };
            fs::write(dir.path().join(name).join("image.svg"), format!("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1\" height=\"1\"><rect width=\"1\" height=\"1\" fill=\"{color}\"/></svg>")).unwrap();
        }
        let path = dir.path().join("a.html");
        let body =
            b"<link rel=stylesheet href=one/style.css><link rel=stylesheet href=two/style.css>";
        fs::write(&path, body).unwrap();
        let capture = super::super::capture_html(&path, dir.path(), body, 100_000).unwrap();
        let projection = project(
            &capture.document.snapshot,
            &capture.document.objects,
            "http://127.0.0.1:18439",
        )
        .unwrap();
        let css = projection
            .files
            .iter()
            .filter(|(name, _)| name.ends_with(".css"))
            .collect::<Vec<_>>();
        assert_eq!(css.len(), 2);
        assert_ne!(css[0].1, css[1].1);
    }
}
