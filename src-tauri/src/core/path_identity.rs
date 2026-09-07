//! PathIdentity —— PR A 的路径身份合同（计划 4.3 / 8.1）。
//!
//! 合同：
//! - 保留可逆的原始 OS path（`raw`），所有 IO 一律使用 `raw`；
//! - 另生成比较用 identity（`identity`）：
//!   * 路径当前可解析（存在且可达）时，identity = `fs::canonicalize` 的结果
//!     （真实卷上的规范路径字符串）；
//!   * missing / 不可读 / 离线的路径 identity = `None`，保留 `raw`，
//!     恢复可达时再 claim identity；
//! - 明确不做的假设：
//!   * 不把固定 NFC / 大小写折叠当成所有 macOS / Windows 卷的真实语义 ——
//!     identity 完全来自文件系统自身的解析结果：同一文件经不同拼写
//!     （大小写变体、Unicode 变体、symlink / alias、Windows 8.3 短名）
//!     canonicalize 后都落到卷上的真实路径，因此自然同 identity；
//!     卷上真实不同的两个文件解析结果必然不同，绝不误合并；
//!   * 不使用 inode / dev id 建立跨离线重命名的身份（计划 11 非目标）。
//!
//! identity 只在路径可解析时稳定；跨卷移动后 identity 变化属于正常语义，
//! 由接入事务内的 PathIdentity 重新检查兜底（不做 lexical path 假设）。

use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PathIdentity {
    /// 原始 OS path（可逆，IO 一律用它）。
    pub raw: String,
    /// 比较身份：路径可解析时为 canonical 路径字符串；否则 None。
    pub identity: Option<String>,
}

/// 为一个路径计算 PathIdentity。`raw` 保持调用方传入的原始字符串；
/// identity 只在 `fs::canonicalize` 成功时产生。
pub fn path_identity(raw: &str) -> PathIdentity {
    let path = Path::new(raw);
    let identity = std::fs::canonicalize(path)
        .ok()
        .map(|canonical| canonical.to_string_lossy().into_owned());
    PathIdentity {
        raw: raw.to_string(),
        identity,
    }
}

/// 原始路径仅去除 `.` 组件与尾部分隔符的轻量规范化（不做符号链接解析、
/// 不做大小写 / Unicode 折叠）。仅用于同卷内可靠的 lexical 比较
/// （例如 folder containment 的快速预判），跨身份的最终裁决仍以
/// PathIdentity 事务内检查为准。
pub fn lexical_normalize(raw: &str) -> String {
    let path = Path::new(raw);
    let mut normalized = std::path::PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::Prefix(prefix) => normalized.push(prefix.as_os_str()),
            std::path::Component::RootDir => normalized.push(component.as_os_str()),
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir => {
                normalized.pop();
            }
            std::path::Component::Normal(part) => normalized.push(part),
        }
    }
    normalized.to_string_lossy().into_owned()
}

/// folder containment 的 lexical 预判：candidate 是否位于 root 内
/// （含 root 自身）。这只做快速预筛；父子来源 overlap 的最终拒绝
/// 仍按现有 `libraries_overlap` 规则与事务内 PathIdentity 检查执行。
pub fn lexically_contains(root: &str, candidate: &str) -> bool {
    let root = lexical_normalize(root);
    let candidate = lexical_normalize(candidate);
    // 按组件边界判断，避免 "/tmp/root" 误包含 "/tmp/root-other"。
    Path::new(&candidate).starts_with(Path::new(&root))
}

#[cfg(test)]
mod tests {
    use super::{lexically_contains, path_identity};
    use std::fs;

    fn unique_dir(tag: &str) -> std::path::PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-path-id-{tag}-{nanos}"))
    }

    #[test]
    fn same_file_via_symlink_alias_shares_identity() {
        let root = unique_dir("alias");
        fs::create_dir_all(&root).expect("root");
        let real = root.join("real.md");
        fs::write(&real, "# real").expect("write real");
        let alias = root.join("alias.md");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&real, &alias).expect("symlink should work");
        #[cfg(not(unix))]
        fs::hard_link(&real, &alias).expect("hard link should work");

        let real_identity = path_identity(real.to_str().expect("utf8"));
        let alias_identity = path_identity(alias.to_str().expect("utf8"));

        assert!(real_identity.identity.is_some());
        assert_eq!(real_identity.identity, alias_identity.identity);
        assert_ne!(real_identity.raw, alias_identity.raw);

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn case_variant_spelling_resolves_to_same_identity_on_existing_file() {
        let root = unique_dir("case");
        fs::create_dir_all(&root).expect("root");
        let lower = root.join("note.md");
        fs::write(&lower, "# note").expect("write");

        let lower_identity = path_identity(lower.to_str().expect("utf8"));
        // 用大小写变体拼写同一文件（macOS 默认大小写不敏感卷可解析；
        // 大小写敏感卷上该路径不存在，identity 必须为 None，不得伪造折叠）。
        let parent = root.parent().and_then(|p| p.to_str()).expect("parent");
        let dir_name = root.file_name().and_then(|n| n.to_str()).expect("dir name");
        let upper_variant = format!("{parent}/{}", dir_name.to_uppercase());
        let upper_identity = path_identity(&format!("{upper_variant}/NOTE.md"));

        if cfg!(target_os = "macos") {
            // 默认 APFS 大小写不敏感：变体拼写可解析到同一文件。
            assert_eq!(lower_identity.identity, upper_identity.identity);
        } else {
            // 大小写敏感卷：变体不可解析，必须明确降级为 None。
            assert_eq!(upper_identity.identity, None);
        }

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn two_distinct_files_never_share_identity() {
        let root = unique_dir("distinct");
        fs::create_dir_all(&root).expect("root");
        let a = root.join("a.md");
        let b = root.join("b.md");
        fs::write(&a, "# a").expect("write a");
        fs::write(&b, "# b").expect("write b");

        let a_identity = path_identity(a.to_str().expect("utf8"));
        let b_identity = path_identity(b.to_str().expect("utf8"));
        assert_ne!(a_identity.identity, b_identity.identity);

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn missing_path_keeps_raw_and_none_identity() {
        let root = unique_dir("missing");
        let missing = root.join("nope.md");
        let identity = path_identity(missing.to_str().expect("utf8"));
        assert_eq!(identity.identity, None);
        assert_eq!(identity.raw, missing.to_string_lossy());
    }

    #[test]
    fn lexical_contains_and_normalize() {
        assert!(lexically_contains("/tmp/root", "/tmp/root/sub/a.md"));
        assert!(lexically_contains("/tmp/root", "/tmp/root"));
        assert!(lexically_contains("/tmp/root", "/tmp/./root/sub/../sub/x.md"));
        assert!(!lexically_contains("/tmp/root", "/tmp/root-other/a.md"));
        assert_eq!(
            super::lexical_normalize("/tmp/./root/sub/../x.md"),
            "/tmp/root/x.md"
        );
    }
}
