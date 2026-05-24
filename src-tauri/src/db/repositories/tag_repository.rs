use crate::{
    errors::AppError,
    models::{
        CreateTagRequest, DeleteTagResponse, SetItemTagsResponse, Tag, UpdateTagRequest,
    },
};

pub trait TagRepository {
    fn list_tags(&self) -> Result<Vec<Tag>, AppError>;
    fn create_tag(&self, payload: &CreateTagRequest) -> Result<Tag, AppError>;
    fn update_tag(&self, payload: &UpdateTagRequest) -> Result<Tag, AppError>;
    fn delete_tag(&self, tag_id: i64) -> Result<DeleteTagResponse, AppError>;
    fn set_item_tags(&self, item_id: i64, tag_ids: &[i64]) -> Result<SetItemTagsResponse, AppError>;
}
