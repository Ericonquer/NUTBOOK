//! Runs the real card and presenter screenshot backends against a temporary fixture.
use std::{env,fs,path::{Path,PathBuf}};
use nutbook_backend::core::{scoped_content_server::ScopedContentServer,thumbnail::{capture_html_thumbnail_with_chromium,capture_presentation_thumbnail_with_chromium,ChromiumScreenshotInput,PresentationScreenshotInput,static_capture_html}};
fn main(){
 let args:Vec<String>=env::args().collect();let source=Path::new(&args[1]).canonicalize().unwrap();let chrome=PathBuf::from(&args[2]);let out=Path::new(&args[3]);fs::create_dir_all(out).unwrap();
 let server=ScopedContentServer::start(source.parent().unwrap()).unwrap();let url=server.relative_url(Path::new(source.file_name().unwrap())).unwrap();
 fs::write(out.join("static.html"),static_capture_html(&fs::read(&source).unwrap())).unwrap();
 let card=capture_html_thumbnail_with_chromium(ChromiumScreenshotInput{chromium_path:chrome.clone(),url:url::Url::from_file_path(&source).unwrap().to_string(),width:1280,height:720}).unwrap();fs::write(out.join("card.png"),card.bytes).unwrap();
 for page in args[4].split(',') { let image=capture_presentation_thumbnail_with_chromium(PresentationScreenshotInput{chromium_path:chrome.clone(),url:url.clone(),page_id:page.into(),width:1280,height:720,pixel_ratio:1}).unwrap();fs::write(out.join(format!("{page}.png")),image.bytes).unwrap(); }
 println!("{}",out.display());
}
