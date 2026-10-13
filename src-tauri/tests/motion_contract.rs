use nutbook_backend::core::motion::validate;
#[test]
fn formal_contract_rejects_unknown_data_and_unimplemented_templates() {
    let source = include_str!("../../tests/fixtures/motion/valid.json");
    validate(source).unwrap();
    let original: serde_json::Value = serde_json::from_str(source).unwrap();
    for (pointer, value) in [
        ("/contract", serde_json::json!("nutbook-motion/v2")),
        ("/pages/0/actions/0/targetId", serde_json::json!("missing")),
        ("/pages/0/actions/0/templateId", serde_json::json!("text.unknown")),
        ("/pages/0/actions/0/templateVersion", serde_json::json!(2)),
        ("/pages/0/actions/0/params/density", serde_json::json!(12.5)),
        ("/pages/0/capabilities/containsVideo", serde_json::json!(true)),
        ("/pages/0/background", serde_json::json!({"code":"alert(1)"})),
    ] {
        let mut bad = original.clone(); *bad.pointer_mut(pointer).unwrap() = value;
        assert!(validate(&bad.to_string()).is_err(), "{pointer}");
    }
    let mut bad = original.clone(); bad["code"] = serde_json::json!("x");
    assert!(validate(&bad.to_string()).is_err());
    let mut empty = original; empty["pages"][0]["actions"] = serde_json::json!([]);
    validate(&empty.to_string()).unwrap();
}

#[test]
fn official_export_produces_static_self_contained_motion_document() {
    use nutbook_backend::core::markdown_export::*;
    for template in [fallback_presentation_light_template(),fallback_presentation_dark_template()] {
        let output=render_presentation_html(MarkdownHtmlExportInput{title:"中文🌱".into(),source_file:"sample.md".into(),source_path:"/tmp/sample.md".into(),markdown:"# 中文🌱\n\n第一段\n\n## 第二页\n\n正文".into(),generated_at:"2026-10-13".into(),template_html:template.into(),preferences:Default::default()},PresentationHtmlExportPreferences{aspect_ratio:"16-9".into(),density:PresentationDensity::Balanced,output_kind:"motion-editable".into()}).unwrap();
        let prefix="<script type=\"application/json\" id=\"nutbook-motion-config\" data-id=\"nutbook-motion-config\">";
        let data=output.html.split(prefix).nth(1).unwrap().split("</script>").next().unwrap();
        let config=validate(data).unwrap();assert!(!config.pages.is_empty());
        assert!(config.pages.iter().all(|p|p.actions.is_empty()&&p.background.is_none()&&p.transition.is_none()));
        assert!(output.html.contains("data-nutbook-motion-contract=\"nutbook-motion/v1\""));
        assert!(output.html.contains("function createMotionClock"));
        assert!(!output.html.contains("https://cdn"));assert!(!output.html.contains("node_modules"));
    }
}

#[test]
fn particle_hue_is_optional_bounded_and_persisted() {
    let mut value:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
    validate(&value.to_string()).unwrap();
    for hue in [serde_json::json!(-1),serde_json::json!(361),serde_json::Value::Null] {
        value["pages"][0]["actions"][0]["params"]["hue"]=hue;
        assert!(validate(&value.to_string()).is_err());
    }
    value["pages"][0]["actions"][0]["params"]["hue"]=serde_json::json!(30);
    let config=validate(&value.to_string()).unwrap();
    assert_eq!(config.pages[0].actions[0].params["hue"],30.0);
}

#[test]
fn motion_resource_budget_counts_uncompressed_utf8_bytes() {
    use nutbook_backend::core::motion::*;
    validate_generated_resources(&"a".repeat(MAX_RUNTIME_BYTES), &"a".repeat(MAX_HTML_BYTES)).unwrap();
    assert_eq!(validate_generated_resources(&"a".repeat(MAX_RUNTIME_BYTES + 1), "small").unwrap_err().code(), "MOTION_RESOURCE_BUDGET_EXCEEDED");
    assert_eq!(validate_generated_resources("small", &"中".repeat(MAX_HTML_BYTES / 3 + 1)).unwrap_err().code(), "MOTION_RESOURCE_BUDGET_EXCEEDED");
}

#[test]
fn official_motion_export_rejects_oversized_output() {
    use nutbook_backend::core::markdown_export::*;
    let template=fallback_presentation_light_template().replace("</head>",&format!("<!--{}--></head>","x".repeat(3*1024*1024)));
    let error=render_presentation_html(MarkdownHtmlExportInput{title:"Budget".into(),source_file:"sample.md".into(),source_path:"/tmp/sample.md".into(),markdown:"# Title\n\nBody".into(),generated_at:"2026-10-13".into(),template_html:template,preferences:Default::default()},PresentationHtmlExportPreferences{aspect_ratio:"16-9".into(),density:PresentationDensity::Balanced,output_kind:"motion-editable".into()}).unwrap_err();
    assert_eq!(error.code(),"MOTION_RESOURCE_BUDGET_EXCEEDED");
}
