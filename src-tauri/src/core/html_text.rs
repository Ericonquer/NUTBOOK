//! HTML text used for library search. It is semantic parser output, not a
//! WebView rendering claim: CSS-hidden and runtime-inserted text are outside
//! this index by design.

use html5ever::{parse_document, tendril::TendrilSink};
use markup5ever_rcdom::{Handle, NodeData, RcDom};

pub fn extract_indexable_html_text(source: &str) -> String {
    let dom: RcDom = parse_document(RcDom::default(), Default::default()).one(source);
    let mut parts = Vec::new();
    collect(&dom.document, false, &mut parts);
    parts.join(" ").split_whitespace().collect::<Vec<_>>().join(" ")
}

fn collect(handle: &Handle, excluded: bool, parts: &mut Vec<String>) {
    let excluded = excluded || matches!(&handle.data,
        NodeData::Element { name, .. } if matches!(name.local.as_ref(), "head" | "script" | "style" | "template" | "noscript")
    );
    if !excluded {
        if let NodeData::Text { contents } = &handle.data {
            let value = contents.borrow();
            if !value.trim().is_empty() { parts.push(value.to_string()); }
        }
    }
    for child in handle.children.borrow().iter() { collect(child, excluded, parts); }
}

#[cfg(test)]
mod tests {
    use super::extract_indexable_html_text;

    #[test]
    fn excludes_non_semantic_subtrees_and_decodes_entities() {
        let text = extract_indexable_html_text("<head><title>head 私词</title></head><body><p>松塔 &amp; 协议</p><script>脚本私词</script><style>.x{}</style><template>模板私词</template><!-- 注释私词 --><noscript>后备私词</noscript></body>");
        assert_eq!(text, "松塔 & 协议");
    }

    #[test]
    fn tolerates_malformed_html() {
        assert_eq!(extract_indexable_html_text("<main>第一段<p>第二段"), "第一段 第二段");
    }
}
