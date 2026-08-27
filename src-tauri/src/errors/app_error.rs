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
            AppError::InvalidSession => "INVALID_SESSION",
            AppError::DatabaseError => "DATABASE_ERROR",
            AppError::IoError => "IO_ERROR",
            AppError::InternalError => "INTERNAL_ERROR",
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
