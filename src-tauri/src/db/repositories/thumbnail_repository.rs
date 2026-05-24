use crate::{
    errors::AppError,
    models::{GenerateThumbnailResponse, ThumbnailInfo},
};

pub trait ThumbnailRepository {
    fn generate_thumbnail(&self, item_id: i64) -> Result<GenerateThumbnailResponse, AppError>;
    fn get_thumbnail_info(&self, item_id: i64) -> Result<Option<ThumbnailInfo>, AppError>;
}
