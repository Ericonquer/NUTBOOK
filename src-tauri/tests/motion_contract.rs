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

#[test]
fn object_templates_share_entrance_slot_and_bound_each_parameter() {
    let original:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
    let mut doc=original.clone();
    let mut gravity=doc["pages"][0]["actions"][0].clone();
    gravity["id"]=serde_json::json!("gravity");gravity["templateId"]=serde_json::json!("entrance.gravity-impact");gravity["params"]=serde_json::json!({"durationMs":1800,"strength":1});
    doc["pages"][0]["actions"].as_array_mut().unwrap().push(gravity.clone());assert!(validate(&doc.to_string()).is_err(),"text uses entrance slot");
    doc["pages"][0]["actions"]=serde_json::json!([gravity.clone()]);validate(&doc.to_string()).unwrap();
    let mut spotlight=gravity.clone();spotlight["id"]=serde_json::json!("spot");spotlight["templateId"]=serde_json::json!("emphasis.spotlight");doc["pages"][0]["actions"].as_array_mut().unwrap().push(spotlight);validate(&doc.to_string()).unwrap();
    doc["pages"][0]["actions"][1]["params"]["density"]=serde_json::json!(100);assert!(validate(&doc.to_string()).is_err(),"unimplemented parameter rejected");
    let mut exit=original["pages"][0]["actions"][0].clone();exit["templateId"]=serde_json::json!("exit.particle-dissolve");exit["params"]["density"]=serde_json::json!(2400);doc["pages"][0]["actions"]=serde_json::json!([exit]);validate(&doc.to_string()).unwrap();doc["pages"][0]["actions"][0]["params"]["density"]=serde_json::json!(2401);assert!(validate(&doc.to_string()).is_err());
}

#[test]
fn background_slot_uses_strict_registry_schema_and_global_effect_ids() {
    let mut doc:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
    let registry:serde_json::Value=serde_json::from_str(include_str!("../../src/motion/registry.json")).unwrap();
    let params=registry["templates"]["background.flowing-gradient"]["params"].as_object().unwrap().iter().map(|(key,rule)|(key.clone(),rule["default"].clone())).collect::<serde_json::Map<_,_>>();
    let background=serde_json::json!({"id":"bg","templateId":"background.flowing-gradient","templateVersion":1,"params":params,"seed":42});
    doc["pages"][0]["background"]=background.clone();validate(&doc.to_string()).unwrap();
    for (key,value) in [("id",serde_json::json!("action-1")),("templateId",serde_json::json!("emphasis.spotlight")),("templateVersion",serde_json::json!(2)),("seed",serde_json::json!(-1))]{let mut bad=doc.clone();bad["pages"][0]["background"][key]=value;assert!(validate(&bad.to_string()).is_err(),"{key}");}
    for(key,value)in [("hue",serde_json::json!(361)),("durationMs",serde_json::json!(5999)),("code",serde_json::json!("alert(1)"))]{let mut bad=doc.clone();bad["pages"][0]["background"]["params"][key]=value;assert!(validate(&bad.to_string()).is_err(),"{key}");}
    let mut bad=doc.clone();bad["pages"][0]["background"]["url"]=serde_json::json!("https://example.com");assert!(validate(&bad.to_string()).is_err());
}

#[test]
fn transition_slot_rejects_wrong_category_identity_and_shape() {
    let mut doc:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
    let registry:serde_json::Value=serde_json::from_str(include_str!("../../src/motion/registry.json")).unwrap();
    let params=registry["templates"]["transition.curtain-reveal"]["params"].as_object().unwrap().iter().map(|(key,rule)|(key.clone(),rule["default"].clone())).collect::<serde_json::Map<_,_>>();
    doc["pages"][0]["transition"]=serde_json::json!({"id":"curtain","templateId":"transition.curtain-reveal","templateVersion":1,"params":params,"seed":42});validate(&doc.to_string()).unwrap();
    for(key,value)in [("durationMs",serde_json::json!(299)),("direction",serde_json::json!(4)),("shape",serde_json::json!(2)),("feather",serde_json::json!(0.31)),("code",serde_json::json!("alert(1)"))]{let mut bad=doc.clone();bad["pages"][0]["transition"]["params"][key]=value;assert!(validate(&bad.to_string()).is_err(),"{key}");}
    for(key,value)in [("id",serde_json::json!("action-1")),("templateId",serde_json::json!("background.flowing-gradient")),("targetId",serde_json::json!("title-1"))]{let mut bad=doc.clone();bad["pages"][0]["transition"][key]=value;assert!(validate(&bad.to_string()).is_err(),"{key}");}
}

#[test]
fn p2_text_candidates_validate_each_parameter_and_reject_image_targets() {
    let registry:serde_json::Value=serde_json::from_str(include_str!("../../src/motion/registry.json")).unwrap();
    let fixture:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
    let mut count=0;
    for (id,template) in registry["templates"].as_object().unwrap(){
        if !id.starts_with("text.")||id=="text.glyph-particles"{continue;}
        count+=1;let rules=template["params"].as_object().unwrap();let params=rules.iter().map(|(key,rule)|(key.clone(),rule["default"].clone())).collect::<serde_json::Map<_,_>>();let mut doc=fixture.clone();doc["pages"][0]["actions"][0]["templateId"]=id.clone().into();doc["pages"][0]["actions"][0]["params"]=params.into();validate(&doc.to_string()).unwrap();
        for (key,rule) in rules {let mut bad=doc.clone();bad["pages"][0]["actions"][0]["params"][key]=(rule["max"].as_f64().unwrap()+1.).into();assert!(validate(&bad.to_string()).is_err(),"{id} {key}");}
        let target=doc["pages"][0]["actions"][0]["targetId"].as_str().unwrap().to_string();for item in doc["pages"][0]["targets"].as_array_mut().unwrap(){if item["id"]==target{item["kind"]="image".into();}}assert!(validate(&doc.to_string()).is_err(),"{id} image");
    }
    assert_eq!(count,16);
}

#[test]
fn stage_spotlight_keeps_legacy_parameters_and_bounds_new_controls() {
 let mut doc:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
 let action=&mut doc["pages"][0]["actions"][0];action["templateId"]=serde_json::json!("emphasis.spotlight");action["params"]=serde_json::json!({"durationMs":1800,"strength":1});validate(&doc.to_string()).unwrap();
 for direction in 0..4 {doc["pages"][0]["actions"][0]["params"]=serde_json::json!({"durationMs":2400,"strength":1.5,"direction":direction,"radiusScale":1.4});validate(&doc.to_string()).unwrap();}
 for (key,value) in [("direction",4.0),("direction",1.5),("radiusScale",0.59),("radiusScale",2.01)] {let mut bad=doc.clone();bad["pages"][0]["actions"][0]["params"][key]=serde_json::json!(value);assert!(validate(&bad.to_string()).is_err(),"{key}");}
}

#[test]
fn fragment_pair_accepts_text_and_images_and_bounds_parameters() {
 let original:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
 for template in ["entrance.fragment-assemble","exit.fragment-fall"] {for kind in ["text","image"] {
  let mut doc=original.clone();let target=doc["pages"][0]["actions"][0]["targetId"].as_str().unwrap().to_string();
  for entry in doc["pages"][0]["targets"].as_array_mut().unwrap(){if entry["id"].as_str()==Some(&target){entry["kind"]=serde_json::json!(kind);}}
  doc["pages"][0]["actions"][0]["templateId"]=serde_json::json!(template);doc["pages"][0]["actions"][0]["params"]=serde_json::json!({"durationMs":1600,"pieces":48,"strength":1});validate(&doc.to_string()).unwrap();
  for (key,value) in [("pieces",7.0),("pieces",161.0),("pieces",48.5),("strength",0.0),("durationMs",6001.0)] {let mut bad=doc.clone();bad["pages"][0]["actions"][0]["params"][key]=serde_json::json!(value);assert!(validate(&bad.to_string()).is_err(),"{template} {key}");}
 }}
}

#[test]
fn fold_exit_bounds_direction_and_perspective() {
 let mut doc:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();doc["pages"][0]["actions"][0]["templateId"]=serde_json::json!("exit.fold-close");
 for axis in 0..2 {doc["pages"][0]["actions"][0]["params"]=serde_json::json!({"durationMs":1400,"axis":axis,"perspective":1.6});validate(&doc.to_string()).unwrap();}
 for (key,value) in [("axis",2.0),("axis",0.5),("perspective",0.59),("perspective",3.01)] {let mut bad=doc.clone();bad["pages"][0]["actions"][0]["params"][key]=serde_json::json!(value);assert!(validate(&bad.to_string()).is_err(),"{key}");}
}

#[test]
fn scene_backgrounds_bound_parameters_and_reject_action_slot() {
 let original:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
 let registry:serde_json::Value=serde_json::from_str(include_str!("../../src/motion/registry.json")).unwrap();
 for (id,invalid) in [("background.aurora",vec![("layers",1.5),("layers",6.0),("bandWidth",0.34),("strength",0.71)]),("background.drifting-particles",vec![("density",20.5),("direction",4.0),("depth",3.01),("size",0.9)])] {
  let params=registry["templates"][id]["params"].as_object().unwrap().iter().map(|(key,rule)|(key.clone(),rule["default"].clone())).collect::<serde_json::Map<_,_>>();
  let mut doc=original.clone();doc["pages"][0]["background"]=serde_json::json!({"id":"scene-bg","templateId":id,"templateVersion":1,"params":params,"seed":42});validate(&doc.to_string()).unwrap();
  for (key,value) in invalid {let mut bad=doc.clone();bad["pages"][0]["background"]["params"][key]=serde_json::json!(value);assert!(validate(&bad.to_string()).is_err(),"{id} {key}");}
  doc["pages"][0]["actions"][0]["templateId"]=serde_json::json!(id);assert!(validate(&doc.to_string()).is_err(),"background cannot become object action");
 }
}

#[test]
fn quiet_backgrounds_validate_modes_and_material_parameters() {
 let original:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
 let registry:serde_json::Value=serde_json::from_str(include_str!("../../src/motion/registry.json")).unwrap();
 for key in ["silk","dark-veil","threads","side-rays","topography","gradient-waves"] {let id=format!("background.{key}");let params=registry["templates"][&id]["params"].as_object().unwrap().iter().map(|(k,r)|(k.clone(),r["default"].clone())).collect::<serde_json::Map<_,_>>();let mut doc=original.clone();doc["pages"][0]["background"]=serde_json::json!({"id":"quiet-bg","templateId":id,"templateVersion":1,"params":params,"seed":42});validate(&doc.to_string()).unwrap();
  for(key,value)in [("motion",2.0),("motion",0.5),("position",4.0),("strength",0.81),("scale",0.49)]{let mut bad=doc.clone();bad["pages"][0]["background"]["params"][key]=serde_json::json!(value);assert!(validate(&bad.to_string()).is_err(),"{id} {key}");}
  let mut bad=doc.clone();bad["pages"][0]["background"]["params"]["detail"]=serde_json::json!(registry["templates"][&id]["params"]["detail"]["max"].as_f64().unwrap()+1.0);assert!(validate(&bad.to_string()).is_err());
  doc["pages"][0]["background"]["params"]["motion"]=serde_json::json!(0);validate(&doc.to_string()).unwrap();
 }
}

#[test]
fn p3_page_transitions_validate_all_parameter_bounds() {
    let fixture:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
    let registry:serde_json::Value=serde_json::from_str(include_str!("../../src/motion/registry.json")).unwrap();
    for id in ["transition.parallax","transition.depth-travel","transition.grain-dissolve","transition.smooth-push","transition.cube-rotate","transition.page-flip","transition.layered-slices"] {
        let rules=registry["templates"][id]["params"].as_object().unwrap();
        let params=rules.iter().map(|(key,rule)|(key.clone(),rule["default"].clone())).collect::<serde_json::Map<_,_>>();
        let mut doc=fixture.clone();doc["pages"][0]["transition"]=serde_json::json!({"id":"p3-transition","templateId":id,"templateVersion":1,"params":params,"seed":42});validate(&doc.to_string()).unwrap();
        for (key,rule) in rules {
            for value in [rule["min"].as_f64().unwrap()-1.,rule["max"].as_f64().unwrap()+1.] {
                let mut bad=doc.clone();bad["pages"][0]["transition"]["params"][key]=value.into();assert!(validate(&bad.to_string()).is_err(),"{id} {key}");
            }
        }
        let mut bad=doc.clone();bad["pages"][0]["transition"]["params"]["injected"]=1.into();assert!(validate(&bad.to_string()).is_err());
        let mut bad=doc.clone();let effect=bad["pages"][0]["transition"].take();bad["pages"][0]["background"]=effect;assert!(validate(&bad.to_string()).is_err());
    }
}

#[test]
fn simple_exits_accept_text_images_and_reject_invalid_parameters() {
 let fixture:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
 let registry:serde_json::Value=serde_json::from_str(include_str!("../../src/motion/registry.json")).unwrap();
 for id in ["exit.blur-away","exit.directional-wipe","exit.depth-away"] {
  let rules=registry["templates"][id]["params"].as_object().unwrap();
  let params=rules.iter().map(|(k,r)|(k.clone(),r["default"].clone())).collect::<serde_json::Map<_,_>>();
  let mut doc=fixture.clone();doc["pages"][0]["actions"][0]["templateId"]=id.into();doc["pages"][0]["actions"][0]["params"]=params.into();validate(&doc.to_string()).unwrap();
  for (key,rule) in rules {for value in [rule["min"].as_f64().unwrap()-1.,rule["max"].as_f64().unwrap()+1.] {let mut bad=doc.clone();bad["pages"][0]["actions"][0]["params"][key]=value.into();assert!(validate(&bad.to_string()).is_err(),"{id} {key}");}}
  let target=doc["pages"][0]["actions"][0]["targetId"].as_str().unwrap().to_string();for item in doc["pages"][0]["targets"].as_array_mut().unwrap(){if item["id"]==target{item["kind"]="image".into();}}validate(&doc.to_string()).unwrap();
  doc["pages"][0]["actions"][0]["params"]["injected"]=1.into();assert!(validate(&doc.to_string()).is_err());
 }
}

#[test]
fn page_curl_is_image_only_and_bounds_its_parameters() {
 let mut doc:serde_json::Value=serde_json::from_str(include_str!("../../tests/fixtures/motion/valid.json")).unwrap();
 doc["pages"][0]["actions"][0]["templateId"]="exit.page-curl".into();doc["pages"][0]["actions"][0]["params"]=serde_json::json!({"durationMs":1600,"direction":0,"curl":0.1});assert!(validate(&doc.to_string()).is_err());
 let target=doc["pages"][0]["actions"][0]["targetId"].as_str().unwrap().to_string();for t in doc["pages"][0]["targets"].as_array_mut().unwrap(){if t["id"]==target{t["kind"]="image".into();}}validate(&doc.to_string()).unwrap();
 for(key,value)in [("durationMs",499.),("durationMs",4001.),("direction",2.),("direction",0.5),("curl",0.03),("curl",0.21)] {let mut bad=doc.clone();bad["pages"][0]["actions"][0]["params"][key]=value.into();assert!(validate(&bad.to_string()).is_err(),"{key}");}
}
