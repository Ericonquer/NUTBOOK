use nutbook_backend::core::{agent_output_manifest::read_agent_output_manifest, external_open::{supported_external_path,supported_markdown_path}, library::select_or_create_library, scanner::{scan_file_source,scan_library_files}, traversal::{preflight_folder,TraversalPolicy,PreflightProgress,is_history_resource_path}};
use std::{fs,path::Path};

#[test]
fn recovered_resources_are_assets_not_importable_sources_even_via_aliases() {
 let root=tempfile::tempdir().unwrap();
 let bundle=root.path().join(".nutbook-restored-test");fs::create_dir(&bundle).unwrap();
 let resource=bundle.join("module.html");fs::write(&resource,"<h1>Resource</h1>").unwrap();
 let primary=root.path().join("book.md");fs::write(&primary,"![asset](.nutbook-restored-test/module.html)").unwrap();
 assert!(is_history_resource_path(&resource));
 assert!(!supported_external_path(&resource));
 assert!(!supported_markdown_path(&bundle.join("a.md")));
 assert!(scan_file_source(1,resource.to_str().unwrap(),"now").is_err());
 assert!(select_or_create_library(&[],resource.to_str().unwrap(),None,"file",1,"now").is_err());
 assert!(preflight_folder(bundle.to_str().unwrap(),&TraversalPolicy::default(),&PreflightProgress::default()).fatal.is_some());
 assert_eq!(scan_library_files(1,root.path().to_str().unwrap(),"now").unwrap().len(),1);
 #[cfg(unix)] {
  let alias=root.path().join("alias.html");std::os::unix::fs::symlink(&resource,&alias).unwrap();
  assert!(is_history_resource_path(&alias));assert!(!supported_external_path(&alias));
  assert!(scan_file_source(1,alias.to_str().unwrap(),"now").is_err());
  assert!(select_or_create_library(&[],alias.to_str().unwrap(),None,"file",1,"now").is_err());
 }
 // Direct manifest declarations cannot elevate a resource into a primary
 // artifact, but legitimate primary documents may still reference assets.
 fs::create_dir(root.path().join(".agent-outputs")).unwrap();
 let write=|primary:&str,related:bool| {
  let mut entry=serde_json::json!({"id":"book","path":primary,"state":"active","kind":"document","skill":{"name":"test"}});
  if primary.ends_with("html") {entry["editContract"]="nutbook-html/v1".into();entry["savePolicy"]="managed-source".into();}
  if related {entry["relatedFiles"]=serde_json::json!([{"path":".nutbook-restored-test/module.html","role":"asset"}]);}
  fs::write(root.path().join(".agent-outputs/manifest.json"),serde_json::to_vec(&serde_json::json!({"schemaVersion":1,"projectRoot":".","entries":[entry]})).unwrap()).unwrap();
 };
 write("book.md",true);assert!(read_agent_output_manifest(root.path()).is_ok());
 write(".nutbook-restored-test/module.html",false);assert!(read_agent_output_manifest(root.path()).is_err());
 #[cfg(unix)] {write("alias.html",false);assert!(read_agent_output_manifest(root.path()).is_err());}
 assert!(Path::new(&resource).exists(),"no resource file is deleted");
}
