use std::path::{Component, Path, PathBuf};

fn normalized_components(path: &Path) -> Vec<Component<'_>> {
    path.components()
        .filter(|component| !matches!(component, Component::CurDir))
        .collect()
}

pub fn normalized_path(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();

    for component in normalized_components(path) {
        normalized.push(component.as_os_str());
    }

    normalized
}

pub fn libraries_overlap(existing: &Path, candidate: &Path) -> bool {
    let existing = normalized_path(existing);
    let candidate = normalized_path(candidate);

    existing == candidate
        || candidate.starts_with(&existing)
        || existing.starts_with(&candidate)
}

pub fn normalized_path_string(path: &Path) -> String {
    normalized_path(path).to_string_lossy().to_string()
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::libraries_overlap;

    #[test]
    fn overlap_is_true_for_parent_and_child_directories() {
        let existing = Path::new("/Users/example/Documents/Notes");
        let candidate = Path::new("/Users/example/Documents/Notes/Sub");

        assert!(libraries_overlap(existing, candidate));
    }

    #[test]
    fn overlap_is_false_for_sibling_directories() {
        let existing = Path::new("/Users/example/Documents/Notes");
        let candidate = Path::new("/Users/example/Documents/Clips");

        assert!(!libraries_overlap(existing, candidate));
    }

    #[test]
    fn overlap_is_true_for_same_directory() {
        let existing = Path::new("/Users/example/Documents/Notes");
        let candidate = Path::new("/Users/example/Documents/Notes");

        assert!(libraries_overlap(existing, candidate));
    }

    #[test]
    fn overlap_ignores_current_directory_segments() {
        let existing = Path::new("/Users/example/Documents/Notes");
        let candidate = Path::new("/Users/example/Documents/./Notes/Sub");

        assert!(libraries_overlap(existing, candidate));
    }
}
