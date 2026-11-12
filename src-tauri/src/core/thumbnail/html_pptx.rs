use super::Deck;
#[path = "html_pptx_chart.rs"]
mod chart;
#[path = "html_office_zip.rs"]
mod office_zip;
use serde::Deserialize;
use serde_json::json;
use std::{
    fs,
    io::{self, Write},
    path::Path,
    sync::{atomic::AtomicBool, Arc},
};

const REL: &str = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
const NS: &str = r#"xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main""#;
const HEADER: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>"#;
const GROUP: &str =
    r#"<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>"#;
const COLOR_MAP: &str = r#"<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>"#;

#[derive(Clone, Deserialize)]
struct Position {
    name: String,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    order: usize,
    z: i32,
    #[serde(default)]
    hidden: bool,
}

#[derive(Deserialize)]
struct Run {
    text: String,
    font: String,
    size: f64,
    bold: bool,
    italic: bool,
    color: String,
    highlight: Option<String>,
    spacing: f64,
}

#[derive(Deserialize)]
struct Line {
    height: f64,
    runs: Vec<Run>,
}

#[derive(Deserialize)]
struct Paint {
    rgb: String,
    alpha: u8,
}

#[derive(Deserialize)]
struct Stroke {
    #[serde(flatten)]
    paint: Paint,
    width: f64,
}

#[derive(Deserialize)]
struct BoxStyle {
    fill: Paint,
    stroke: Option<Stroke>,
    radius: f64,
}

#[derive(Deserialize)]
struct TextBox {
    #[serde(flatten)]
    style: BoxStyle,
    left: f64,
    top: f64,
    right: f64,
}

#[derive(Deserialize)]
struct Text {
    #[serde(flatten)]
    position: Position,
    #[serde(rename = "box")]
    frame: Option<TextBox>,
    align: String,
    lines: Vec<Line>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableSlot {
    row_span: usize,
    col_span: usize,
    h_merge: bool,
    v_merge: bool,
    content: Option<TableCell>,
}

#[derive(Deserialize)]
struct TableCell {
    fill: Paint,
    strokes: [Option<Stroke>; 4],
    padding: [f64; 4],
    anchor: String,
    align: String,
    lines: Vec<Line>,
}

#[derive(Deserialize)]
struct TableRow {
    height: f64,
    cells: Vec<TableSlot>,
}

#[derive(Deserialize)]
struct Table {
    #[serde(flatten)]
    position: Position,
    columns: Vec<f64>,
    rows: Vec<TableRow>,
}

#[derive(Deserialize)]
struct TextGroup {
    #[serde(flatten)]
    position: Position,
    frame: BoxStyle,
    texts: Vec<Text>,
}

#[derive(Deserialize)]
struct Objects {
    images: Vec<Position>,
    texts: Vec<Text>,
    tables: Vec<Table>,
    groups: Vec<TextGroup>,
    charts: Vec<chart::Chart>,
}

fn xml(value: &str) -> String {
    value.chars().filter(|&ch| matches!(ch, '\t' | '\n' | '\r' | '\u{20}'..='\u{D7FF}' | '\u{E000}'..='\u{FFFD}' | '\u{10000}'..='\u{10FFFF}'))
        .collect::<String>()
        .replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

fn put(root: &Path, path: &str, data: impl AsRef<[u8]>) -> Result<(), String> {
    let path = root.join(path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, data).map_err(|error| error.to_string())
}

fn relation(id: usize, kind: &str, target: &str) -> String {
    format!(r#"<Relationship Id="rId{id}" Type="{REL}{kind}" Target="{target}"/>"#)
}

fn relationships(root: &Path, path: &str, entries: &str) -> Result<(), String> {
    put(
        root,
        path,
        format!(
            r#"{HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{entries}</Relationships>"#
        ),
    )
}

fn emu(px: f64, factor: f64) -> i64 {
    (px * factor).round() as i64
}

fn transform(x: i64, y: i64, width: i64, height: i64) -> String {
    format!(r#"<a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{width}" cy="{height}"/></a:xfrm>"#)
}

fn solid_fill(paint: &Paint) -> String {
    if paint.alpha == 0 {
        return "<a:noFill/>".into();
    }
    let color = xml(&paint.rgb);
    let alpha = u32::from(paint.alpha) * 100_000 / 255;
    format!(
        r#"<a:solidFill><a:srgbClr val="{color}"><a:alpha val="{alpha}"/></a:srgbClr></a:solidFill>"#
    )
}

fn box_geometry(frame: BoxStyle, p: &Position, factor: f64) -> String {
    let radius = (frame.radius / p.w.min(p.h) * 100_000.0)
        .round()
        .clamp(0.0, 50_000.0) as i64;
    let outline = frame.stroke.map_or_else(
        || "<a:ln><a:noFill/></a:ln>".into(),
        |stroke| {
            format!(
                r#"<a:ln w="{}">{}</a:ln>"#,
                emu(stroke.width, factor),
                solid_fill(&stroke.paint)
            )
        },
    );
    let fill = solid_fill(&frame.fill);
    let shape = if radius > 0 {
        format!(
            r#"<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val {radius}"/></a:avLst></a:prstGeom>"#
        )
    } else {
        r#"<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>"#.into()
    };
    format!("{shape}{fill}{outline}")
}

fn group_shape(next_id: &mut usize, group: TextGroup, factor: f64) -> String {
    let id = *next_id;
    let background_id = id + 1;
    *next_id += 2;
    let p = group.position;
    let name = if p.name.is_empty() {
        format!("Card {id}")
    } else {
        xml(&p.name)
    };
    let x = emu(p.x, factor);
    let y = emu(p.y, factor);
    let width = emu(p.w, factor);
    let height = emu(p.h, factor);
    let frame_xfrm = transform(x, y, width, height);
    let geometry = box_geometry(group.frame, &p, factor);
    let children: String = group
        .texts
        .into_iter()
        .map(|text| {
            let id = *next_id;
            *next_id += 1;
            text_shape(id, text, factor)
        })
        .collect();
    format!(
        r#"<p:grpSp><p:nvGrpSpPr><p:cNvPr id="{id}" name="{name}"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{width}" cy="{height}"/><a:chOff x="{x}" y="{y}"/><a:chExt cx="{width}" cy="{height}"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="{background_id}" name="Card background"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>{frame_xfrm}{geometry}</p:spPr></p:sp>{children}</p:grpSp>"#
    )
}

fn text_shape(id: usize, text: Text, factor: f64) -> String {
    let p = text.position;
    let name = if p.name.is_empty() {
        format!("Text {id}")
    } else {
        xml(&p.name)
    };
    let xfrm = transform(
        emu(p.x, factor),
        emu(p.y, factor),
        emu(p.w, factor),
        emu(p.h, factor),
    );
    let (geometry, insets) = if let Some(frame) = text.frame {
        let geometry = box_geometry(frame.style, &p, factor);
        let left = emu(frame.left, factor);
        let top = emu(frame.top, factor);
        let right = emu(frame.right, factor);
        (geometry, [left, top, right])
    } else {
        (
            r#"<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln>"#
                .into(),
            [0, 0, 0],
        )
    };
    let [left, top, right] = insets;
    let paragraphs = text_paragraphs(text.lines, &text.align, factor);
    format!(
        r#"<p:sp><p:nvSpPr><p:cNvPr id="{id}" name="{name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>{xfrm}{geometry}</p:spPr><p:txBody><a:bodyPr wrap="none" lIns="{left}" tIns="{top}" rIns="{right}" bIns="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>{paragraphs}</p:txBody></p:sp>"#
    )
}

fn text_paragraphs(lines: Vec<Line>, alignment: &str, factor: f64) -> String {
    let size = |px: f64| (px * factor / 127.0).round() as i64;
    let align = match alignment {
        "r" => "r",
        "ctr" => "ctr",
        _ => "l",
    };
    let mut paragraphs = String::new();
    for line in lines {
        let height = size(line.height).clamp(100, 400_000);
        paragraphs.push_str(&format!(
            r#"<a:p><a:pPr algn="{align}"><a:lnSpc><a:spcPts val="{height}"/></a:lnSpc></a:pPr>"#
        ));
        for run in line.runs {
            let font = xml(&run.font);
            let color = xml(&run.color);
            let text = xml(&run.text);
            let bold = u8::from(run.bold);
            let italic = u8::from(run.italic);
            let font_size = size(run.size).clamp(100, 400_000);
            let spacing = size(run.spacing).clamp(-4000, 4000);
            let highlight = run.highlight.map_or_else(String::new, |value| {
                format!(
                    r#"<a:highlight><a:srgbClr val="{}"/></a:highlight>"#,
                    xml(&value)
                )
            });
            paragraphs.push_str(&format!(
                r#"<a:r><a:rPr sz="{font_size}" b="{bold}" i="{italic}" spc="{spacing}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill>{highlight}<a:latin typeface="{font}"/><a:ea typeface="{font}"/></a:rPr><a:t xml:space="preserve">{text}</a:t></a:r>"#
            ));
        }
        paragraphs.push_str("</a:p>");
    }
    if paragraphs.is_empty() {
        paragraphs.push_str("<a:p/>");
    }
    paragraphs
}

fn table_cell(slot: TableSlot, factor: f64) -> String {
    use std::fmt::Write as _;

    let mut attrs = String::new();
    if slot.row_span > 1 {
        let _ = write!(attrs, r#" rowSpan="{}""#, slot.row_span);
    }
    if slot.col_span > 1 {
        let _ = write!(attrs, r#" gridSpan="{}""#, slot.col_span);
    }
    if slot.h_merge {
        attrs.push_str(r#" hMerge="1""#);
    }
    if slot.v_merge {
        attrs.push_str(r#" vMerge="1""#);
    }
    let Some(cell) = slot.content else {
        return format!(
            r#"<a:tc{attrs}><a:txBody><a:bodyPr/><a:lstStyle/><a:p/></a:txBody><a:tcPr/></a:tc>"#
        );
    };
    let margins = cell.padding.map(|px| emu(px, factor).max(0));
    let [left, right, top, bottom] = margins;
    let anchor = match cell.anchor.as_str() {
        "b" => "b",
        "t" => "t",
        _ => "ctr",
    };
    let lines: String = ["lnL", "lnR", "lnT", "lnB"]
        .into_iter()
        .zip(cell.strokes)
        .map(|(side, stroke)| match stroke {
            Some(stroke) => format!(
                r#"<a:{side} w="{}">{}</a:{side}>"#,
                emu(stroke.width, factor),
                solid_fill(&stroke.paint)
            ),
            None => format!("<a:{side}><a:noFill/></a:{side}>"),
        })
        .collect();
    let fill = solid_fill(&cell.fill);
    let text = text_paragraphs(cell.lines, &cell.align, factor);
    format!(
        r#"<a:tc{attrs}><a:txBody><a:bodyPr/><a:lstStyle/>{text}</a:txBody><a:tcPr marL="{left}" marR="{right}" marT="{top}" marB="{bottom}" anchor="{anchor}">{lines}{fill}</a:tcPr></a:tc>"#
    )
}

fn table_shape(id: usize, table: Table, factor: f64) -> String {
    let p = table.position;
    let name = if p.name.is_empty() {
        format!("Table {id}")
    } else {
        xml(&p.name)
    };
    let x = emu(p.x, factor);
    let y = emu(p.y, factor);
    let width = emu(p.w, factor);
    let height = emu(p.h, factor);
    let columns: String = table
        .columns
        .into_iter()
        .map(|width| format!(r#"<a:gridCol w="{}"/>"#, emu(width, factor)))
        .collect();
    let rows: String = table
        .rows
        .into_iter()
        .map(|row| {
            let height = emu(row.height, factor);
            let cells: String = row
                .cells
                .into_iter()
                .map(|cell| table_cell(cell, factor))
                .collect();
            format!(r#"<a:tr h="{height}">{cells}</a:tr>"#)
        })
        .collect();
    format!(
        r#"<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="{id}" name="{name}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{width}" cy="{height}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr/><a:tblGrid>{columns}</a:tblGrid>{rows}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>"#
    )
}

fn picture(id: usize, relation: usize, p: &Position, factor: f64) -> String {
    let name = if p.name.is_empty() {
        format!("Picture {id}")
    } else {
        xml(&p.name)
    };
    let xfrm = transform(
        emu(p.x, factor),
        emu(p.y, factor),
        emu(p.w, factor),
        emu(p.h, factor),
    );
    let hidden = u8::from(p.hidden);
    format!(
        r#"<p:pic><p:nvPicPr><p:cNvPr id="{id}" name="{name}" hidden="{hidden}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId{relation}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>{xfrm}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>"#
    )
}

fn layers(deck: &mut Deck, mode: &str, index: usize) -> Result<(), String> {
    deck.eval(&format!(
        "({})({}, {index})",
        include_str!("html_pptx_layers.js"),
        json!(mode)
    ))?;
    Ok(())
}

fn picture_layer(
    deck: &mut Deck,
    index: usize,
    original: &Position,
) -> Result<(Position, Vec<u8>), String> {
    use image::{DynamicImage, ImageFormat};

    let clip = json!({"x": original.x + deck.x as f64, "y": original.y + deck.y as f64, "width": original.w, "height": original.h, "scale": 1});
    let decode = |bytes: &[u8]| {
        image::load_from_memory_with_format(bytes, ImageFormat::Png)
            .map(DynamicImage::into_rgba8)
            .map_err(|error| error.to_string())
    };
    // A black/white matte pair in the actual scene measures which parts of
    // the image are covered by authored decorations. Keep the original
    // picture pixels separate and apply only the measured visibility.
    layers(deck, "dark-matte", index)?;
    let dark = decode(&deck.screenshot(clip.clone())?)?;
    layers(deck, "light-matte", index)?;
    let light = decode(&deck.screenshot(clip.clone())?)?;
    deck.browser.0.call(
        "Emulation.setDefaultBackgroundColorOverride",
        json!({
            "color": {"r": 0, "g": 0, "b": 0, "a": 0}
        }),
        Some(&deck.session),
    )?;
    layers(deck, "image", index)?;
    let isolated = deck.screenshot(clip)?;
    deck.browser.0.call(
        "Emulation.setDefaultBackgroundColorOverride",
        json!({}),
        Some(&deck.session),
    )?;
    let mut picture = decode(&isolated)?;
    if picture.dimensions() != dark.dimensions() || picture.dimensions() != light.dimensions() {
        return Err("Picture capture dimensions changed".into());
    }
    let (width, height) = picture.dimensions();
    let (mut left, mut top, mut right, mut bottom) = (width, height, 0, 0);
    for (x, y, pixel) in picture.enumerate_pixels_mut() {
        let dark = dark.get_pixel(x, y);
        let light = light.get_pixel(x, y);
        let coverage = (0..3)
            .map(|channel| light[channel].abs_diff(dark[channel]))
            .max()
            .unwrap_or(0);
        if coverage <= 1 {
            pixel[3] = 0;
        } else {
            pixel[3] = pixel[3].min(coverage);
        }
        if pixel[3] > 0 {
            left = left.min(x);
            top = top.min(y);
            right = right.max(x + 1);
            bottom = bottom.max(y + 1);
        }
    }
    if right <= left || bottom <= top {
        // A fully obscured source still gets an independently replaceable
        // picture object, retaining its original geometry and pixels.
        let mut hidden = original.clone();
        hidden.hidden = true;
        return Ok((hidden, isolated));
    }
    let mut position = original.clone();
    position.x += f64::from(left);
    position.y += f64::from(top);
    position.w = f64::from(right - left);
    position.h = f64::from(bottom - top);
    let crop =
        image::imageops::crop(&mut picture, left, top, right - left, bottom - top).to_image();
    let mut encoded = io::Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(crop)
        .write_to(&mut encoded, ImageFormat::Png)
        .map_err(|error| error.to_string())?;
    Ok((position, encoded.into_inner()))
}

fn add_slide(
    deck: &mut Deck,
    root: &Path,
    index: usize,
    factor: f64,
    cancelled: &AtomicBool,
) -> Result<(), String> {
    let number = index + 1;
    let objects: Objects = serde_json::from_value(deck.eval(&format!(
        "({})({}, {}, {}, {}, {})",
        include_str!("html_pptx_extract.js"),
        json!(deck.pages[index]),
        deck.width,
        deck.height,
        deck.x,
        deck.y
    ))?)
    .map_err(|error| error.to_string())?;
    let background = format!("slide-{number}-background.png");
    layers(deck, "background", 0)?;
    put(
        root,
        &format!("ppt/media/{background}"),
        deck.slide_image()?,
    )?;
    let mut relations = relation(1, "slideLayout", "../slideLayouts/slideLayout1.xml");
    relations += &relation(2, "image", &format!("../media/{background}"));
    let mut shapes =
        Vec::with_capacity(objects.texts.len() + objects.images.len() + objects.tables.len());
    for (index, original) in objects.images.iter().enumerate() {
        let (p, bytes) = picture_layer(deck, index, original)?;
        let name = format!("slide-{number}-picture-{}.png", index + 1);
        put(root, &format!("ppt/media/{name}"), bytes)?;
        relations += &relation(index + 3, "image", &format!("../media/{name}"));
        shapes.push((p.z, p.order, picture(index + 2, index + 3, &p, factor)));
    }
    layers(deck, "restore", 0)?;
    for (index, text) in objects.texts.into_iter().enumerate() {
        shapes.push((
            text.position.z,
            text.position.order,
            text_shape(index + 2 + objects.images.len(), text, factor),
        ));
    }
    for table in objects.tables {
        let id = shapes.len() + 2;
        shapes.push((
            table.position.z,
            table.position.order,
            table_shape(id, table, factor),
        ));
    }
    let mut next_id = shapes.len() + 2;
    for group in objects.groups {
        shapes.push((
            group.position.z,
            group.position.order,
            group_shape(&mut next_id, group, factor),
        ));
    }
    for (index, chart) in objects.charts.into_iter().enumerate() {
        let part = format!("{number}-{}", index + 1);
        chart.write(root, &part, cancelled)?;
        let relation_id = objects.images.len() + index + 3;
        relations += &relation(relation_id, "chart", &format!("../charts/chart-{part}.xml"));
        let p = chart.position;
        let id = next_id;
        next_id += 1;
        let x = emu(p.x, factor);
        let y = emu(p.y, factor);
        let width = emu(p.w, factor);
        let height = emu(p.h, factor);
        let name = if p.name.is_empty() {
            format!("Chart {id}")
        } else {
            xml(&p.name)
        };
        let shape = format!(
            r#"<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="{id}" name="{name}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{width}" cy="{height}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId{relation_id}"/></a:graphicData></a:graphic></p:graphicFrame>"#
        );
        shapes.push((p.z, p.order, shape));
    }
    shapes.sort_by_key(|(z, order, _)| (*z, *order));
    let shapes: String = shapes.into_iter().map(|(_, _, shape)| shape).collect();
    relationships(
        root,
        &format!("ppt/slides/_rels/slide{number}.xml.rels"),
        &relations,
    )?;
    put(
        root,
        &format!("ppt/slides/slide{number}.xml"),
        format!(
            r#"{HEADER}<p:sld {NS}><p:cSld><p:bg><p:bgPr><a:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg><p:spTree>{GROUP}{shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"#
        ),
    )
}

fn package(root: &Path, pages: usize, width: i64, height: i64) -> Result<(), String> {
    let mut content = String::new();
    let mut embedding_type = "";
    let mut relations = relation(1, "slideMaster", "slideMasters/slideMaster1.xml");
    let mut slides = String::new();
    for number in 1..=pages {
        let relationship = number + 1;
        let id = number + 255;
        slides.push_str(&format!(r#"<p:sldId id="{id}" r:id="rId{relationship}"/>"#));
        content.push_str(&format!(r#"<Override PartName="/ppt/slides/slide{number}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>"#));
        relations += &relation(relationship, "slide", &format!("slides/slide{number}.xml"));
    }
    if let Ok(parts) = fs::read_dir(root.join("ppt/charts")) {
        embedding_type = r#"<Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>"#;
        for part in parts {
            let part = part.map_err(|error| error.to_string())?;
            if part.path().extension().is_some_and(|ext| ext == "xml") {
                let name = xml(&part.file_name().to_string_lossy());
                content.push_str(&format!(r#"<Override PartName="/ppt/charts/{name}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>"#));
            }
        }
    }
    put(
        root,
        "[Content_Types].xml",
        format!(
            r#"{HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>{embedding_type}<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>{content}</Types>"#
        ),
    )?;
    relationships(
        root,
        "_rels/.rels",
        &relation(1, "officeDocument", "ppt/presentation.xml"),
    )?;
    relationships(root, "ppt/_rels/presentation.xml.rels", &relations)?;
    put(
        root,
        "ppt/presentation.xml",
        format!(
            r#"{HEADER}<p:presentation {NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>{slides}</p:sldIdLst><p:sldSz cx="{width}" cy="{height}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>"#
        ),
    )?;
    put(
        root,
        "ppt/slideMasters/slideMaster1.xml",
        format!(
            r#"{HEADER}<p:sldMaster {NS}><p:cSld><p:spTree>{GROUP}</p:spTree></p:cSld>{COLOR_MAP}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>"#
        ),
    )?;
    relationships(
        root,
        "ppt/slideMasters/_rels/slideMaster1.xml.rels",
        &(relation(1, "slideLayout", "../slideLayouts/slideLayout1.xml")
            + &relation(2, "theme", "../theme/theme1.xml")),
    )?;
    put(
        root,
        "ppt/slideLayouts/slideLayout1.xml",
        format!(
            r#"{HEADER}<p:sldLayout {NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>{GROUP}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>"#
        ),
    )?;
    relationships(
        root,
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
        &relation(1, "slideMaster", "../slideMasters/slideMaster1.xml"),
    )?;
    put(
        root,
        "ppt/theme/theme1.xml",
        include_str!("html_pptx_theme.xml"),
    )
}

pub fn render_pptx(
    chrome: &Path,
    source: &Path,
    cancelled: Arc<AtomicBool>,
    reference_viewport: Option<[u64; 2]>,
    output: &mut impl Write,
    progress: impl Fn(usize, usize),
) -> Result<(), String> {
    let workspace = tempfile::tempdir().map_err(|error| error.to_string())?;
    let root = workspace.path().join("parts");
    let mut deck = Deck::open(chrome, source, Arc::clone(&cancelled))?;
    if let Some([width, height]) = reference_viewport
        .filter(|[width, height]| (320..=4096).contains(width) && (240..=4096).contains(height))
    {
        deck.set_viewport(width, height)?;
        let fits = match deck.prepare(0, 1) {
            Ok(()) => {
                let page = json!(deck.pages[0]);
                let scaled = deck.eval(&format!(
                    "(() => {{ const root = document.querySelector('[data-nutbook-page-id=\"' + CSS.escape({page}) + '\"]'); const bounds = root.getBoundingClientRect(); return Math.abs(bounds.width - root.offsetWidth) > 1 || Math.abs(bounds.height - root.offsetHeight) > 1; }})()"
                ))?;
                scaled == serde_json::Value::Bool(false)
            }
            Err(_) => false,
        };
        if !fits {
            // Fixed canvases may be scaled by their shell in a reading window.
            deck.set_viewport(super::VIEWPORT_WIDTH, super::VIEWPORT_HEIGHT)?;
        }
    }
    for index in 0..deck.pages.len() {
        progress(index, deck.pages.len());
        deck.prepare(index, 1)?;
        let factor = 12_192_000.0 / deck.width.max(deck.height) as f64;
        add_slide(&mut deck, &root, index, factor, &cancelled)?;
    }
    let factor = 12_192_000.0 / deck.width.max(deck.height) as f64;
    package(
        &root,
        deck.pages.len(),
        emu(deck.width as f64, factor),
        emu(deck.height as f64, factor),
    )?;
    progress(deck.pages.len(), deck.pages.len());
    drop(deck);

    office_zip::pack(&root, output, &cancelled)
}
