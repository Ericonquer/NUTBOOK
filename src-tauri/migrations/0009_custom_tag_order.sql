ALTER TABLE item_tags ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE item_tags ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0;
UPDATE item_tags SET position = (SELECT COUNT(*) FROM item_tags older WHERE older.item_id = item_tags.item_id AND older.tag_id < item_tags.tag_id);
UPDATE item_tags SET is_primary = 1 WHERE position = 0;
CREATE UNIQUE INDEX item_tags_one_primary ON item_tags(item_id) WHERE is_primary = 1;
