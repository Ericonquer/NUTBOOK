//! Durable history primitives. This module deliberately has no implicit source
//! writer: callers must supply an authorized path and complete snapshots.
//! UI/save integration must not enable it until resource capture is complete.
mod storage;
pub use storage::*;

mod capture;
pub use capture::{capture_markdown, CapturedMarkdown};

mod markdown_projection;
pub use markdown_projection::relocate_markdown;
