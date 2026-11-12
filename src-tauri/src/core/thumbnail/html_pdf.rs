use super::{
    presentation_static_setup_script, static_capture_init_script, static_capture_url, CdpPipe,
};
use crate::core::scoped_content_server::ScopedContentServer;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde_json::{json, Value};
use std::{
    io::Write,
    path::Path,
    sync::{atomic::AtomicBool, Arc},
};

#[path = "html_pptx.rs"]
mod pptx;

const VIEWPORT_WIDTH: u64 = 1920;
const VIEWPORT_HEIGHT: u64 = 1080;
const MAX_SNAPSHOT_BYTES: usize = 32 * 1024 * 1024;
const MAX_PDF_BYTES: usize = 128 * 1024 * 1024;

struct Chrome(CdpPipe);

impl Drop for Chrome {
    fn drop(&mut self) {
        self.0.close();
    }
}

fn navigate(pipe: &mut CdpPipe, session: &str, url: &str) -> Result<(), String> {
    let result = pipe.call("Page.navigate", json!({ "url": url }), Some(session))?;
    if let Some(error) = result.get("errorText").and_then(Value::as_str) {
        return Err(error.to_owned());
    }
    let expected = serde_json::to_string(url).map_err(|error| error.to_string())?;
    let ready = format!("location.href === {expected} && document.readyState === 'complete'");
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(12);
    loop {
        match evaluate(pipe, session, &ready) {
            Ok(Value::Bool(true)) => return Ok(()),
            Ok(_) => {}
            Err(error) if error.contains("context was destroyed") => {}
            Err(error) => return Err(error),
        }
        if std::time::Instant::now() >= deadline {
            return Err("Timed out loading the print page".into());
        }
        std::thread::sleep(std::time::Duration::from_millis(20));
    }
}

fn evaluate(pipe: &mut CdpPipe, session: &str, expression: &str) -> Result<Value, String> {
    let result = pipe.call(
        "Runtime.evaluate",
        json!({
            "expression": expression, "returnByValue": true, "awaitPromise": true,
        }),
        Some(session),
    )?;
    if let Some(error) = result.get("exceptionDetails") {
        let reason = error
            .pointer("/exception/description")
            .and_then(Value::as_str)
            .and_then(|description| description.lines().next())
            .unwrap_or("The presentation script failed");
        return Err(reason.to_owned());
    }
    Ok(result
        .pointer("/result/value")
        .cloned()
        .unwrap_or(Value::Null))
}

fn viewport(
    pipe: &mut CdpPipe,
    session: &str,
    width: u64,
    height: u64,
    scale: u64,
) -> Result<(), String> {
    pipe.call(
        "Emulation.setDeviceMetricsOverride",
        json!({
            "width": width, "height": height, "deviceScaleFactor": scale, "mobile": false
        }),
        Some(session),
    )?;
    Ok(())
}

#[derive(Clone, Copy, Debug, serde::Deserialize, serde::Serialize)]
struct PageBounds {
    x: i64,
    y: i64,
    width: u64,
    height: u64,
}

struct Deck {
    browser: Chrome,
    _server: ScopedContentServer,
    _profile: tempfile::TempDir,
    url: String,
    session: String,
    hook: Value,
    pages: Vec<String>,
    viewport_width: u64,
    viewport_height: u64,
    x: i64,
    y: i64,
    width: u64,
    height: u64,
}

impl Deck {
    fn open(chrome_path: &Path, source: &Path, cancelled: Arc<AtomicBool>) -> Result<Self, String> {
        let server = ScopedContentServer::start_for_capture(
            source.parent().ok_or("Missing source directory")?,
        )
        .map_err(|error| error.to_string())?;
        let url = server
            .relative_url(Path::new(
                source.file_name().ok_or("Missing source filename")?,
            ))
            .ok_or("Invalid source URL")?;
        let profile = tempfile::tempdir().map_err(|error| error.to_string())?;
        let mut browser = Chrome(CdpPipe::launch(chrome_path, profile.path())?);
        let pipe = &mut browser.0;
        pipe.enable_export(cancelled)?;
        let target = pipe.call("Target.createTarget", json!({ "url": "about:blank" }), None)?;
        let attached = pipe.call(
            "Target.attachToTarget",
            json!({
                "targetId": target["targetId"], "flatten": true
            }),
            None,
        )?;
        let session = attached["sessionId"]
            .as_str()
            .ok_or("Chrome session unavailable")?;
        pipe.call("Page.enable", json!({}), Some(session))?;
        viewport(pipe, session, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, 1)?;
        let hook = pipe.call(
            "Page.addScriptToEvaluateOnNewDocument",
            json!({
                "source": static_capture_init_script()
            }),
            Some(session),
        )?;
        navigate(pipe, session, &static_capture_url(&url))?;
        let value = evaluate(pipe, session, include_str!("html_pdf_prepare.js"))?;
        let pages = serde_json::from_value(value).map_err(|_| "Invalid page list")?;
        let session = session.to_owned();
        Ok(Self {
            browser,
            _server: server,
            _profile: profile,
            url,
            session,
            hook,
            pages,
            viewport_width: VIEWPORT_WIDTH,
            viewport_height: VIEWPORT_HEIGHT,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        })
    }

    fn set_viewport(&mut self, width: u64, height: u64) -> Result<(), String> {
        viewport(&mut self.browser.0, &self.session, width, height, 1)?;
        self.viewport_width = width;
        self.viewport_height = height;
        Ok(())
    }

    fn prepare(&mut self, index: usize, scale: u64) -> Result<(), String> {
        let pipe = &mut self.browser.0;
        let session = self.session.as_str();
        let page = &self.pages[index];

        let measure = |pipe: &mut CdpPipe| -> Result<PageBounds, String> {
            let value = evaluate(
                pipe,
                session,
                &format!(
                    "({})({})",
                    include_str!("html_export_bounds.js"),
                    json!(page),
                ),
            )?;
            serde_json::from_value(value).map_err(|_| format!("Slide bounds unavailable: {page}"))
        };

        if index == 0 && scale != 1 {
            viewport(
                pipe,
                session,
                self.viewport_width,
                self.viewport_height,
                scale,
            )?;
        }
        let prepare = presentation_static_setup_script(page, true);
        if evaluate(pipe, session, &prepare)? != Value::Bool(true) {
            return Err("Static page preparation failed".into());
        }
        let mut bounds = measure(pipe)?;
        if index == 0 {
            if !(64..=4096).contains(&bounds.width) || !(64..=4096).contains(&bounds.height) {
                return Err(format!("Unsupported slide dimensions: {page}"));
            }
            if bounds.width > self.viewport_width || bounds.height > self.viewport_height {
                self.viewport_width = self.viewport_width.max(bounds.width);
                self.viewport_height = self.viewport_height.max(bounds.height);
                viewport(
                    pipe,
                    session,
                    self.viewport_width,
                    self.viewport_height,
                    scale,
                )?;
                bounds = measure(pipe)?;
            }
            self.width = bounds.width;
            self.height = bounds.height;
        }
        if bounds.width != self.width
            || bounds.height != self.height
            || bounds.x < 0
            || bounds.y < 0
            || bounds.x as u64 + bounds.width > self.viewport_width
            || bounds.y as u64 + bounds.height > self.viewport_height
        {
            return Err(format!("Page does not fit the common slide canvas: {page}"));
        }
        self.x = bounds.x;
        self.y = bounds.y;
        Ok(())
    }

    fn eval(&mut self, expression: &str) -> Result<Value, String> {
        evaluate(&mut self.browser.0, &self.session, expression)
    }

    fn screenshot(&mut self, clip: Value) -> Result<Vec<u8>, String> {
        let result = self.browser.0.call(
            "Page.captureScreenshot",
            json!({"format": "png", "fromSurface": true, "clip": clip}),
            Some(&self.session),
        )?;
        BASE64
            .decode(result["data"].as_str().ok_or("Slide image unavailable")?)
            .map_err(|error| error.to_string())
    }

    fn slide_image(&mut self) -> Result<Vec<u8>, String> {
        self.scaled_slide_image(1.0)
    }

    fn scaled_slide_image(&mut self, scale: f64) -> Result<Vec<u8>, String> {
        self.screenshot(json!({
            "x": self.x, "y": self.y, "width": self.width, "height": self.height, "scale": scale
        }))
    }
}

pub struct Inspection {
    pub pages: usize,
    pub width: u64,
    pub height: u64,
    pub preview: SlidePreview,
}

pub struct SlidePreview {
    pub page: usize,
    pub image: String,
}

pub fn inspect(chrome: &Path, source: &Path, page: usize) -> Result<Inspection, String> {
    let mut deck = Deck::open(chrome, source, Arc::new(AtomicBool::new(false)))?;
    let pages = deck.pages.len();
    if !(1..=pages).contains(&page) {
        return Err("Preview page is out of range".into());
    }
    deck.prepare(0, 1)?;
    if page != 1 {
        deck.prepare(page - 1, 1)?;
    }
    let scale = (640.0 / deck.width.max(deck.height) as f64).min(1.0);
    let image = deck.scaled_slide_image(scale)?;
    Ok(Inspection {
        pages,
        width: deck.width,
        height: deck.height,
        preview: SlidePreview {
            page,
            image: format!("data:image/png;base64,{}", BASE64.encode(image)),
        },
    })
}

fn slides_per_png(width: u64, height: u64, scale: u64) -> usize {
    let width = width * scale;
    let height = height * scale;
    ((15_000 / height).min(40_000_000 / (width * height))).max(1) as usize
}

pub fn png_parts(info: &Inspection, scale: u64) -> usize {
    info.pages
        .div_ceil(slides_per_png(info.width, info.height, scale))
}

pub fn render_png(
    chrome: &Path,
    source: &Path,
    cancelled: Arc<AtomicBool>,
    scale: u64,
    expected_parts: usize,
    mut output: impl FnMut(usize) -> Result<std::fs::File, String>,
    progress: impl Fn(usize, usize),
) -> Result<(), String> {
    let mut deck = Deck::open(chrome, source, cancelled)?;
    deck.prepare(0, scale)?;
    let per_part = slides_per_png(deck.width, deck.height, scale);
    let (width, height) = ((deck.width * scale) as u32, (deck.height * scale) as u32);
    if deck.pages.len().div_ceil(per_part) != expected_parts {
        return Err("The number of PNG parts changed. Reopen the export center.".into());
    }
    if u64::from(width) * u64::from(height) > 40_000_000 {
        return Err("The slide is too large at this scale".into());
    }
    for (part, start) in (0..deck.pages.len()).step_by(per_part).enumerate() {
        let end = (start + per_part).min(deck.pages.len());
        let file = output(part)?;
        let mut encoder = png::Encoder::new(&file, width, height * (end - start) as u32);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().map_err(|error| error.to_string())?;
        let mut rows = writer.stream_writer().map_err(|error| error.to_string())?;
        for index in start..end {
            progress(index, deck.pages.len());
            if index != 0 {
                deck.prepare(index, scale)?;
            }
            let rgba =
                image::load_from_memory_with_format(&deck.slide_image()?, image::ImageFormat::Png)
                    .map_err(|error| error.to_string())?
                    .into_rgba8();
            if rgba.dimensions() != (width, height) {
                return Err("Chrome returned unexpected slide dimensions".into());
            }
            rows.write_all(rgba.as_raw())
                .map_err(|error| error.to_string())?;
        }
        rows.finish().map_err(|error| error.to_string())?;
        writer.finish().map_err(|error| error.to_string())?;
        file.sync_all().map_err(|error| error.to_string())?;
    }
    progress(deck.pages.len(), deck.pages.len());
    Ok(())
}

pub use pptx::render_pptx;

pub fn render(
    chrome_path: &Path,
    source: &Path,
    cancelled: Arc<AtomicBool>,
    output: &mut impl Write,
    progress: impl Fn(usize, usize),
) -> Result<usize, String> {
    let mut deck = Deck::open(chrome_path, source, cancelled)?;
    let mut bytes = 0;
    let mut snapshots = Vec::with_capacity(deck.pages.len());
    for index in 0..deck.pages.len() {
        progress(index, deck.pages.len());
        deck.prepare(index, 1)?;
        let id = json!(deck.pages[index]);
        let snapshot = evaluate(
            &mut deck.browser.0,
            &deck.session,
            &format!("({})({id})", include_str!("html_pdf_snapshot.js")),
        )?;
        let html = snapshot.as_str().ok_or("Page snapshot unavailable")?;
        bytes += html.len();
        if bytes > MAX_SNAPSHOT_BYTES {
            return Err("The presentation exceeds the PDF snapshot size limit".into());
        }
        snapshots.push((html.to_owned(), deck.x, deck.y));
    }

    let Deck {
        browser,
        url,
        session,
        hook,
        pages,
        viewport_width,
        viewport_height,
        width,
        height,
        ..
    } = &mut deck;
    let pipe = &mut browser.0;
    let session = session.as_str();
    progress(pages.len(), pages.len());
    pipe.call(
        "Page.removeScriptToEvaluateOnNewDocument",
        json!({
            "identifier": hook["identifier"]
        }),
        Some(session),
    )?;
    navigate(pipe, session, &format!("{url}?nutbook-capture=pdf-print"))?;
    evaluate(
        pipe,
        session,
        &format!(
            "({})({width}, {height})",
            include_str!("html_pdf_document.js")
        ),
    )?;
    for (page, (html, x, y)) in pages.iter().zip(snapshots) {
        evaluate(
            pipe,
            session,
            &format!(
                "window.appendPrintPage({}, {}, {width}, {height}, {viewport_width}, {viewport_height}, {x}, {y})",
                json!(page),
                json!(html)
            ),
        )?;
    }

    let result = pipe.call(
        "Page.printToPDF",
        json!({
            "printBackground": true, "preferCSSPageSize": true, "displayHeaderFooter": false,
            "marginTop": 0, "marginBottom": 0, "marginLeft": 0, "marginRight": 0,
            "transferMode": "ReturnAsStream"
        }),
        Some(session),
    )?;
    let handle = result["stream"]
        .as_str()
        .ok_or("Chrome did not return a PDF stream")?;
    let mut written = 0;
    let mut tail = Vec::new();
    loop {
        let chunk = pipe.call(
            "IO.read",
            json!({ "handle": handle, "size": 1024 * 1024 }),
            Some(session),
        )?;
        let data = chunk["data"].as_str().ok_or("PDF stream is incomplete")?;
        let data = if chunk["base64Encoded"] == true {
            BASE64.decode(data).map_err(|error| error.to_string())?
        } else {
            data.as_bytes().to_vec()
        };
        if written == 0 && !data.starts_with(b"%PDF-") {
            return Err("Chrome did not generate a PDF".into());
        }
        written += data.len();
        if written > MAX_PDF_BYTES {
            return Err("The PDF exceeds the output size limit".into());
        }
        output.write_all(&data).map_err(|error| error.to_string())?;
        tail.extend_from_slice(&data[data.len().saturating_sub(1024)..]);
        if tail.len() > 1024 {
            tail.drain(..tail.len() - 1024);
        }
        if chunk["eof"] == true {
            break;
        }
        if data.is_empty() {
            return Err("The PDF stream ended early".into());
        }
    }
    pipe.call("IO.close", json!({ "handle": handle }), Some(session))?;
    if !tail.windows(5).any(|bytes| bytes == b"%%EOF") {
        return Err("Chrome generated an incomplete PDF".into());
    }
    Ok(pages.len())
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;

    #[test]
    #[ignore = "requires system Chrome and permission to bind a local capture port"]
    fn motion_gallery_export_excludes_runtime_control_from_preview_pixels() {
        let chrome = super::super::find_system_chromium_executable().expect("system Chrome");
        let source = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../docs/presentations/motion-gallery/P1-验收.html")
            .canonicalize()
            .unwrap();
        let mut deck = Deck::open(&chrome, &source, Arc::new(AtomicBool::new(false))).unwrap();
        let selector = "nav[data-nutbook-runtime-control]";
        let computed = format!(
            "getComputedStyle(document.querySelector({})).display",
            json!(selector)
        );
        assert_eq!(deck.eval(&computed).unwrap(), "none");
        deck.prepare(0, 1).unwrap();
        assert_eq!(deck.eval(&computed).unwrap(), "none");
        let clean = image::load_from_memory(&deck.slide_image().unwrap())
            .unwrap()
            .into_rgba8();
        deck.eval(&format!(
            "document.querySelector({}).style.setProperty('display', 'block', 'important')",
            json!(selector),
        ))
        .unwrap();
        let with_control = image::load_from_memory(&deck.slide_image().unwrap())
            .unwrap()
            .into_rgba8();
        assert!(clean
            .enumerate_pixels()
            .any(|(x, y, pixel)| { x < 300 && y < 80 && pixel != with_control.get_pixel(x, y) }));
        assert!(
            clean
                .enumerate_pixels()
                .any(|(x, y, pixel)| { x > 300 && y > 80 && pixel != clean.get_pixel(0, 0) }),
            "slide content is present in the still frame"
        );
    }

    #[test]
    #[ignore = "requires system Chrome and permission to bind a local capture port"]
    fn exports_centered_responsive_slides_inside_a_bordered_frame() {
        let chrome = super::super::find_system_chromium_executable().expect("system Chrome");
        let fixtures = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../docs/presentations/native-presentation-sample");
        let input = tempfile::tempdir().unwrap();
        let source = input.path().join("slides.html");
        std::fs::copy(
            fixtures.join("nutbook-mark.svg"),
            input.path().join("nutbook-mark.svg"),
        )
        .unwrap();
        let template = std::fs::read_to_string(fixtures.join("index.html")).unwrap();
        let document = template.replace("</head>", r#"
            <style>
            .shell { display: grid; place-items: center; width: 100vw; height: 100vh; background: magenta; }
            .frame { position: relative; width: min(100vw, calc(100vh * 4 / 3)); aspect-ratio: 4 / 3;
                     box-sizing: border-box; border: 1px solid magenta; overflow: hidden; }
            .frame .page { position: absolute; inset: 0; width: auto; height: auto; background: #111a2d; }
            </style></head>"#)
            .replacen("</section>", r#"<p style="position:absolute;top:0;left:40px">Plain paragraph <code data-editable="text">inline-code</code> trailing text</p>
                <div style="position:absolute; bottom:0; inset-inline:40px; display:flex; justify-content:space-between"><span>Left label</span><span>Right label</span></div>
                <div style="position:absolute;right:40px;top:40px;height:34px;overflow:auto"><table>
                  <tr><td rowspan="2" colspan="2">Merged cell</td><td>One</td></tr>
                  <tr><td>Two</td></tr>
                  <tr><td>A</td><td>B</td><td>C</td></tr>
                </table></div><article style="position:absolute;right:40px;bottom:80px;padding:10px;background:#ddeeff;border:1px solid #114488;border-radius:8px"><h3>Group title</h3><p>Group details</p></article></section>"#, 1)
            .replace("<body>", r#"<body><main class="shell"><div class="frame">"#)
            .replace(r#"  <div class="hint">"#, r#"</div></main><div class="hint">"#);
        let charts = ["bar", "line", "pie"].into_iter().enumerate().map(|(index, kind)| {
            let data = json!({"kind":kind,"title":"季度样稿","categories":["第一季","第二季"],"series":[{"name":"本年","values":[12,18]}]});
            let left = 20 + index * 200;
            format!("<figure style='position:absolute;left:{left}px;top:130px;width:180px;height:100px;margin:0' data-nutbook-chart='{data}'>Chart fallback</figure>")
        }).collect::<String>();
        let document = document.replacen("</section>", &format!("{charts}</section>"), 1);
        std::fs::write(&source, document).unwrap();

        let info = inspect(&chrome, &source, 3).unwrap();
        assert_eq!((info.pages, info.width, info.height), (3, 1438, 1078));
        let output = tempfile::tempdir().unwrap();
        let path = output.path().join("slides.png");
        render_png(
            &chrome,
            &source,
            Arc::default(),
            1,
            1,
            |_| std::fs::File::create(&path).map_err(|err| err.to_string()),
            |_, _| {},
        )
        .unwrap();
        let png = image::open(path).unwrap().into_rgb8();
        assert_eq!(png.dimensions(), (1438, 3234));
        assert_eq!(png.get_pixel(0, 0).0, [17, 26, 45]);

        let mut pdf = Vec::new();
        assert_eq!(
            render(&chrome, &source, Arc::default(), &mut pdf, |_, _| {}).unwrap(),
            3
        );
        assert!(pdf.starts_with(b"%PDF-"));
        let pptx = output.path().join("slides.pptx");
        let mut file = std::fs::File::create(&pptx).unwrap();
        render_pptx(
            &chrome,
            &source,
            Arc::default(),
            Some([1152, 648]),
            &mut file,
            |_, _| {},
        )
        .unwrap();
        let xml = std::process::Command::new("/usr/bin/unzip")
            .arg("-p")
            .arg(&pptx)
            .arg("ppt/slides/slide1.xml")
            .output()
            .unwrap();
        assert!(xml.status.success());
        let slide = String::from_utf8(xml.stdout).unwrap();
        assert!(slide.split("<p:sp>").any(|shape| {
            let text: String = shape
                .split(r#"<a:t xml:space="preserve">"#)
                .skip(1)
                .filter_map(|run| run.split_once("</a:t>").map(|(text, _)| text))
                .collect();
            text == "一个文件，一场演示"
        }));
        let paragraph = slide
            .split("<p:sp>")
            .find(|shape| shape.contains("Plain paragraph"))
            .unwrap();
        assert!(paragraph.contains("inline-code") && paragraph.contains("trailing text"));
        assert_eq!(slide.matches("inline-code").count(), 1);
        assert!(slide.contains(">Left label</a:t>") && slide.contains(">Right label</a:t>"));
        assert!(!slide.contains("Left labelRight label"));
        assert!(slide.contains(r#"<a:tc rowSpan="2" gridSpan="2">"#));
        assert!(slide.contains(r#"<a:tc hMerge="1" vMerge="1">"#));
        assert_eq!(slide.matches(">Merged cell</a:t>").count(), 1);
        assert_eq!(slide.matches("<c:chart ").count(), 3);
        assert!(!slide.contains("Chart fallback"));
        for (index, kind) in ["barChart", "lineChart", "pieChart"]
            .into_iter()
            .enumerate()
        {
            let chart = std::process::Command::new("/usr/bin/unzip")
                .arg("-p")
                .arg(&pptx)
                .arg(format!("ppt/charts/chart-1-{}.xml", index + 1))
                .output()
                .unwrap();
            assert!(chart.status.success());
            let chart = String::from_utf8(chart.stdout).unwrap();
            assert!(chart.contains(&format!("<c:{kind}>")) && chart.contains("<c:externalData"));
            let book = std::process::Command::new("/usr/bin/unzip")
                .arg("-p")
                .arg(&pptx)
                .arg(format!("ppt/embeddings/chart-1-{}.xlsx", index + 1))
                .output()
                .unwrap();
            assert!(book.status.success() && book.stdout.starts_with(b"PK"));
        }
        assert!(slide.contains(r#"cy="480891""#));
        let card = slide
            .split("<p:grpSp>")
            .nth(1)
            .and_then(|group| group.split_once("</p:grpSp>"))
            .unwrap()
            .0;
        assert!(card.contains(">Group title</a:t>") && card.contains(">Group details</a:t>"));
        assert!(card.contains(r#"name="Card background""#) && card.contains(r#"prst="roundRect""#));
        let presentation = std::process::Command::new("/usr/bin/unzip")
            .arg("-p")
            .arg(pptx)
            .arg("ppt/presentation.xml")
            .output()
            .unwrap();
        assert!(presentation.status.success());
        // 4:3 at the 1152 x 648 reading viewport yields an 862 x 646 slide.
        assert!(String::from_utf8(presentation.stdout)
            .unwrap()
            .contains(r#"<p:sldSz cx="12192000" cy="9136928""#));
    }

    #[test]
    #[ignore = "requires system Chrome and permission to bind a local capture port"]
    fn markdown_presentation_round_trip_exports_native_text() {
        use crate::core::markdown_export::{
            fallback_presentation_light_template, render_presentation_html,
            MarkdownHtmlExportInput, PresentationDensity, PresentationHtmlExportPreferences,
        };

        let directory = tempfile::tempdir().unwrap();
        let generated = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Round trip title".into(),
                source_file: "sample.md".into(),
                source_path: directory.path().join("sample.md"),
                markdown: "# Round trip title\n\n## Project status\n\nBefore `sample/path` and **after the code**.\n\n| Column | Value |\n|---|---|\n| Sample row | Pending |\n\n## Checklist\n\n- First editable card\n- Second editable card\n- Third editable card".into(),
                generated_at: String::new(),
                template_html: fallback_presentation_light_template().into(),
                preferences: Default::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".into(),
                density: PresentationDensity::Balanced,
                output_kind: "motion-editable".into(),
            },
        ).unwrap();
        let source = directory.path().join("slides.html");
        std::fs::write(&source, generated.html).unwrap();
        let chrome = super::super::find_system_chromium_executable().expect("system Chrome");
        let output = directory.path().join("slides.pptx");
        let mut file = std::fs::File::create(&output).unwrap();
        render_pptx(
            &chrome,
            &source,
            Arc::default(),
            Some([1152, 648]),
            &mut file,
            |_, _| {},
        )
        .unwrap();
        let xml = std::process::Command::new("/usr/bin/unzip")
            .arg("-p")
            .arg(&output)
            .arg("ppt/slides/slide*.xml")
            .output()
            .unwrap();
        assert!(xml.status.success());
        let xml = String::from_utf8(xml.stdout).unwrap();
        let inline = xml
            .split("<a:r>")
            .find(|run| run.contains(">sample/path</a:t>"))
            .unwrap();
        assert!(inline.contains(r#"<a:highlight><a:srgbClr val="eeeeef"/>"#));
        let card = xml
            .split("<p:sp>")
            .find(|shape| shape.contains(">First editable card</a:t>"))
            .unwrap();
        assert!(card.contains(r#"prst="roundRect""#) && card.contains("<a:solidFill>"));
        let table = xml
            .split("<a:tbl>")
            .nth(1)
            .and_then(|table| table.split_once("</a:tbl>"))
            .unwrap()
            .0;
        assert_eq!(table.matches("<a:gridCol ").count(), 2);
        assert_eq!(table.matches("<a:tr ").count(), 2);
        assert_eq!(table.matches("<a:tc>").count(), 4);
        assert!(table.contains(">Sample row</a:t>") && table.contains(">Pending</a:t>"));
        assert_eq!(xml.matches(">Sample row</a:t>").count(), 1);
        let text_boxes: Vec<String> = xml
            .split("<p:sp>")
            .skip(1)
            .filter_map(|shape| {
                let (shape, _) = shape.split_once("</p:sp>")?;
                Some(
                    shape
                        .split(r#"<a:t xml:space="preserve">"#)
                        .skip(1)
                        .filter_map(|run| run.split_once("</a:t>").map(|(text, _)| text))
                        .collect(),
                )
            })
            .collect();
        for expected in [
            "Round trip title",
            "Project status",
            "Before sample/path and after the code.",
        ] {
            assert!(
                text_boxes.iter().any(|text| text.contains(expected)),
                "missing editable text: {expected}"
            );
        }
    }
}
