use std::{fs, path::Path};

use rusqlite::{Connection, OpenFlags};
use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
    pub detail: Option<String>,
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("invalid params")]
    InvalidParams,
    #[error("library path overlaps with an existing library")]
    LibraryPathOverlap,
    #[error("library not found")]
    LibraryNotFound,
    #[error("item not found")]
    ItemNotFound,
    #[error("tag not found")]
    TagNotFound,
    #[error("tag name exists")]
    TagNameExists,
    #[error("unsupported file type")]
    UnsupportedFileType,
    #[error("preview load failed")]
    PreviewLoadFailed,
    #[error("edit conflict")]
    EditConflict,
    #[error("markdown save failed")]
    MarkdownSaveFailed,
    #[error("thumbnail generation failed")]
    ThumbnailGenerationFailed,
    #[error("update failed: {0}")]
    UpdateFailed(String),
    #[error("invalid image asset type")]
    AssetInvalidType,
    #[error("image asset exceeds the 20 MiB limit")]
    AssetTooLarge,
    /// PR C / C2：封面资源校验拒绝（MIME/扩展/字节/像素/比例/SVG 安全）。
    #[error("cover asset rejected: {0}")]
    CoverAssetRejected(String),
    #[error("HTML edit session is no longer active")]
    InvalidSession,
    #[error("database error")]
    DatabaseError,
    #[error("io error")]
    IoError,
    #[error("internal error")]
    InternalError,
    /// §7.2：用户在系统确认对话框中取消或未授予默认应用变更。
    #[error("default app setting cancelled or not granted")]
    DefaultAppActionCancelled,
    /// §7.2：系统设置默认应用调用失败（带系统错误描述）。
    #[error("default app action failed: {0}")]
    DefaultAppActionFailed(String),
    /// PR C R11-a.2：scoped 端口登记表故障（损坏/丢失/读取失败/写入失败/
    /// 超上限）。fail closed：一切 scoped 内容服务器拒绝启动；错误文案要求
    /// 保留登记文件原样（绝不引导删记录），机制绝不自动清空历史身份。
    #[error("scoped port registry failed: {0}")]
    ScopedRegistryFailed(String),
    /// Markdown local resources are served only by the per-item scoped origin.
    /// Keep the failure kind in the message so the host can give a safe,
    /// actionable status without exposing document contents or restoring `/fs`.
    #[error("markdown resource unavailable: {0}")]
    MarkdownResourceUnavailable(String),
    /// Agent project discovery could not read/write its local cache.  The
    /// message carries a safe cause and next action instead of collapsing to
    /// the unhelpful generic `DATABASE_ERROR` alone.
    #[error("agent discovery database unavailable: {0}")]
    AgentDiscoveryDatabaseUnavailable(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        ErrorResponse {
            code: self.code().to_string(),
            message: self.to_string(),
            detail: None,
        }
        .serialize(serializer)
    }
}

impl AppError {
    /// Classify an Agent-discovery cache failure without exposing the local
    /// database path or any cached project content to the UI.  Discovery
    /// callers use this when the lower-level database layer has intentionally
    /// collapsed rusqlite details into `DatabaseError`.
    pub fn agent_discovery_database_unavailable(
        database_path: &Path,
        operation: &str,
    ) -> Self {
        let reason = if !database_path.is_file() {
            "the discovery database file is missing; restart Nutbook to recreate it"
        } else if fs::metadata(database_path)
            .map(|metadata| metadata.permissions().readonly())
            .unwrap_or(true)
        {
            "the discovery database is read-only; check application-data permissions and retry"
        } else {
            match Connection::open_with_flags(database_path, OpenFlags::SQLITE_OPEN_READ_ONLY) {
                Err(_) => {
                    "the discovery database cannot be opened; close other Nutbook instances and retry"
                }
                Ok(connection) => {
                    let schema_tables = connection
                        .query_row(
                            "SELECT count(*) FROM sqlite_master
                             WHERE type = 'table' AND name IN ('schema_migrations', 'agent_discovery_cache')",
                            [],
                            |row| row.get::<_, i64>(0),
                        )
                        .ok();
                    if schema_tables != Some(2) {
                        "the discovery database schema is incomplete; restart Nutbook to migrate it"
                    } else {
                        "the discovery database is busy or temporarily unavailable; wait for the current scan and retry"
                    }
                }
            }
        };
        Self::AgentDiscoveryDatabaseUnavailable(format!(
            "could not {operation} the local Agent discovery cache: {reason}"
        ))
    }

    pub fn code(&self) -> &'static str {
        match self {
            AppError::InvalidParams => "INVALID_PARAMS",
            AppError::LibraryPathOverlap => "LIBRARY_PATH_OVERLAP",
            AppError::LibraryNotFound => "LIBRARY_NOT_FOUND",
            AppError::ItemNotFound => "ITEM_NOT_FOUND",
            AppError::TagNotFound => "TAG_NOT_FOUND",
            AppError::TagNameExists => "TAG_NAME_EXISTS",
            AppError::UnsupportedFileType => "UNSUPPORTED_FILE_TYPE",
            AppError::PreviewLoadFailed => "PREVIEW_LOAD_FAILED",
            AppError::EditConflict => "EDIT_CONFLICT",
            AppError::MarkdownSaveFailed => "MARKDOWN_SAVE_FAILED",
            AppError::ThumbnailGenerationFailed => "THUMBNAIL_GENERATION_FAILED",
            AppError::UpdateFailed(_) => "UPDATE_FAILED",
            AppError::AssetInvalidType => "ASSET_INVALID_TYPE",
            AppError::AssetTooLarge => "ASSET_TOO_LARGE",
            AppError::CoverAssetRejected(_) => "COVER_ASSET_REJECTED",
            AppError::ScopedRegistryFailed(_) => "SCOPED_REGISTRY_FAILED",
            AppError::MarkdownResourceUnavailable(_) => "MARKDOWN_RESOURCE_UNAVAILABLE",
            AppError::AgentDiscoveryDatabaseUnavailable(_) => "AGENT_DISCOVERY_DATABASE_UNAVAILABLE",
            AppError::InvalidSession => "INVALID_SESSION",
            AppError::DatabaseError => "DATABASE_ERROR",
            AppError::IoError => "IO_ERROR",
            AppError::InternalError => "INTERNAL_ERROR",
            AppError::DefaultAppActionCancelled => "DEFAULT_APP_ACTION_CANCELLED",
            AppError::DefaultAppActionFailed(_) => "DEFAULT_APP_ACTION_FAILED",
        }
    }

    pub fn into_error_response(self) -> ErrorResponse {
        ErrorResponse {
            code: self.code().to_string(),
            message: self.to_string(),
            detail: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::AppError;

    #[test]
    fn agent_discovery_database_error_has_safe_missing_file_cause() {
        let path = std::env::temp_dir().join(format!(
            "nutbook-agent-discovery-missing-{}-{}.sqlite3",
            std::process::id(),
            std::thread::current().name().unwrap_or("test")
        ));
        let error = AppError::agent_discovery_database_unavailable(&path, "load");

        assert_eq!(error.code(), "AGENT_DISCOVERY_DATABASE_UNAVAILABLE");
        assert!(error
            .to_string()
            .contains("database file is missing; restart Nutbook to recreate it"));
        let path_text = path.to_string_lossy();
        assert!(!error.to_string().contains(path_text.as_ref()));
    }
}
