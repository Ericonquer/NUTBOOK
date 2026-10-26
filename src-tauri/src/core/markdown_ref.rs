//! Markdown 图片引用的单次编码合同（W02-R1）。
//!
//! 引用（Markdown `![](...)` / HTML `<img src="...">`）是 URI reference：
//! **每个路径段恰好一次 percent-encoding**，OS 文件名 = 解码一次的结果。
//! 因此 `report#1.png` 写进正文是 `./assets/report%231.png`，`report%23.png`
//! 是 `./assets/report%2523.png`；读取侧各自只解码一次，`#` 永远不是 fragment
//! 分隔符，字面 `%23` 也不会被二次解码成 `#`。
//!
//! 两个方向的唯一实现都在这里，避免复制/粘贴/持久化/读取/历史资源/封面
//! 各自发挥：
//! - 生产者：`encode_ref_segment`（单个文件名段）。
//! - 消费者：`decode_relative_ref`（引用 → OS 相对路径，`/` 分隔）。
//!
//! 解码后仍拒绝绝对路径、scheme，以及解码出分隔符或 NUL 的段（编码不能
//! 重建目录穿越）。`..` 原样保留，越界由下游 `canonicalize` 校验拒绝，
//! 不在这里做词法裁剪，避免改变既有"引用存在性由磁盘裁决"的语义。

/// URI unreserved 字符：`A-Z a-z 0-9 - . _ ~`。
fn is_unreserved(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~')
}

/// 单个路径段 → URI 段：只保留 unreserved，其余按 UTF-8 字节编码一次。
pub fn encode_ref_segment(segment: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";
    let mut encoded = String::with_capacity(segment.len());
    for &byte in segment.as_bytes() {
        if is_unreserved(byte) {
            encoded.push(byte as char);
            continue;
        }
        encoded.push('%');
        encoded.push(HEX[(byte >> 4) as usize] as char);
        encoded.push(HEX[(byte & 0x0f) as usize] as char);
    }
    encoded
}

/// URI reference 的 fragment / query 分隔符之前的部分。
pub fn strip_fragment_and_query(raw: &str) -> &str {
    match raw.find(['#', '?']) {
        Some(index) => raw.get(..index).unwrap_or(""),
        None => raw,
    }
}

/// 单段 percent-decode；非法转义按字面保留（例如文件名字面含 `%`）。
fn decode_segment(segment: &str) -> Option<String> {
    if !segment.contains('%') {
        return Some(segment.to_string());
    }
    let bytes = segment.as_bytes();
    let mut decoded: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut index = 0usize;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            let high = (bytes[index + 1] as char).to_digit(16);
            let low = (bytes[index + 2] as char).to_digit(16);
            if let (Some(high), Some(low)) = (high, low) {
                decoded.push((high * 16 + low) as u8);
                index += 3;
                continue;
            }
        }
        decoded.push(bytes[index]);
        index += 1;
    }
    String::from_utf8(decoded).ok()
}

/// 引用 → OS 相对路径（`/` 分隔，每段解码恰好一次）。
///
/// 返回 `None` 表示这条引用不是本应用的本地相对资源：空、绝对路径、
/// `data:`/`blob:`/`file:`/带 scheme，或某段解码后含 `/` `\` NUL。
/// 输入的 `./` 前缀原样保留（既有调用方用它做集合键）。
pub fn decode_relative_ref(raw: &str) -> Option<String> {
    let (keep_alias, segments) = relative_ref_segments(raw, true)?;
    Some(join_relative(keep_alias, &segments))
}

/// 引用 → **字面** OS 相对路径（不 percent-decode）。
///
/// 历史文档里的 `assets/report%23.png` 指的是磁盘上就叫 `report%23.png`
/// 的文件。这条候选只用于和磁盘事实对照，不单独作为唯一解。
pub fn literal_relative_ref(raw: &str) -> Option<String> {
    let (keep_alias, segments) = relative_ref_segments(raw, false)?;
    Some(join_relative(keep_alias, &segments))
}

/// 切 fragment/query、统一分隔符、拒绝非本地引用，再按 `decode` 逐段处理。
fn relative_ref_segments(raw: &str, decode: bool) -> Option<(bool, Vec<String>)> {
    let trimmed = strip_fragment_and_query(raw.trim()).trim();
    if trimmed.is_empty() {
        return None;
    }
    let normalized = trimmed.replace('\\', "/");
    if normalized.starts_with('/') || normalized.contains("://") {
        return None;
    }
    let lower = normalized.to_ascii_lowercase();
    if lower.starts_with("data:") || lower.starts_with("blob:") || lower.starts_with("file:") {
        return None;
    }
    let keep_alias = normalized.starts_with("./");
    let mut segments: Vec<String> = Vec::new();
    for raw_segment in normalized.split('/') {
        if raw_segment.is_empty() {
            continue;
        }
        let segment = if decode {
            decode_segment(raw_segment)?
        } else {
            raw_segment.to_string()
        };
        if segment.is_empty() || segment == "." {
            continue;
        }
        if segment != ".."
            && (segment.contains('/') || segment.contains('\\') || segment.contains('\0'))
        {
            return None;
        }
        segments.push(segment);
    }
    if segments.is_empty() {
        return None;
    }
    Some((keep_alias, segments))
}

fn join_relative(keep_alias: bool, segments: &[String]) -> String {
    let joined = segments.join("/");
    if keep_alias && !joined.starts_with("./") && !joined.starts_with("../") && joined != ".." {
        return format!("./{joined}");
    }
    joined
}

/// 相对串 → 具体候选路径。跳过 `.`，保留 `..`（越界由下游 canonicalize 裁决）。
fn candidate_path(base_dir: &std::path::Path, relative: &str) -> std::path::PathBuf {
    let mut path = base_dir.to_path_buf();
    for segment in relative.split('/') {
        if segment.is_empty() || segment == "." {
            continue;
        }
        path.push(segment);
    }
    path
}

/// 引用在磁盘上的裁决结果（W02-R1 兼容策略）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RefResolution {
    /// 候选越出授权根（包括符号链接）；不探测或读取内容。
    Outside,
    /// 唯一确定：`matched` 说明命中的是解码语义还是字面语义。
    Resolved {
        path: std::path::PathBuf,
        matched: RefMatch,
    },
    /// 候选都不存在。
    Missing,
    /// 字面候选与解码候选是内容不同的两个真实文件：编码协议的固有碰撞，
    /// 不允许静默选一个。
    Ambiguous {
        decoded_relative: String,
        literal_relative: String,
    },
}

/// 命中的是哪种语义。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RefMatch {
    /// 按 URI 语义解码一次后命中（新协议生成的引用）。
    Decoded,
    /// 按作者字面写法命中（历史未编码文档）。
    Literal,
}

/// 引用在磁盘上的唯一裁决入口。
///
/// 策略是**文件系统事实优先**，不是字符串优先级：
/// 1. 只有解码候选存在 → 解码命中（新协议）。
/// 2. 只有字面候选存在 → 字面命中（历史文档）。
/// 3. 两者都存在且是同一文件或同内容 → 按解码命中（显示结果一致）。
/// 4. 两者都存在且内容不同 → `Ambiguous`，由调用方显式处理，绝不静默选边。
pub fn resolve_ref_on_disk(raw: &str, base_dir: &std::path::Path) -> RefResolution {
    resolve_ref_within(raw, base_dir, base_dir)
}

/// Resolve filesystem identity before any content access. No file bytes are read.
/// `base_dir` is the document directory; `root` is the independently authorized root.
pub fn resolve_ref_within(raw: &str, base_dir: &std::path::Path, root: &std::path::Path) -> RefResolution {
    use std::path::{Path, PathBuf, Component};
    if raw.len() > 16 * 1024 { return RefResolution::Missing; }
    let Ok(root) = root.canonicalize() else { return RefResolution::Missing; };
    let Ok(base) = base_dir.canonicalize() else { return RefResolution::Missing; };
    if !base.starts_with(&root) { return RefResolution::Outside; }
    let (decoded_relative, literal_relative, absolute): (String, String, Option<PathBuf>) =
        if raw.starts_with("file:") {
            let Ok(url) = url::Url::parse(raw) else { return RefResolution::Missing; };
            let Ok(path) = url.to_file_path() else { return RefResolution::Missing; };
            (raw.into(), raw.into(), Some(path))
        } else if Path::new(raw).is_absolute() {
            (raw.into(), raw.into(), Some(PathBuf::from(raw)))
        } else {
            let Some(decoded) = decode_relative_ref(raw) else { return RefResolution::Missing; };
            let literal = literal_relative_ref(raw).unwrap_or_else(|| decoded.clone());
            (decoded, literal, None)
        };
    fn canonical_candidate(path: PathBuf, root: &Path) -> Result<Option<PathBuf>, ()> {
        let mut lexical = PathBuf::new();
        for part in path.components() {
            match part { Component::CurDir => {}, Component::ParentDir => { lexical.pop(); }, _ => lexical.push(part) }
        }
        // Existence checks happen only after checking the nearest real ancestor.
        let mut ancestor = lexical.as_path();
        loop {
            match ancestor.canonicalize() {
                Ok(real) => { if !real.starts_with(root) { return Err(()); } break; },
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                    ancestor = ancestor.parent().ok_or(())?;
                },
                Err(_) => return Err(()),
            }
        }
        match lexical.canonicalize() {
            Ok(real) if real.starts_with(root) && real.is_file() => Ok(Some(real)),
            Ok(real) if !real.starts_with(root) => Err(()),
            _ => Ok(None),
        }
    }
    let decoded = absolute.clone().unwrap_or_else(|| candidate_path(&base, &decoded_relative));
    let literal = absolute.unwrap_or_else(|| candidate_path(&base, &literal_relative));
    // Check both candidates before classifying ambiguity; never compare file contents.
    let decoded = canonical_candidate(decoded, &root);
    let literal = canonical_candidate(literal, &root);
    let (Ok(decoded), Ok(literal)) = (decoded, literal) else { return RefResolution::Outside; };
    match (decoded, literal) {
        (Some(decoded), Some(literal)) if decoded != literal => RefResolution::Ambiguous { decoded_relative, literal_relative },
        (Some(path), _) => RefResolution::Resolved { path, matched: RefMatch::Decoded },
        (_, Some(path)) => RefResolution::Resolved { path, matched: RefMatch::Literal },
        _ => RefResolution::Missing,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        decode_relative_ref, encode_ref_segment, resolve_ref_on_disk, RefMatch, RefResolution,
    };
    use std::fs;
    use std::path::{Path, PathBuf};

    /// 独立临时目录，避免测试之间互相看到对方的 assets。
    fn scratch_dir(tag: &str) -> PathBuf {
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|value| value.as_nanos())
            .unwrap_or(0);
        let dir = std::env::temp_dir().join(format!("nutbook-markdown-ref-{tag}-{stamp}"));
        fs::create_dir_all(&dir).expect("scratch dir");
        dir.canonicalize().expect("canonical fixture")
    }

    fn write(dir: &Path, name: &str, bytes: &[u8]) -> PathBuf {
        let path = dir.join(name);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("fixture parent");
        }
        fs::write(&path, bytes).expect("fixture file");
        path
    }

    /// W02-R1 剩余部分：只有字面文件时，历史文档必须仍然命中字面文件，
    /// 不能被解码优先静默改指到另一个（或不存在）的文件。
    #[test]
    fn literal_only_reference_hits_the_literal_file() {
        let dir = scratch_dir("literal-only");
        let literal = write(&dir, "assets/report%23.png", b"ORIGINAL");

        match resolve_ref_on_disk("assets/report%23.png", &dir) {
            RefResolution::Resolved { path, matched } => {
                assert_eq!(matched, RefMatch::Literal);
                assert_eq!(path, literal);
                assert_eq!(fs::read(&path).expect("read"), b"ORIGINAL");
            }
            other => panic!("expected the literal file, got {other:?}"),
        }
    }

    /// 新协议：文件名 `report#1.png` 写成 `report%231.png`，解码一次命中。
    #[test]
    fn encoded_reference_hits_the_decoded_file() {
        let dir = scratch_dir("decoded-only");
        let decoded = write(&dir, "assets/report#1.png", b"NEW");

        match resolve_ref_on_disk("assets/report%231.png", &dir) {
            RefResolution::Resolved { path, matched } => {
                assert_eq!(matched, RefMatch::Decoded);
                assert_eq!(path, decoded);
            }
            other => panic!("expected the decoded file, got {other:?}"),
        }
    }

    /// 旧文件名字面含 `%`，被新协议编码成 `%2523`：解码一次回到 `%23`。
    /// 这条不能被字面候选抢走（字面串 `report%2523.png` 通常不存在）。
    #[test]
    fn doubly_encoded_reference_returns_to_the_percent_file_name() {
        let dir = scratch_dir("double-encoded");
        let decoded = write(&dir, "assets/report%23.png", b"ORIGINAL");

        match resolve_ref_on_disk("assets/report%2523.png", &dir) {
            RefResolution::Resolved { path, matched } => {
                assert_eq!(matched, RefMatch::Decoded);
                assert_eq!(path, decoded);
            }
            other => panic!("expected the percent file, got {other:?}"),
        }
    }

    /// 两个候选都是真实文件且内容不同：这是编码协议的固有碰撞，
    /// 不允许静默选一个，必须显式报歧义。
    #[test]
    fn conflicting_candidates_are_reported_instead_of_silently_picked() {
        let dir = scratch_dir("ambiguous");
        write(&dir, "assets/report%23.png", b"ORIGINAL");
        write(&dir, "assets/report#.png", b"DIFFERENT");

        match resolve_ref_on_disk("assets/report%23.png", &dir) {
            RefResolution::Ambiguous {
                decoded_relative,
                literal_relative,
            } => {
                assert_eq!(decoded_relative, "assets/report#.png");
                assert_eq!(literal_relative, "assets/report%23.png");
            }
            other => panic!("expected an explicit ambiguity, got {other:?}"),
        }
    }

    /// 两个不同文件即使当前字节相同也不能判为同一身份。
    #[test]
    fn different_files_stay_ambiguous_even_when_bytes_match() {
        let dir = scratch_dir("identical");
        write(&dir, "assets/report%23.png", b"SAME");
        write(&dir, "assets/report#.png", b"SAME");

        assert!(matches!(resolve_ref_on_disk("assets/report%23.png", &dir), RefResolution::Ambiguous { .. }));
    }

    #[test]
    fn plain_reference_is_unaffected() {
        let dir = scratch_dir("plain");
        let plain = write(&dir, "assets/normal.png", b"PNG");
        assert_eq!(
            resolve_ref_on_disk("./assets/normal.png", &dir),
            RefResolution::Resolved {
                path: plain,
                matched: RefMatch::Decoded,
            }
        );
    }

    /// 两个候选都不存在：明确 Missing，不能编造路径。
    #[test]
    fn absent_reference_is_missing() {
        let dir = scratch_dir("missing");
        assert_eq!(
            resolve_ref_on_disk("assets/nope%23.png", &dir),
            RefResolution::Missing
        );
    }

    /// 非本地引用（远程/data/file/绝对路径）不参与磁盘裁决。
    #[test]
    fn foreign_reference_is_missing() {
        let dir = scratch_dir("foreign");
        for raw in [
            "https://example.com/a.png",
            "data:image/png;base64,xx",
            "file:///etc/passwd",
            "/absolute/a.png",
            "",
        ] {
            assert!(matches!(resolve_ref_on_disk(raw, &dir), RefResolution::Missing | RefResolution::Outside), "{raw}");
        }
    }

    #[test]
    fn encode_covers_the_characters_that_break_uri_references() {
        assert_eq!(encode_ref_segment("normal.png"), "normal.png");
        assert_eq!(encode_ref_segment("report#1.png"), "report%231.png");
        assert_eq!(encode_ref_segment("report%23.png"), "report%2523.png");
        assert_eq!(encode_ref_segment("report one.png"), "report%20one.png");
        assert_eq!(encode_ref_segment("100%.png"), "100%25.png");
        assert_eq!(encode_ref_segment("中文.png"), "%E4%B8%AD%E6%96%87.png");
        assert_eq!(encode_ref_segment("a?b.png"), "a%3Fb.png");
    }

    #[test]
    fn decode_is_the_exact_single_inverse_of_encode() {
        for name in [
            "normal.png",
            "report#1.png",
            "report%23.png",
            "report one.png",
            "100%.png",
            "中文.png",
            "a?b.png",
            "50% done #2.png",
        ] {
            let encoded = encode_ref_segment(name);
            assert_eq!(
                decode_relative_ref(&format!("./assets/{encoded}")).as_deref(),
                Some(format!("./assets/{name}").as_str()),
                "{name}"
            );
            assert_eq!(decode_relative_ref(&format!("assets/{encoded}")), Some(format!("assets/{name}")));
        }
    }

    #[test]
    fn decode_rejects_escapes_and_foreign_references() {
        assert_eq!(decode_relative_ref(""), None);
        assert_eq!(decode_relative_ref("/etc/passwd"), None);
        assert_eq!(decode_relative_ref("https://example.com/a.png"), None);
        assert_eq!(decode_relative_ref("data:image/png;base64,xxx"), None);
        assert_eq!(decode_relative_ref("assets/a%2Fb.png"), None, "an encoded separator must not rebuild a path");
        assert_eq!(decode_relative_ref("assets/a%5Cb.png"), None);
        assert_eq!(decode_relative_ref("assets/a%00b.png"), None);
        // `..` 保留给下游 canonical 校验；这里不偷偷裁剪成 root 内路径。
        assert_eq!(decode_relative_ref("../escape.png").as_deref(), Some("../escape.png"));
        assert_eq!(decode_relative_ref("sub/../a.png").as_deref(), Some("sub/../a.png"));
    }
    #[test]
    fn authorized_root_and_document_directory_are_distinct() {
        let root = scratch_dir("nested-base");
        let doc = root.join("docs");
        let wanted = write(&root, "docs/assets/a.png", b"DOCUMENT");
        write(&root, "assets/a.png", b"WRONG ROOT");
        assert!(matches!(super::resolve_ref_within("assets/a.png", &doc, &root),
            RefResolution::Resolved { path, .. } if path == wanted));
        assert!(matches!(super::resolve_ref_within("../assets/a.png", &doc, &root), RefResolution::Resolved { .. }));
    }

    #[test]
    fn outside_candidates_are_rejected_before_ambiguity() {
        let root = scratch_dir("scope");
        let authorized = root.join("authorized"); fs::create_dir_all(&authorized).unwrap();
        write(&root, "outside/x%23.png", b"AMBER");
        let decoded = write(&root, "outside/x#.png", b"BERRY");
        assert_eq!(super::resolve_ref_within("../outside/x%23.png", &authorized, &authorized), RefResolution::Outside);
        fs::write(decoded, b"AMBER").unwrap();
        assert_eq!(super::resolve_ref_within("../outside/x%23.png", &authorized, &authorized), RefResolution::Outside);
    }

    #[cfg(windows)]
    #[test]
    fn windows_absolute_case_alias_uses_filesystem_identity() {
        let root = scratch_dir("windows-alias");
        let image = write(&root, "Assets/Normal.png", b"PNG");
        let alias = image.to_string_lossy().to_lowercase();
        assert!(matches!(super::resolve_ref_within(&alias, &root, &root),
            RefResolution::Resolved { path, .. } if path == image.canonicalize().unwrap()));
    }

}
