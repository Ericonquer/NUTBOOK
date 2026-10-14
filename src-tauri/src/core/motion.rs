//! Data-only v1 boundary; source DOM identity is checked by the HTML commit layer.
use crate::errors::AppError;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const MAX_RUNTIME_BYTES: usize = 2 * 1024 * 1024;
pub const MAX_HTML_BYTES: usize = 3 * 1024 * 1024;
pub fn validate_generated_resources(runtime: &str, html: &str) -> Result<(), AppError> {
    for (name, bytes, limit) in [("motion runtime", runtime.len(), MAX_RUNTIME_BYTES), ("HTML", html.len(), MAX_HTML_BYTES)] {
        if bytes > limit { return Err(AppError::MotionResourceBudgetExceeded(format!("{name}: {bytes} bytes, limit {limit} bytes"))); }
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MotionDocument { pub contract: String, pub pages: Vec<MotionPage> }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MotionPage {
    pub id: String, pub capabilities: Capabilities, pub targets: Vec<Target>,
    pub actions: Vec<Action>, pub background: Option<serde_json::Value>, pub transition: Option<serde_json::Value>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Capabilities {
    pub contains_video: bool, pub contains_embedded_frame: bool,
    pub supports_dom_transition: bool, pub supports_filter_transition: bool,
    pub media_target_ids: Vec<String>, pub embedded_target_ids: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Target { pub id: String, pub kind: String }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Action {
    pub id: String, pub target_id: String, pub template_id: String, pub template_version: u32,
    pub params: BTreeMap<String, f64>, pub seed: u32, pub trigger: String, pub delay_ms: f64,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PageEffect {pub id:String,pub template_id:String,pub template_version:u32,pub params:BTreeMap<String,f64>,pub seed:u32}
fn validate_parameters(values:&BTreeMap<String,f64>,template:&serde_json::Value)->Result<(),AppError>{
 let params=template["params"].as_object().ok_or(AppError::InvalidParams)?;
 if values.keys().any(|key|!params.contains_key(key)){return Err(AppError::InvalidParams);}
 for(key,rule)in params{let number=match values.get(key){Some(value)=>*value,None if rule["optional"].as_bool()==Some(true)=>rule["default"].as_f64().ok_or(AppError::InvalidParams)?,None=>return Err(AppError::InvalidParams)};if !number.is_finite()||number<rule["min"].as_f64().ok_or(AppError::InvalidParams)?||number>rule["max"].as_f64().ok_or(AppError::InvalidParams)?||(rule["integer"].as_bool()==Some(true)&&number.fract()!=0.0){return Err(AppError::InvalidParams);}}
 Ok(())
}
fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 80 && id.bytes().all(|c| c.is_ascii_alphanumeric() || b"-_:".contains(&c))
}
pub fn validate(text: &str) -> Result<MotionDocument, AppError> {
    let invalid = || AppError::InvalidParams;
    if text.len() > 262144 { return Err(invalid()); }
    // Require nullable slots explicitly; serde Option alone accepts missing keys.
    let value: serde_json::Value = serde_json::from_str(text).map_err(|_| invalid())?;
    for page in value.get("pages").and_then(|v| v.as_array()).ok_or_else(invalid)? {
        if page.get("background").is_none() || page.get("transition").is_none() { return Err(invalid()); }
    }
    let document: MotionDocument = serde_json::from_value(value).map_err(|_| invalid())?;
    let registry: serde_json::Value = serde_json::from_str(include_str!("../../../src/motion/registry.json")).map_err(|_| AppError::InternalError)?;
    if document.contract != "nutbook-motion/v1" || document.pages.is_empty() || document.pages.len() > 128 { return Err(invalid()); }
    let mut pages = BTreeSet::new(); let mut targets = BTreeSet::new(); let mut actions = BTreeSet::new();
    for page in &document.pages {
        if !valid_id(&page.id) || !pages.insert(&page.id) || page.targets.len() > 256 || page.actions.len() > 256
             { return Err(invalid()); }
        let mut local = BTreeMap::new();
        for target in &page.targets {
            if !valid_id(&target.id) || !targets.insert(&target.id) || !["text", "image", "group", "video", "embedded"].contains(&target.kind.as_str()) { return Err(invalid()); }
            local.insert(target.id.as_str(), target.kind.as_str());
        }
        for (ids, kind, present) in [(&page.capabilities.media_target_ids, "video", page.capabilities.contains_video), (&page.capabilities.embedded_target_ids, "embedded", page.capabilities.contains_embedded_frame)] {
            let set: BTreeSet<_> = ids.iter().map(String::as_str).collect();
            if ids.len() > 256 || set.len() != ids.len() || present != !ids.is_empty()
                || set.iter().any(|id| local.get(id) != Some(&kind))
                || local.iter().any(|(id, k)| *k == kind && !set.contains(id)) { return Err(invalid()); }
        }
        for(slot,value)in [("background",&page.background),("transition",&page.transition)]{if let Some(value)=value{let effect:PageEffect=serde_json::from_value(value.clone()).map_err(|_|invalid())?;let template=&registry["templates"][&effect.template_id];if !valid_id(&effect.id)||!actions.insert(effect.id.clone())||template["category"].as_str()!=Some(slot)||template["version"].as_u64()!=Some(effect.template_version as u64){return Err(invalid());}validate_parameters(&effect.params,template)?;}}
        let mut slots = BTreeSet::new();
        for action in &page.actions {
            let template = &registry["templates"][&action.template_id];
            let kind = local.get(action.target_id.as_str()).ok_or_else(invalid)?;
            if !valid_id(&action.id) || !actions.insert(action.id.clone())
                || template["version"].as_u64() != Some(action.template_version as u64)
                || !template["targets"].as_array().ok_or_else(invalid)?.iter().any(|v| v.as_str() == Some(kind))
                || !slots.insert((&action.target_id, match template["category"].as_str().ok_or_else(invalid)? {"text"=>"entrance",category=>category}))
                || !["click", "withPrevious", "afterPrevious"].contains(&action.trigger.as_str())
                || !action.delay_ms.is_finite() || !(0.0..=60000.0).contains(&action.delay_ms) { return Err(invalid()); }
            validate_parameters(&action.params,template)?;
        }
    }
    Ok(document)
}
