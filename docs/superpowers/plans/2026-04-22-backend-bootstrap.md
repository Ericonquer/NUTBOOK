# NUTBOOK Backend Bootstrap 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 NUTBOOK 建立可承接后续开发的 `src-tauri` 后端骨架，并把核心约束落到可测试代码里。

**架构：** 使用 Tauri v2 + Rust 的分层骨架，先搭 `commands / core / db / models / errors / state / utils`，把 SQL migration 作为单一事实来源，通过 `include_str!` 暴露给数据库模块。第一批只实现一个真实业务规则：资料库路径重叠校验，用测试锁住行为。

**技术栈：** Rust、Tauri、Serde、thiserror、标准库单元测试、SQLite migration SQL

---

### 任务 1：创建 `src-tauri` 骨架与 Cargo 清单

**文件：**
- 创建：`src-tauri/Cargo.toml`
- 创建：`src-tauri/src/main.rs`
- 创建：`src-tauri/src/lib.rs`
- 创建：`src-tauri/src/commands/mod.rs`
- 创建：`src-tauri/src/core/mod.rs`
- 创建：`src-tauri/src/db/mod.rs`
- 创建：`src-tauri/src/models/mod.rs`
- 创建：`src-tauri/src/errors/mod.rs`
- 创建：`src-tauri/src/state/mod.rs`
- 创建：`src-tauri/src/utils/mod.rs`

- [ ] **步骤 1：先创建最小骨架文件**

```rust
pub mod commands;
pub mod core;
pub mod db;
pub mod errors;
pub mod models;
pub mod state;
pub mod utils;
```

- [ ] **步骤 2：补充最小 Cargo 依赖**

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri = { version = "2", features = [] }
thiserror = "1"
```

- [ ] **步骤 3：运行格式与编译检查**

运行：`cargo check --manifest-path src-tauri/Cargo.toml`
预期：通过，至少能解析模块结构

### 任务 2：接入 migration 文件并暴露数据库初始化入口

**文件：**
- 创建：`src-tauri/migrations/0001_initial.sql`
- 修改：`src-tauri/src/db/mod.rs`
- 参考：`docs/schema.sql`

- [ ] **步骤 1：复制当前稳定 schema 作为首个 migration**

```sql
-- 保持与 docs/schema.sql 一致，作为后端启动时的初始化 schema
```

- [ ] **步骤 2：在 db 模块中暴露 migration 常量与初始化函数**

```rust
pub const INITIAL_SCHEMA_SQL: &str = include_str!("../migrations/0001_initial.sql");

pub fn initial_schema_sql() -> &'static str {
    INITIAL_SCHEMA_SQL
}
```

- [ ] **步骤 3：运行验证命令**

运行：`cargo check --manifest-path src-tauri/Cargo.toml`
预期：通过，`include_str!` 路径有效

### 任务 3：先写失败测试，定义资料库路径重叠规则

**文件：**
- 创建：`src-tauri/src/utils/path_rules.rs`
- 修改：`src-tauri/src/utils/mod.rs`
- 测试：`src-tauri/src/utils/path_rules.rs`

- [ ] **步骤 1：编写失败测试**

```rust
#[test]
fn overlap_is_true_for_parent_and_child_directories() {
    let existing = Path::new("/Users/hayley/Documents/Notes");
    let candidate = Path::new("/Users/hayley/Documents/Notes/Sub");

    assert!(libraries_overlap(existing, candidate));
}
```

- [ ] **步骤 2：运行测试验证失败**

运行：`cargo test --manifest-path src-tauri/Cargo.toml path_rules -- --nocapture`
预期：FAIL，提示 `libraries_overlap` 未定义或模块不存在

- [ ] **步骤 3：编写最少实现代码**

```rust
pub fn libraries_overlap(existing: &Path, candidate: &Path) -> bool {
    existing == candidate
        || candidate.starts_with(existing)
        || existing.starts_with(candidate)
}
```

- [ ] **步骤 4：补充同级目录不冲突与相同目录冲突测试**

```rust
#[test]
fn overlap_is_false_for_sibling_directories() {
    let existing = Path::new("/Users/hayley/Documents/Notes");
    let candidate = Path::new("/Users/hayley/Documents/Clips");

    assert!(!libraries_overlap(existing, candidate));
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`cargo test --manifest-path src-tauri/Cargo.toml path_rules -- --nocapture`
预期：PASS

### 任务 4：落模型、错误码和命令签名，承接 API 合同

**文件：**
- 创建：`src-tauri/src/models/library.rs`
- 创建：`src-tauri/src/models/item.rs`
- 创建：`src-tauri/src/models/tag.rs`
- 创建：`src-tauri/src/errors/app_error.rs`
- 创建：`src-tauri/src/commands/library.rs`
- 创建：`src-tauri/src/commands/items.rs`
- 创建：`src-tauri/src/commands/tags.rs`
- 创建：`src-tauri/src/commands/preview.rs`
- 创建：`src-tauri/src/commands/thumbnails.rs`
- 修改：`src-tauri/src/models/mod.rs`
- 修改：`src-tauri/src/errors/mod.rs`
- 修改：`src-tauri/src/commands/mod.rs`

- [ ] **步骤 1：定义与 API 合同一致的基础结构体与枚举**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Library {
    pub id: i64,
    pub name: String,
    pub root_path: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub last_scanned_at: Option<String>,
}
```

- [ ] **步骤 2：定义统一错误码**

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("library path overlaps with an existing library")]
    LibraryPathOverlap,
}
```

- [ ] **步骤 3：为第一批命令补空实现签名**

```rust
#[tauri::command]
pub fn list_libraries() -> Result<Vec<Library>, AppError> {
    Ok(Vec::new())
}
```

- [ ] **步骤 4：运行编译检查**

运行：`cargo check --manifest-path src-tauri/Cargo.toml`
预期：通过，命令签名、模型和错误类型都能解析

### 任务 5：连接应用入口并完成最小验证

**文件：**
- 修改：`src-tauri/src/main.rs`
- 修改：`src-tauri/src/lib.rs`

- [ ] **步骤 1：在 `main.rs` 注册命令**

```rust
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::library::list_libraries
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **步骤 2：运行完整验证**

运行：`cargo test --manifest-path src-tauri/Cargo.toml`
预期：测试通过

运行：`cargo check --manifest-path src-tauri/Cargo.toml`
预期：编译检查通过
