//! Durable history primitives. This module deliberately has no implicit source
//! writer: callers must supply an authorized path and complete snapshots.
//! UI/save integration must not enable it until resource capture is complete.
mod storage;
pub use storage::*;

mod capture;
pub use capture::{image_references, capture_markdown, CapturedMarkdown, CapturedDocument};

mod markdown_projection;
pub use markdown_projection::relocate_markdown;

mod html_capture;
pub use html_capture::{capture_html, CapturedHtml};

mod html_projection;

pub(crate) use html_capture::{relocate_css as relocate_html_css, relocate_modules as relocate_html_modules};
mod html_restore;
