use super::{office_zip, put, relation, relationships, xml, Position, HEADER};
use serde::Deserialize;
use std::{path::Path, sync::atomic::AtomicBool};

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum Kind {
    Bar,
    Line,
    Pie,
}

#[derive(Deserialize)]
struct Series {
    name: String,
    values: Vec<f64>,
}

#[derive(Deserialize)]
pub(super) struct Chart {
    #[serde(flatten)]
    pub position: Position,
    kind: Kind,
    title: Option<String>,
    categories: Vec<String>,
    series: Vec<Series>,
}

const CHART_NS: &str = "http://schemas.openxmlformats.org/drawingml/2006/chart";
const MAIN_NS: &str = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS: &str = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

fn column_name(index: usize) -> char {
    // The HTML contract caps series at 16 (columns B–Q).
    char::from(b'A' + index as u8)
}

impl Chart {
    fn workbook(&self, root: &Path, cancelled: &AtomicBool) -> Result<Vec<u8>, String> {
        let temporary = tempfile::tempdir_in(root).map_err(|error| error.to_string())?;
        let book = temporary.path();
        let cell = |address: &str, value: &str| {
            format!(
                r#"<c r="{address}" t="inlineStr"><is><t xml:space="preserve">{}</t></is></c>"#,
                xml(value)
            )
        };
        let mut data = String::from(r#"<row r="1">"#);
        data += &cell("A1", "Category");
        for (index, series) in self.series.iter().enumerate() {
            data += &cell(&format!("{}1", column_name(index + 1)), &series.name);
        }
        data += "</row>";
        for (category_index, category) in self.categories.iter().enumerate() {
            let row = category_index + 2;
            data += &format!(r#"<row r="{row}">"#);
            data += &cell(&format!("A{row}"), category);
            for (series_index, series) in self.series.iter().enumerate() {
                data += &format!(
                    r#"<c r="{}{row}"><v>{}</v></c>"#,
                    column_name(series_index + 1),
                    series.values[category_index]
                );
            }
            data += "</row>";
        }
        put(
            book,
            "xl/worksheets/sheet1.xml",
            format!(
                r#"{HEADER}<worksheet xmlns="{MAIN_NS}"><sheetData>{data}</sheetData></worksheet>"#
            ),
        )?;
        put(
            book,
            "xl/workbook.xml",
            format!(
                r#"{HEADER}<workbook xmlns="{MAIN_NS}" xmlns:r="{REL_NS}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>"#
            ),
        )?;
        relationships(
            book,
            "_rels/.rels",
            &relation(1, "officeDocument", "xl/workbook.xml"),
        )?;
        relationships(
            book,
            "xl/_rels/workbook.xml.rels",
            &relation(1, "worksheet", "worksheets/sheet1.xml"),
        )?;
        put(
            book,
            "[Content_Types].xml",
            format!(
                r#"{HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>"#
            ),
        )?;
        let mut output = Vec::new();
        office_zip::pack(book, &mut output, cancelled)?;
        Ok(output)
    }

    pub fn write(&self, root: &Path, id: &str, cancelled: &AtomicBool) -> Result<(), String> {
        let count = self.categories.len();
        if count == 0
            || count > 200
            || self.series.is_empty()
            || self.series.len() > 16
            || self
                .series
                .iter()
                .any(|series| series.values.len() != count)
            || matches!(self.kind, Kind::Pie)
                && (self.series.len() != 1 || self.series[0].values.iter().any(|v| *v < 0.0))
        {
            return Err("Invalid structured chart data".into());
        }
        let end = count + 1;
        let categories: String = self
            .categories
            .iter()
            .enumerate()
            .map(|(i, category)| format!(r#"<c:pt idx="{i}"><c:v>{}</c:v></c:pt>"#, xml(category)))
            .collect();
        let pie_points: String = if matches!(self.kind, Kind::Pie) {
            (0..count)
                .map(|index| {
                    let accent = index % 6 + 1;
                    format!(r#"<c:dPt><c:idx val="{index}"/><c:spPr><a:solidFill><a:schemeClr val="accent{accent}"/></a:solidFill></c:spPr></c:dPt>"#)
                })
                .collect()
        } else {
            String::new()
        };
        let mut series_xml = String::new();
        for (index, series) in self.series.iter().enumerate() {
            let col = column_name(index + 1);
            let name = xml(&series.name);
            let values: String = series
                .values
                .iter()
                .enumerate()
                .map(|(i, value)| format!(r#"<c:pt idx="{i}"><c:v>{value}</c:v></c:pt>"#))
                .collect();
            series_xml += &format!(
                r#"<c:ser><c:idx val="{index}"/><c:order val="{index}"/><c:tx><c:strRef><c:f>Sheet1!${col}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>{name}</c:v></c:pt></c:strCache></c:strRef></c:tx>{pie_points}<c:cat><c:strRef><c:f>Sheet1!$A$2:$A${end}</c:f><c:strCache><c:ptCount val="{count}"/>{categories}</c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>Sheet1!${col}$2:${col}${end}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="{count}"/>{values}</c:numCache></c:numRef></c:val></c:ser>"#
            );
        }
        let axis_ids = r#"<c:axId val="100"/><c:axId val="200"/>"#;
        let axes = r#"<c:catAx><c:axId val="100"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="200"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="200"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="General" sourceLinked="1"/><c:crossAx val="100"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>"#;
        let plot = match self.kind {
            Kind::Bar => format!(
                r#"<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>{series_xml}{axis_ids}</c:barChart>{axes}"#
            ),
            Kind::Line => format!(
                r#"<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>{series_xml}{axis_ids}</c:lineChart>{axes}"#
            ),
            Kind::Pie => format!(r#"<c:pieChart><c:varyColors val="1"/>{series_xml}</c:pieChart>"#),
        };
        let title = self.title.as_deref().filter(|value| !value.is_empty()).map_or_else(String::new, |title| {
            format!(r#"<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>{}</a:t></a:r></a:p></c:rich></c:tx></c:title>"#, xml(title))
        });
        let legend = if matches!(self.kind, Kind::Pie) || self.series.len() > 1 {
            r#"<c:legend><c:legendPos val="r"/><c:overlay val="0"/></c:legend>"#
        } else {
            ""
        };
        put(
            root,
            &format!("ppt/charts/chart-{id}.xml"),
            format!(
                r#"{HEADER}<c:chartSpace xmlns:c="{CHART_NS}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="{REL_NS}"><c:chart>{title}<c:autoTitleDeleted val="{}"/><c:plotArea><c:layout/>{plot}</c:plotArea>{legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>"#,
                u8::from(title.is_empty())
            ),
        )?;
        put(
            root,
            &format!("ppt/embeddings/chart-{id}.xlsx"),
            self.workbook(root, cancelled)?,
        )?;
        relationships(
            root,
            &format!("ppt/charts/_rels/chart-{id}.xml.rels"),
            &relation(1, "package", &format!("../embeddings/chart-{id}.xlsx")),
        )
    }
}
