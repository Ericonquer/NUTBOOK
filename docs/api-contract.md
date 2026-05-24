# NUTBOOK API Contract（Tauri Commands / MVP）

本文档定义 React 前端与 Tauri Rust 后端之间的第一批接口契约，目标是让前后端可以并行开发。

## 1. 设计原则

- 所有接口均为本地 Tauri command
- 返回结构尽量稳定、扁平、可直接驱动 UI
- 列表接口统一支持分页、搜索、筛选、排序
- 缩略图生成采用异步状态，不阻塞列表查询
- UI 的展开 / 折叠属于纯前端状态，不进入后端接口语义
- Markdown 支持轻编辑，但只提供文本级读写，不提供富文本协议
- MVP 阶段以单机单用户为前提，不设计鉴权

---

## 2. 通用类型

## 2.1 返回约定

MVP 建议统一采用：

- 成功时直接返回对应业务对象，不额外包一层 `ApiResult<T>`
- 失败时通过 Tauri `invoke` 的错误通道返回统一错误对象
- 前端在 `try/catch` 中按 `error.code` 处理业务错误

```ts
export type ApiError = {
  code: string;
  message: string;
  detail?: string;
};
```

## 2.2 分页结构

```ts
export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};
```

## 2.3 基础实体

```ts
export type Library = {
  id: number;
  name: string;
  rootPath: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScannedAt?: string | null;
};

export type Tag = {
  id: number;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ThumbnailInfo = {
  status: 'pending' | 'ready' | 'failed' | 'stale';
  path?: string | null;
  width?: number | null;
  height?: number | null;
  lastGeneratedAt?: string | null;
  errorMessage?: string | null;
};

export type ItemSummary = {
  id: number;
  libraryId: number;
  filePath: string;
  relativePath: string;
  fileName: string;
  fileExt: string;
  fileType: 'html' | 'markdown';
  fileSize: number;
  modifiedAt: string;
  title?: string | null;
  summary?: string | null;
  tags: Tag[];
  thumbnail?: ThumbnailInfo | null;
};

export type ItemDetail = ItemSummary & {
  fileHash?: string | null;
  extractedTitle?: string | null;
  sourceText?: string | null;
  rawText?: string | null;
  renderedCache?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentPayload =
  | {
      itemId: number;
      fileType: 'markdown';
      title?: string | null;
      raw: string;
      html: string;
      editable: true;
    }
  | {
      itemId: number;
      fileType: 'html';
      title?: string | null;
      filePath: string;
      previewUrl: string;
      baseDir: string;
      sandbox: boolean;
      allowScripts: boolean;
      allowExternalResources: boolean;
      editable: false;
    };

export type SaveMarkdownContentRequest = {
  itemId: number;
  content: string;
  expectedFileHash: string;
  expectedModifiedAt?: string;
};

export type SaveMarkdownContentResponse = {
  itemId: number;
  modifiedAt: string;
  fileHash?: string | null;
  summary?: string | null;
  renderedHtml?: string | null;
  saved: true;
};
```

---

## 3. 命令清单

## 3.1 select_library
选择并登记一个本地资料库。

### invoke
```ts
invoke('select_library', {
  payload: {
    rootPath: '/Users/name/Documents/AI-Exports',
    name: 'AI Exports'
  }
})
```

### Request
```ts
export type SelectLibraryRequest = {
  rootPath: string;
  name?: string;
};
```

### Response
```ts
export type SelectLibraryResponse = Library;
```

### 行为约定
- 若 `rootPath` 已存在，则返回已有资料库记录，不重复创建
- `name` 为空时，默认取目录名
- 若 `rootPath` 与已有资料库存在父子嵌套关系，应拒绝创建并返回业务错误
- 仅登记资料库，不自动触发扫描

---

## 3.2 list_libraries
读取资料库列表。

### invoke
```ts
invoke('list_libraries')
```

### Response
```ts
export type ListLibrariesResponse = Library[];
```

---

## 3.3 scan_library
触发资料库扫描。

### invoke
```ts
invoke('scan_library', {
  payload: {
    libraryId: 1,
    mode: 'full'
  }
})
```

### Request
```ts
export type ScanLibraryRequest = {
  libraryId: number;
  mode?: 'full' | 'incremental';
};
```

### Response
```ts
export type ScanLibraryResponse = {
  libraryId: number;
  mode: 'full' | 'incremental';
  scannedCount: number;
  createdCount: number;
  updatedCount: number;
  deletedCount: number;
  startedAt: string;
  finishedAt: string;
};
```

### 行为约定
- `full` 递归扫描整个资料库
- `incremental` 基于现有索引做增量校验
- 只处理 `.html` / `.md`
- 删除文件时，将对应 `items.is_deleted` 置为 `1`
- 被软删除的文件必须同步从 FTS 结果中移除

---

## 3.4 list_items
获取文件列表，供中间卡片流使用。

### invoke
```ts
invoke('list_items', {
  query: {
    libraryId: 1,
    keyword: 'prompt',
    fileTypes: ['html'],
    tagIds: [3, 8],
    includeDeleted: false,
    sortBy: 'modifiedAt',
    sortOrder: 'desc',
    page: 1,
    pageSize: 30
  }
})
```

### Request
```ts
export type ListItemsQuery = {
  libraryId?: number;
  keyword?: string;
  fileTypes?: Array<'html' | 'markdown'>;
  tagIds?: number[];
  includeDeleted?: boolean;
  sortBy?: 'modifiedAt' | 'fileName' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};
```

### Response
```ts
export type ListItemsResponse = PagedResult<ItemSummary>;
```

### 行为约定
- `keyword` 同时搜索文件名、标题、正文
- `includeDeleted` 默认为 `false`
- 当 `includeDeleted = false` 时，必须过滤 `is_deleted = 1` 的记录
- `tagIds` 默认采用 AND 逻辑，便于精准筛选
- 默认排序：`modifiedAt desc`
- 不返回任何 `isExpanded` / `isCollapsed` / `panelMode` 一类 UI 布局字段

---

## 3.5 get_item_detail
获取单文件详情。

### invoke
```ts
invoke('get_item_detail', { itemId: 101 })
```

### Request
```ts
export type GetItemDetailRequest = {
  itemId: number;
};
```

### Response
```ts
export type GetItemDetailResponse = ItemDetail;
```

---

## 3.6 get_item_preview
获取活动标签页文档内容载荷。

### invoke
```ts
invoke('get_item_preview', { itemId: 101 })
```

### Request
```ts
export type GetItemPreviewRequest = {
  itemId: number;
};
```

### Response
```ts
export type GetItemPreviewResponse = DocumentPayload;
```

### 行为约定
- 当前命令名保留 `preview` 仅为兼容，实际语义是“活动标签页文档内容读取”
- Markdown 返回 `raw + html`
- HTML 返回本地可加载的 `previewUrl`
- HTML 同时返回 `baseDir`、脚本开关、外链资源开关，前端不得自行猜测资源与安全策略
- 文档内容加载失败时，前端应展示错误占位
- 该接口不关心当前 UI 是展开、折叠还是分栏，只返回稳定文档内容数据

---

## 3.7 save_markdown_content
保存 Markdown 轻编辑内容。

### invoke
```ts
invoke('save_markdown_content', {
  payload: {
    itemId: 101,
    content: '# New Title\n\nupdated content',
    expectedFileHash: 'sha256:abc123',
    expectedModifiedAt: '2026-04-22T13:30:00Z'
  }
})
```

### Request
```ts
export type SaveMarkdownContentRequest = {
  itemId: number;
  content: string;
  expectedFileHash: string;
  expectedModifiedAt?: string;
};
```

### Response
```ts
export type SaveMarkdownContentResponse = {
  itemId: number;
  modifiedAt: string;
  fileHash?: string | null;
  summary?: string | null;
  renderedHtml?: string | null;
  saved: true;
};
```

### 行为约定
- 仅 `markdown` 文件可调用
- 保存成功后，后端必须同步刷新文件内容、摘要、Markdown 渲染缓存与搜索索引
- `expectedFileHash` 是主冲突检测条件，`expectedModifiedAt` 只作为辅助校验
- 若 `expectedModifiedAt` 或 `expectedFileHash` 与当前文件不一致，应拒绝覆盖并返回冲突错误
- 此接口只负责内容保存，不承载 UI 编辑态、展开态、草稿态

---

## 3.8 list_tags
读取所有标签。

### invoke
```ts
invoke('list_tags')
```

### Response
```ts
export type ListTagsResponse = Tag[];
```

---

## 3.9 create_tag
新增标签。

### invoke
```ts
invoke('create_tag', {
  payload: {
    name: '灵感库',
    color: '#D9D9D9'
  }
})
```

### Request
```ts
export type CreateTagRequest = {
  name: string;
  color?: string;
};
```

### Response
```ts
export type CreateTagResponse = Tag;
```

### 行为约定
- 标签名全局唯一
- 重名时返回业务错误 `TAG_NAME_EXISTS`

---

## 3.10 update_tag
更新标签。

### invoke
```ts
invoke('update_tag', {
  payload: {
    id: 3,
    name: '案例',
    color: '#BEBEBE'
  }
})
```

### Request
```ts
export type UpdateTagRequest = {
  id: number;
  name?: string;
  color?: string | null;
};
```

### Response
```ts
export type UpdateTagResponse = Tag;
```

---

## 3.11 delete_tag
删除标签。

### invoke
```ts
invoke('delete_tag', { id: 3 })
```

### Request
```ts
export type DeleteTagRequest = {
  id: number;
};
```

### Response
```ts
export type DeleteTagResponse = {
  success: true;
};
```

### 行为约定
- 删除标签时，同时删除 `item_tags` 关联
- 不删除文件本身

---

## 3.12 set_item_tags
覆盖写入某个文件的标签。

### invoke
```ts
invoke('set_item_tags', {
  payload: {
    itemId: 101,
    tagIds: [1, 5, 8]
  }
})
```

### Request
```ts
export type SetItemTagsRequest = {
  itemId: number;
  tagIds: number[];
};
```

### Response
```ts
export type SetItemTagsResponse = {
  itemId: number;
  tags: Tag[];
};
```

### 行为约定
- 采用覆盖式写入，便于前端保存当前标签面板状态
- 非法 tagId 应返回 `TAG_NOT_FOUND`

---

## 3.13 generate_thumbnail
为单个 HTML 文件触发缩略图生成。

### invoke
```ts
invoke('generate_thumbnail', { itemId: 101 })
```

### Request
```ts
export type GenerateThumbnailRequest = {
  itemId: number;
};
```

### Response
```ts
export type GenerateThumbnailResponse = ThumbnailInfo & {
  itemId: number;
};
```

### 行为约定
- 仅 `html` 文件可生成缩略图
- 若缓存可复用，可直接返回 `ready`
- 若进入后台生成队列，可先返回 `pending`

---

## 3.14 watch_library
启动目录监听。

### invoke
```ts
invoke('watch_library', { libraryId: 1 })
```

### Request
```ts
export type WatchLibraryRequest = {
  libraryId: number;
};
```

### Response
```ts
export type WatchLibraryResponse = {
  libraryId: number;
  watching: boolean;
};
```

### 行为约定
- 同一个资料库重复监听时应幂等
- 监听事件触发后，后端更新数据库
- 前端可通过轮询 `list_items` 或订阅事件刷新 UI

---

## 4. 建议补充事件

如果后面接 Tauri event，建议定义这几类：

```ts
export type LibraryScanProgressEvent = {
  libraryId: number;
  stage: 'started' | 'scanning' | 'indexing' | 'finished' | 'failed';
  scannedCount?: number;
  totalCount?: number;
  message?: string;
};

export type ThumbnailUpdatedEvent = {
  itemId: number;
  status: 'pending' | 'ready' | 'failed' | 'stale';
  path?: string | null;
};

export type LibraryChangedEvent = {
  libraryId: number;
  reason: 'created' | 'updated' | 'deleted' | 'bulk-refresh';
  itemIds?: number[];
};

export type MarkdownSavedEvent = {
  itemId: number;
  modifiedAt: string;
  summary?: string | null;
};
```

---

## 5. 错误码建议

```ts
export type ErrorCode =
  | 'INVALID_PARAMS'
  | 'LIBRARY_NOT_FOUND'
  | 'LIBRARY_PATH_OVERLAP'
  | 'ITEM_NOT_FOUND'
  | 'TAG_NOT_FOUND'
  | 'TAG_NAME_EXISTS'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'PREVIEW_LOAD_FAILED'
  | 'EDIT_CONFLICT'
  | 'MARKDOWN_SAVE_FAILED'
  | 'THUMBNAIL_GENERATION_FAILED'
  | 'DATABASE_ERROR'
  | 'IO_ERROR'
  | 'INTERNAL_ERROR';
```

---

## 6. 第一批前后端联调顺序

建议按这个顺序联调：

1. `select_library`
2. `scan_library`
3. `list_items`
4. `get_item_preview`（活动标签页文档内容载荷）
5. `save_markdown_content`
6. `list_tags` / `create_tag`
7. `set_item_tags`
8. `generate_thumbnail`
9. `watch_library`

这个顺序能最快形成可演示闭环。
