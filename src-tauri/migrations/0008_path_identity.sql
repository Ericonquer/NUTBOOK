-- PR A（计划 4.3）：PathIdentity schema 迁移。
-- - libraries / items 增加可空 identity：只在路径当前可解析时由 Rust 侧回填
--   canonical 身份；missing / 不可读 / 离线路径保持 NULL，恢复时再 claim。
-- - partial unique index：identity 非空时全库唯一，防止同一真实文件被两个
--   来源重复拥有；NULL 不参与唯一约束。
-- - libraries.sync_state：watcher 激活失败时进入 'waiting_sync' 可恢复状态
--   （计划 4.3 末条），由当前会话重试 / 下次启动 catch-up 收敛。
ALTER TABLE libraries ADD COLUMN identity TEXT;
ALTER TABLE libraries ADD COLUMN sync_state TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE items ADD COLUMN identity TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_libraries_identity
  ON libraries(identity) WHERE identity IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_identity
  ON items(identity) WHERE identity IS NOT NULL;
