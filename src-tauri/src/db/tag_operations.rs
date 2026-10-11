use super::*;
use crate::models::tag::{BatchTagsRequest, MergeTagRequest};

impl Database {
    pub fn merge_tags(&self, request: &MergeTagRequest) -> Result<Vec<SetItemTagsResponse>, AppError> {
        if request.source_ids.is_empty() || request.source_ids.contains(&request.target_id) { return Err(AppError::InvalidParams); }
        let mut connection = self.connection()?;
        let tx = connection.transaction().map_err(|_| AppError::DatabaseError)?;
        let sources:std::collections::BTreeSet<i64>=request.source_ids.iter().copied().collect();
        for id in sources.iter().copied().chain(std::iter::once(request.target_id)) {
            let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM tags WHERE id=?)", [id], |r| r.get(0)).map_err(|_| AppError::DatabaseError)?;
            if !exists { return Err(AppError::TagNotFound); }
        }
        let mut affected_items=std::collections::BTreeSet::new();
        for &source_id in &sources {
        let affected: Vec<(i64,bool)> = {
            let mut stmt = tx.prepare("SELECT item_id,is_primary FROM item_tags WHERE tag_id=? ORDER BY item_id").map_err(|_| AppError::DatabaseError)?;
            let rows = stmt.query_map([source_id], |r| Ok((r.get(0)?,r.get(1)?))).map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<_,_>>().map_err(|_| AppError::DatabaseError)?
        };
        for &(item, primary) in &affected {
            let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM item_tags WHERE item_id=? AND tag_id=?)", params![item,request.target_id], |r|r.get(0)).map_err(|_|AppError::DatabaseError)?;
            if exists {
                tx.execute("DELETE FROM item_tags WHERE item_id=? AND tag_id=?",params![item,source_id]).map_err(|_|AppError::DatabaseError)?;
                if primary {
                    tx.execute("UPDATE item_tags SET is_primary=0 WHERE item_id=?",[item]).map_err(|_|AppError::DatabaseError)?;
                    tx.execute("UPDATE item_tags SET is_primary=1 WHERE item_id=? AND tag_id=?",params![item,request.target_id]).map_err(|_|AppError::DatabaseError)?;
                }
            } else {
                tx.execute("UPDATE item_tags SET tag_id=? WHERE item_id=? AND tag_id=?",params![request.target_id,item,source_id]).map_err(|_|AppError::DatabaseError)?;
            }
        }
        tx.execute("DELETE FROM tags WHERE id=?",[source_id]).map_err(|_|AppError::DatabaseError)?;
        affected_items.extend(affected.into_iter().map(|(item,_)|item));
        }
        let mut results=Vec::new();
        for item in affected_items { results.push(SetItemTagsResponse { item_id:item, tags:Self::load_tags_for_item(&tx,item)? }); }
        tx.commit().map_err(|_|AppError::DatabaseError)?;
        Ok(results)
    }

    pub fn batch_tags(&self, request: &BatchTagsRequest) -> Result<Vec<SetItemTagsResponse>, AppError> {
        if request.item_ids.is_empty() || request.tag_ids.is_empty() || !matches!(request.operation.as_str(),"add"|"remove") { return Err(AppError::InvalidParams); }
        let mut connection=self.connection()?;
        let tx=connection.transaction().map_err(|_|AppError::DatabaseError)?;
        let mut ids=Vec::new();
        for &id in &request.tag_ids {
            if ids.contains(&id) { continue; }
            let exists:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM tags WHERE id=?)",[id],|r|r.get(0)).map_err(|_|AppError::DatabaseError)?;
            if !exists { return Err(AppError::TagNotFound); } ids.push(id);
        }
        let mut seen=std::collections::HashSet::new();let mut results=Vec::new();
        for &item in &request.item_ids {
            if !seen.insert(item) { continue; }
            let exists:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM items WHERE id=? AND is_deleted=0 AND path_state='valid')",[item],|r|r.get(0)).map_err(|_|AppError::DatabaseError)?;
            if !exists { return Err(AppError::ItemNotFound); }
            if request.operation=="add" {
                let mut position:i64=tx.query_row("SELECT COALESCE(MAX(position),-1)+1 FROM item_tags WHERE item_id=?",[item],|r|r.get(0)).map_err(|_|AppError::DatabaseError)?;
                for &tag in &ids {
                    let added=tx.execute("INSERT OR IGNORE INTO item_tags(item_id,tag_id,created_at,position,is_primary) VALUES (?,?,?,?,0)",params![item,tag,current_timestamp(),position]).map_err(|_|AppError::DatabaseError)?;
                    position+=added as i64;
                }
            } else {
                for &tag in &ids { tx.execute("DELETE FROM item_tags WHERE item_id=? AND tag_id=?",params![item,tag]).map_err(|_|AppError::DatabaseError)?; }
            }
            tx.execute("UPDATE item_tags SET is_primary=1 WHERE item_id=?1 AND tag_id=(SELECT tag_id FROM item_tags WHERE item_id=?1 ORDER BY position,tag_id LIMIT 1) AND NOT EXISTS(SELECT 1 FROM item_tags WHERE item_id=?1 AND is_primary=1)",[item]).map_err(|_|AppError::DatabaseError)?;
            results.push(SetItemTagsResponse {item_id:item,tags:Self::load_tags_for_item(&tx,item)?});
        }
        tx.commit().map_err(|_|AppError::DatabaseError)?;
        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{SaveItemTagsRequest,TagSelection};
    #[test]
    fn tag_management_and_batch_preserve_primary_and_rollback() {
        let path=std::env::temp_dir().join(format!("nutbook-tag-operations-{}-{}.sqlite3",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let db=Database::new(&path).unwrap();
        db.upsert_library(Library{id:1,name:"Samples".into(),root_path:"/tmp/tag-samples".into(),source_kind:"folder".into(),path_state:"valid".into(),is_active:true,created_at:"now".into(),updated_at:"now".into(),last_scanned_at:None,skill_binding:None}).unwrap();
        let records:Vec<_>=(1..=2).map(|id|IndexedItemRecord{library_id:1,file_path:format!("/tmp/tag-samples/{id}.md"),relative_path:format!("{id}.md"),file_name:format!("{id}.md"),file_ext:"md".into(),file_type:"markdown".into(),file_size:1,modified_at:"1".into(),created_at:"now".into(),updated_at:"now".into()}).collect();
        db.replace_items_for_library(1,&records).unwrap();
        let mut ids=Vec::new();for name in ["X","Y","Z"]{ids.push(db.create_tag(&CreateTagRequest{name:name.into(),color:None}).unwrap().id);}
        let [x,y,z]=[ids[0],ids[1],ids[2]];
        let set=|item_id,ids:Vec<i64>,primary|db.save_item_tag_selection(&SaveItemTagsRequest{item_id,selections:ids.into_iter().map(|id|TagSelection{id:Some(id),name:None}).collect(),primary_index:Some(primary)}).unwrap();
        set(1,vec![x,y],0);
        let result=db.batch_tags(&BatchTagsRequest{item_ids:vec![1,2,2],tag_ids:vec![y,z,y],operation:"add".into()}).unwrap();
        assert_eq!(result.len(),2);assert_eq!(result[0].tags.iter().map(|t|t.id).collect::<Vec<_>>(),vec![x,y,z]);assert_eq!(result[1].tags[0].id,y);
        let result=db.batch_tags(&BatchTagsRequest{item_ids:vec![1,2],tag_ids:vec![x,y],operation:"remove".into()}).unwrap();
        assert!(result.iter().all(|r|r.tags.len()==1&&r.tags[0].id==z));
        assert!(db.batch_tags(&BatchTagsRequest{item_ids:vec![1,999],tag_ids:vec![x],operation:"add".into()}).is_err());
        assert_eq!(db.get_item_detail(1).unwrap().summary.tags.len(),1,"late invalid item must roll back earlier item write");
        set(1,vec![y,z,x],0);
        // The first source is fully processed before the second source deletion fails.
        let before1=db.get_item_detail(1).unwrap().summary.tags.iter().map(|t|t.id).collect::<Vec<_>>();
        let before2=db.get_item_detail(2).unwrap().summary.tags.iter().map(|t|t.id).collect::<Vec<_>>();
        db.connection().unwrap().execute_batch(&format!("CREATE TRIGGER fail_second_merge BEFORE DELETE ON tags WHEN OLD.id={z} BEGIN SELECT RAISE(ABORT,'second source canary'); END;")).unwrap();
        assert!(db.merge_tags(&MergeTagRequest{source_ids:vec![y,z,y],target_id:x}).is_err());
        assert_eq!(db.get_item_detail(1).unwrap().summary.tags.iter().map(|t|t.id).collect::<Vec<_>>(),before1);
        assert_eq!(db.get_item_detail(2).unwrap().summary.tags.iter().map(|t|t.id).collect::<Vec<_>>(),before2);
        assert_eq!(db.connection().unwrap().query_row("SELECT COUNT(*) FROM tags WHERE id IN (?1,?2)",params![y,z],|r|r.get::<_,i64>(0)).unwrap(),2,"earlier source deletion must roll back too");
        db.connection().unwrap().execute_batch("DROP TRIGGER fail_second_merge;").unwrap();
        for source_ids in [vec![],vec![x],vec![y,999]] {assert!(db.merge_tags(&MergeTagRequest{source_ids,target_id:x}).is_err());}
        db.merge_tags(&MergeTagRequest{source_ids:vec![y],target_id:x}).unwrap();
        assert_eq!(db.get_item_detail(1).unwrap().summary.tags.iter().map(|t|t.id).collect::<Vec<_>>(),vec![x,z],"source primary becomes existing target without duplicates");
        db.connection().unwrap().execute_batch("CREATE TRIGGER fail_tag_delete BEFORE DELETE ON tags BEGIN SELECT RAISE(ABORT,'rollback canary'); END;").unwrap();
        assert!(db.merge_tags(&MergeTagRequest{source_ids:vec![z],target_id:x}).is_err());
        assert_eq!(db.get_item_detail(2).unwrap().summary.tags[0].id,z,"failed merge restores both associations and source tag");
        db.connection().unwrap().execute_batch("DROP TRIGGER fail_tag_delete;").unwrap();
        db.merge_tags(&MergeTagRequest{source_ids:vec![z],target_id:x}).unwrap();
        assert_eq!(db.get_item_detail(2).unwrap().summary.tags[0].id,x);
        assert_eq!(Database::new(&path).unwrap().get_item_detail(2).unwrap().summary.tags[0].id,x,"merge persists on reopen");
        let a=db.create_tag(&CreateTagRequest{name:"A".into(),color:None}).unwrap().id;
        let b=db.create_tag(&CreateTagRequest{name:"B".into(),color:None}).unwrap().id;
        set(1,vec![a,b,x],0);set(2,vec![b],0);
        let merged=db.merge_tags(&MergeTagRequest{source_ids:vec![a,b,a],target_id:x}).unwrap();
        assert_eq!(merged.len(),2,"affected items returned once with final tags");
        assert!(merged.iter().all(|r|r.tags.len()==1&&r.tags[0].id==x));
        assert_eq!(Database::new(&path).unwrap().get_item_detail(1).unwrap().summary.tags[0].id,x);
        assert!(db.update_tag(&UpdateTagRequest{id:x,name:Some("  ".into()),color:None}).is_err());
        assert_eq!(db.update_tag(&UpdateTagRequest{id:x,name:Some("  New Name  ".into()),color:None}).unwrap().name,"New Name");
        db.delete_tag(x).unwrap();assert!(db.get_item_detail(1).unwrap().summary.tags.is_empty());
        let _=std::fs::remove_file(path);
    }
}
