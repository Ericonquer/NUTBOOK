use crate::{errors::AppError,state::AppState};
use serde::{Deserialize,Serialize};
use serde_json::{json,Value};
use std::{collections::BTreeMap,fs,io::Write,path::Path,sync::Mutex};
static LOCK:Mutex<()>=Mutex::new(());
#[derive(Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct Request {item_id:i64,runtime_session_id:String,generation:u64,operation:String,template_id:Option<String>,value:Option<Value>}
#[derive(Default,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
struct Preferences {favorites:BTreeMap<String,bool>,defaults:BTreeMap<String,Value>}
fn registry()->Value {serde_json::from_str(include_str!("../../../src/motion/registry.json")).unwrap()}
fn valid_default(value:&Value,template:&Value)->bool {
 if !value.as_object().is_some_and(|v|v.len()==2&&v.contains_key("version")&&v.contains_key("params")){return false;}
 if value["version"]!=template["version"] {return false;}
 let Ok(params)=serde_json::from_value::<BTreeMap<String,f64>>(value["params"].clone()) else{return false;};
 crate::core::motion::validate_parameters(&params,template).is_ok()
}
fn read(path:&Path)->Result<Preferences,AppError>{
 if !path.exists(){return Ok(Preferences::default());}
 let bytes=fs::read(path).map_err(|_|AppError::IoError)?;
 if bytes.len()>131072{return Err(AppError::InvalidParams);}
 serde_json::from_slice(&bytes).map_err(|_|AppError::InvalidParams)
}
fn operate(path:&Path,op:&str,id:Option<&str>,value:Option<Value>)->Result<Value,AppError>{
 let _lock=LOCK.lock().map_err(|_|AppError::InternalError)?;
 let mut prefs=read(path)?;let registry=registry();let mut reset=false;
 prefs.defaults.retain(|id,value|{let valid=valid_default(value,&registry["templates"][id]);reset|=!valid;valid});
 prefs.favorites.retain(|id,_|registry["templates"][id].is_object());
 if op!="load" {
  let id=id.ok_or(AppError::InvalidParams)?;let template=&registry["templates"][id];
  if !template.is_object()||template["catalog"]==false{return Err(AppError::InvalidParams);}
  match op {
   "favorite"=>{let enabled=value.and_then(|v|v.as_bool()).ok_or(AppError::InvalidParams)?;if enabled{prefs.favorites.insert(id.into(),true);}else{prefs.favorites.remove(id);}},
   "default"=>{let value=value.ok_or(AppError::InvalidParams)?;if !valid_default(&value,template){return Err(AppError::InvalidParams);}prefs.defaults.insert(id.into(),value);},
   "reset"=>{prefs.defaults.remove(id);},_=>return Err(AppError::InvalidParams)
  }
  fs::create_dir_all(path.parent().ok_or(AppError::IoError)?).map_err(|_|AppError::IoError)?;
  let temp=path.with_extension(format!("{}.tmp",uuid::Uuid::new_v4()));
  let result=(||{let mut file=fs::OpenOptions::new().write(true).create_new(true).open(&temp).map_err(|_|AppError::IoError)?;file.write_all(&serde_json::to_vec(&prefs).map_err(|_|AppError::InvalidParams)?).map_err(|_|AppError::IoError)?;file.sync_all().map_err(|_|AppError::IoError)?;fs::rename(&temp,path).map_err(|_|AppError::IoError)})();
  if result.is_err(){let _=fs::remove_file(temp);}result?;
 }
 Ok(json!({"favorites":prefs.favorites,"defaults":prefs.defaults,"resetIncompatible":reset}))
}
#[tauri::command]
pub fn motion_preferences(webview:tauri::Webview,state:tauri::State<'_,AppState>,payload:Request)->Result<Value,AppError>{
 if let Some(record)=super::preview::content_session_record(&state,&webview)?{if record.key.item_id()!=Some(payload.item_id){return Err(AppError::InvalidSession);}}
 if !state.html_edit_session_lease_matches(payload.item_id,&payload.runtime_session_id,payload.generation)?{return Err(AppError::InvalidSession);}
 operate(&state.app_data_dir.join("motion-preferences.json"),&payload.operation,payload.template_id.as_deref(),payload.value)
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn preferences_are_independent_atomic_and_validated(){let dir=tempfile::tempdir().unwrap();let path=dir.path().join("prefs.json");operate(&path,"favorite",Some("exit.page-curl"),Some(json!(true))).unwrap();let registry=registry();let t=&registry["templates"]["exit.page-curl"];let params:serde_json::Map<String,Value>=t["params"].as_object().unwrap().iter().map(|(k,v)|(k.clone(),v["default"].clone())).collect();operate(&path,"default",Some("exit.page-curl"),Some(json!({"version":t["version"],"params":params}))).unwrap();let result=operate(&path,"load",None,None).unwrap();assert_eq!(result["favorites"]["exit.page-curl"],true);assert!(result["defaults"]["exit.page-curl"].is_object());let before=fs::read(&path).unwrap();assert!(operate(&path,"default",Some("exit.page-curl"),Some(json!({"version":1,"params":{"durationMs":-1}}))).is_err());assert_eq!(before,fs::read(&path).unwrap());let result=operate(&path,"reset",Some("exit.page-curl"),None).unwrap();assert!(result["defaults"]["exit.page-curl"].is_null());assert_eq!(result["favorites"]["exit.page-curl"],true);}
}
