//! Logical desktop geometry, independent of native fullscreen transitions.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {pub x:f64,pub y:f64,pub width:f64,pub height:f64}
impl Rect {
 pub fn fit(self,area:Rect)->Rect {let width=self.width.min(area.width).max(1.0);let height=self.height.min(area.height).max(1.0);Rect{x:self.x.clamp(area.x,area.x+area.width-width),y:self.y.clamp(area.y,area.y+area.height-height),width,height}}
}
#[derive(Debug,Clone)]
pub struct Display {pub key:String,pub area:Rect,pub primary:bool}
#[derive(Debug,Clone)]
pub struct Snapshot {pub display_key:String,pub relative:Rect}
impl Snapshot {
 pub fn capture(display:&Display,window:Rect)->Self {Self{display_key:display.key.clone(),relative:Rect{x:window.x-display.area.x,y:window.y-display.area.y,..window}}}
 pub fn restore(&self,displays:&[Display])->Option<Rect>{let mut matches=displays.iter().filter(|d|d.key==self.display_key);let first=matches.next();let unique=if matches.next().is_none(){first}else{None};let display=unique.or_else(||displays.iter().find(|d|d.primary)).or(displays.first())?;Some(Rect{x:display.area.x+self.relative.x,y:display.area.y+self.relative.y,..self.relative}.fit(display.area))}
}
pub fn logical_rect(x:i32,y:i32,width:u32,height:u32,scale:f64)->Rect {Rect{x:x as f64/scale,y:y as f64/scale,width:width as f64/scale,height:height as f64/scale}}
#[cfg(test)] mod tests {
 use super::*;
 fn display(key:&str,x:f64,y:f64,width:f64,height:f64,primary:bool)->Display{Display{key:key.into(),area:Rect{x,y,width,height},primary}}
 #[test]fn mixed_dpi_and_negative_coordinates(){assert_eq!(logical_rect(-3840,-2160,3840,2160,2.0),Rect{x:-1920.,y:-1080.,width:1920.,height:1080.});}
 #[test]fn reordered_displays_keep_identity(){let a=display("a",0.,0.,1470.,956.,true);let b=display("b",1470.,0.,1920.,1080.,false);let saved=Snapshot::capture(&a,Rect{x:221.,y:33.,width:1249.,height:856.});assert_eq!(saved.restore(&[b,a]).unwrap().x,221.);}
 #[test]fn moved_original_display_preserves_relative_position(){let a=display("a",0.,0.,1470.,956.,true);let saved=Snapshot::capture(&a,Rect{x:20.,y:30.,width:600.,height:400.});let moved=display("a",-1920.,-1080.,1920.,1080.,false);let r=saved.restore(&[moved]).unwrap();assert_eq!((r.x,r.y),(-1900.,-1050.));}
 #[test]fn disconnected_original_falls_back_to_primary_and_fits(){let a=display("a",0.,0.,2940.,1912.,false);let saved=Snapshot::capture(&a,Rect{x:1000.,y:800.,width:1800.,height:1000.});let b=display("b",-800.,0.,800.,600.,true);assert_eq!(saved.restore(&[b]).unwrap(),Rect{x:-800.,y:0.,width:800.,height:600.});}
 #[test]fn smaller_same_display_is_clamped(){let a=display("a",0.,0.,1920.,1080.,true);let saved=Snapshot::capture(&a,Rect{x:1200.,y:700.,width:600.,height:350.});let small=display("a",0.,0.,1280.,720.,true);assert_eq!(saved.restore(&[small]).unwrap(),Rect{x:680.,y:370.,width:600.,height:350.});}
 #[test]fn ambiguous_names_fall_back_to_primary(){let saved=Snapshot{display_key:"same".into(),relative:Rect{x:10.,y:10.,width:100.,height:100.}};let other=display("same",-1000.,0.,1000.,800.,false);let primary=display("same",0.,0.,1000.,800.,true);assert_eq!(saved.restore(&[other,primary]).unwrap().x,10.);}
 #[test]fn no_display_does_not_invent_geometry(){let saved=Snapshot{display_key:"a".into(),relative:Rect{x:0.,y:0.,width:800.,height:600.}};assert_eq!(saved.restore(&[]),None);}
}
