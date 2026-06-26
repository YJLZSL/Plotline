# Plotline v2.5.0 迭代计划

## 目标
完成以下四大功能模块，构建并发布 v2.5.0：
1. 时间轴图片插入功能
2. 小说写作模块
3. VN 增强
4. MC 主题与番茄钟增强（真正MC元素）
5. 文档更新 + 自动更新签名修复

## 版本号
v2.5.0

---

## Stage 1 — 数据库与后端基础（必须串行，先完成）

### 1.1 时间轴事件图片
- 迁移 `011_event_images.sql`: `ALTER TABLE events ADD COLUMN image_urls TEXT` (JSON 数组存储图片路径)
- 更新 `models/event.rs`: `Event` 和 `CreateEventInput`/`UpdateEventInput` 添加 `image_urls: Option<Vec<String>>`
- 更新 `services/event.rs`: list/get/create/update 处理 `image_urls` 字段
- 更新 `commands/event.rs`: 暴露新字段
- 更新 `src/types/event.ts`: 同步 TS 类型

### 1.2 小说模块（Novel）
- 迁移 `012_novel_chapters.sql`: 创建 `novel_chapters` 表
  - id, workspace_id, outline_node_id, title, content, word_count, status, sort_order, created_at, updated_at
- 新建 `models/novel.rs`: NovelChapter 结构
- 新建 `services/novel.rs`: CRUD + word_count 自动计算
- 新建 `commands/novel.rs`: IPC 命令
- 注册到 `lib.rs`
- 更新 `src/types/novel.ts`: TS 类型
- 新建 `src/features/novel/api.ts`: 前端 IPC 封装

### 1.3 VN 增强
- 迁移 `013_vn_sprites.sql`: `vn_lines` 表新增 `sprite_position` 字段 (left/center/right)
- 更新 `models/vn.rs` 和 `services/vn.rs`

---

## Stage 2 — 前端功能（可并行）

### 2.1 时间轴图片插入（Agent 1）
- 事件编辑对话框新增图片上传/插入UI
- 使用 Tauri 文件选择器选择图片
- 图片存储到 `app_data/images/<workspace_id>/events/<event_id>/`
- 事件详情面板展示图片缩略图
- 上传API: `upload_event_image` 命令

### 2.2 小说模块（Agent 2）
- 新建 `src/features/novel/` 目录
- 小说视图组件：`NovelView.tsx` — 分栏布局：左侧大纲树（复用outline组件），右侧编辑器（TipTap）
- 章节列表展示在大纲树旁边
- 编辑器支持富文本，底部显示字数
- 关联大纲节点：每个章节对应一个 outline_node（场景/章）
- 从时间线/大纲生成草稿：AI 辅助功能
- 新建视图路由

### 2.3 VN 增强（Agent 3）
- 立绘插槽拖拽定位（左/中/右）
- 完整预览播放器（带分支选择）
- Ren'Py 导出增强（音频、转场、变量）

### 2.4 MC 主题与番茄钟增强（Agent 4）
- 新增像素纹理：
  - 苦力怕脸（Creeper face）- 作为完成提示的图标
  - 钻石块（Diamond ore）- 作为特殊按钮/成就纹理
  - 红石块（Redstone block）- 作为强调/危险按钮纹理
  - 黑曜石（Obsidian）- 作为深色面板纹理
  - 金块（Gold block）- 作为奖励/成就纹理
- 番茄钟新增更多MC元素：
  - 进度条用不同方块类型表示不同状态（草方块=专注、钻石=高效、红石=警告）
  - 完成动画：苦力怕爆炸效果（CSS动画）
  - 计时器数字用方块数字风格

---

## Stage 3 — 测试、文档与发布

### 3.1 测试
- 新增测试：event image CRUD、novel chapter CRUD、VN sprite position
- 运行 `pnpm test:run` + `cargo test`

### 3.2 文档更新
- `更新日志.md`: v2.5.0 条目
- `交接文档.md`: 更新版本号、完成工作、遗留问题
- `产品路线图.md`: 标记已完成项
- `AGENTS.md`: 更新迭代状态
- `docs/文档索引.md`: 更新状态

### 3.3 发布
- 统一版本号：`package.json` = `Cargo.toml` = `tauri.conf.json` = `2.5.0`
- 创建 `releases/v2.5.0/latest.json`（含真实签名）
- 打 tag `v2.5.0` 触发 CI
- 验证 Release 页面包含 `.sig` 和 `latest.json`
- 修复自动更新签名（使用 GitHub Secret 或手动签名）

---

## 执行顺序

```
Stage 1 串行（数据库+后端）
├── 1.1 事件图片迁移
├── 1.2 小说模块迁移+后端
├── 1.3 VN 增强迁移
└── 注册到 lib.rs / migrate.rs

Stage 2 并行（4个前端 Agent）
├── Agent 1: 时间轴图片
├── Agent 2: 小说模块
├── Agent 3: VN 增强
└── Agent 4: MC主题+番茄钟

Stage 3 串行（测试+文档+发布）
├── 运行测试
├── 更新文档
├── 版本号统一
├── 创建 latest.json
├── 打 tag
└── 验证 Release
```

## 密钥提醒
若 CI 构建缺少 `.sig`，参考 `docs/密钥管理指南.md`：
- 方案A：通过 GitHub Secret 配置 `TAURI_SIGNING_PRIVATE_KEY`
- 方案B：手动签名后上传

> 最后更新：2026-06-26
