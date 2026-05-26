use crate::{errors::AppError, models::Library};

pub trait LibraryRepository {
    fn list_libraries(&self) -> Result<Vec<Library>, AppError>;
    fn upsert_library(&self, library: Library) -> Result<Library, AppError>;
    fn update_library(&self, library: Library) -> Result<Library, AppError>;
    fn next_library_id(&self) -> Result<i64, AppError>;
    fn delete_library(&self, library_id: i64) -> Result<bool, AppError>;
}
