# 技术决策记录（ADR）

> 本文件记录 Plotline 项目的关键技术决策及其背景，便于回顾与未来调整。
> 新引入依赖或重大架构调整必须在此追加一条 ADR。

---

## ADR-001：选择 Tauri 2 作为桌面外壳

**状态**：已采纳  
**日期**：2026-06-22

### 背景
PRD 要求"本地优先"创作工具，需要桌面级体验、文件系统访问、跨平台。候选方案：
- Electron
- Tauri 2
- 纯 Web + PWA

### 决策
选择 **Tauri 2**。

### 理由
- 包体积：Tauri ~10MB，Electron ~150MB。
- 内存：Tauri 用系统 webview，无需打包 Chromium。
- 性能：Rust 后端原生性能，SQLite 等库无 GC 抖动。
- 安全：默认 CSP 严格，IPC 类型化。
- AI 友好：Rust 代码相对容易推理，类型系统强。

### 后果
- macOS / Linux 依赖系统 webview2 / webkitgtk（用户需安装，但 Tauri 安装器会处理）。
- Rust 编译时间较长，CI 需缓存 `target/`。

---

## ADR-002：选择 SQLite + rusqlite 作为本地数据库

**状态**：已采纳  
**日期**：2026-06-22

### 背景
候选方案：
- JSON 文件 + 内存索引
- SQLite
- sled / redb 等嵌入式 KV

### 决策
**SQLite + rusqlite**。

### 理由
- 关系数据：事件-角色-轨道-关系是多对多，SQL JOIN 最自然。
- 事务保证：复杂写入（如删除工作区级联）需要事务。
- 成熟稳定：100+ 年工程实践，无数据损坏风险。
- rusqlite 同步 API 简单，避免 async 复杂度（Tauri commands 自带 async）。
- 备份简单：复制 `.db` 文件即可。

### 后果
- 需手写迁移脚本（`migrations/`）。
- 高并发写入受限（单写者），但本地单用户场景足够。

---

## ADR-003：状态管理采用 Zustand，而非 Redux

**状态**：已采纳  
**日期**：2026-06-22

### 理由
- 样板代码少：`create((set) => ({...}))` 一行搞定。
- 学习成本低，AI 接手友好。
- 配合 TanStack Query 处理服务端状态，职责清晰：Zustand 管 UI/会话，Query 管缓存。

### 后果
- 中间件生态比 Redux 小，但本项目用不到复杂中间件。

---

## ADR-004：时间轴用 SVG + Framer Motion，而非 Canvas

**状态**：已采纳  
**日期**：2026-06-22

### 背景
候选方案：
- 纯 DOM（性能差）
- SVG + Framer Motion
- Canvas（Konva）

### 决策
**SVG + Framer Motion**。

### 理由
- SVG 矢量、可访问、易绑定 React 事件。
- Framer Motion 内置 layout 动画、drag、AnimatePresence，开发体验极佳。
- 相比 Canvas 保留 DOM 语义，调试便利，CSS 主题色直接可用。
- 1000 事件以下 SVG 完全胜任；超过 2000 可后续引入 Canvas 分层。

### 后果
- a11y 比纯 Canvas 好。
- 角色关系图也用 SVG + 力导向算法实现。

---

## ADR-005：前后端类型手工同步 + Zod 运行时校验

**状态**：已采纳  
**日期**：2026-06-22

### 背景
候选方案：
- `ts-rs` / `specta` 自动生成 TS 类型
- 手工维护

### 决策
**手工维护 + Zod 校验**。

### 理由
- 类型量可控（~10 个核心模型），自动生成引入构建步骤复杂度。
- Zod 在 IPC 边界做运行时校验，防止后端字段变更导致前端崩溃。
- 手工同步迫使开发者审视字段，减少冗余。

### 后果
- 后端字段重命名需同步两处，但用 grep 即可定位。
- 必须严格约定 `camelCase` 序列化（Rust 用 `#[serde(rename_all = "camelCase")]`）。

---

## ADR-006：自动保存采用"每次变更立即落库"

**状态**：已采纳  
**日期**：2026-06-22

### 理由
- PRD 要求"所有用户操作的数据变更自动保存"。
- SQLite 写入 < 10ms，每次变更写库无感知延迟。
- 无需"保存"按钮，UX 简化。

### 后果
- 写入频繁时需注意 SQLite WAL 模式（已在 migrations 配置）。
- 撤销/重做基于前端操作栈，落库后不回滚数据库（用户撤销会触发反向写命令）。

---

## ADR-007：i18n 默认中文，支持繁体与英文

**状态**：已采纳  
**日期**：2026-06-22

### 理由
- 目标用户主要在中文圈。
- i18next + react-i18next 生态成熟，AI 熟悉。
- 所有文案走 `t('key')`，禁止硬编码。

---

## ADR-008：集中化动效 token

**状态**：已采纳  
**日期**：2026-06-22

### 背景
v0.2.0 前所有 framer-motion `transition` 使用裸字面量 `{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }`，
分布在 7 个组件中。PRD §5.5 允许 200-300ms 区间，按钮 tap 等微交互 250ms 偏慢。

### 决策
新增 `src/lib/motion.ts`，导出 `MOTION_FAST` (160ms) / `MOTION_BASE` (220ms) /
`MOTION_SLOW` (300ms) 三个 token，均使用项目标准缓动 `cubic-bezier(0.16, 1, 0.3, 1)`。
所有组件改为引用 token，禁止字面量。

### 收益
- 视觉一致性：单一缓动曲线
- 可调性：要调慢/调快只改一个文件
- 微交互更跟手（160ms vs 250ms）
- 类型安全：单元测试断言 token 关系

---

## ADR-009：启动时滚动备份 SQLite

**状态**：已采纳  
**日期**：2026-06-22

### 背景
本地优先意味着数据完全保存在用户磁盘的 SQLite 文件，缺乏云端兜底。
PRD 第三阶段需要"数据安全"保障。

### 决策
在 Tauri `setup` hook 中（数据库 `open` 之前）调用
`services::backup::backup_workspace_db`，把当前 `.db` 复制到同目录
`backups/plotline-<ISO8601>.db`，并保留最近 10 份。

### 替代方案
- **定时备份**：复杂，需要后台 task；启动备份对绝大多数用户场景已足够。
- **WAL checkpoint**：只解决 crash 恢复，不能保护用户误删。
- **云端同步**：超出本地优先范围，放在 v2 路线图。

### 失败处理
备份失败仅记录 `log::warn!`，不阻塞 `Database::open`。i18n key
`toast.backupFailed` 已预留，后续可通过 Tauri event emit 到前端 Toast。

---

## ADR-010：自动更新方案

**状态**：已采纳（待发布密钥）  
**日期**：2026-06-22

### 背景
v1.0 发布后用户分散在各自机器，需要无侵入的更新机制。

### 决策
集成 `tauri-plugin-updater` v2：
- **manifest endpoint**：`https://github.com/YJLZSL/Plotline/releases/latest/download/latest.json`
- **签名**：Ed25519，私钥由维护者本地保管，公钥写在 `tauri.conf.json`
- **触发**：用户进入 *Settings → 关于 → 检查更新* 手动触发；不做静默升级
- **回滚**：通过发布"修复版本号"覆盖（GitHub Releases 支持替换 asset）

### 部署步骤
见 `CHANGELOG.md` 顶部 "How to release v1.0" runbook。

### 风险
- pubkey 在首次发布前为占位 `REPLACE_WITH_PUBLIC_KEY_AFTER_RELEASE_SETUP`，
  此时调用 `check()` 会返回签名错误 — Toast 提示会暴露给用户。运营者应在第一次
  build 前完成密钥替换。

---

## ADR-011：时间线一致性检查（MVP 切片）

**状态**：已采纳  
**日期**：2026-06-22

### 背景
PRD §8 第三阶段提到"一致性检查（时间矛盾检测）"。完整方案需要支持区间冲突、地点冲突、
身份冲突等多种维度，工作量较大。

### 决策
v1.0 先交付最小切片：
- 仅检测"同一角色在同一 `date_value` 出现在多个 `track_id`"的冲突
- 不持久化结果，每次按钮触发即时计算
- UI 仅通过 Toast 反馈冲突数量；不在事件卡片上加红 dot（留待 v1.1）

实现位置：`src-tauri/src/services/consistency.rs` + IPC `check_consistency` +
`src/features/timeline/eventApi.ts::checkConsistency`。Mock 层在 `src/lib/mock.ts`
有对等实现，便于纯 Web 模式调试与 E2E。

---

---

## ADR-012：富文本编辑器采用 TipTap 2

**状态**：已采纳  
**日期**：2026-06-22

### 背景
PRD 第二阶段要求资料库支持富文本（标题、列表、引用、代码块）。候选方案：
- TipTap 2（基于 ProseMirror）
- Slate
- Quill
- 纯 Markdown 编辑器

### 决策
选择 **TipTap 2**。

### 理由
- 无渲染 UI，完全由 React 组件控制样式，易融入 Tailwind 主题。
- StarterKit 提供段落、标题、列表、引用、代码等常用节点/标记。
- 扩展机制清晰，未来可加入占位符、协作光标等插件。
- React 绑定 `@tiptap/react` 成熟，AI 友好。

### 后果
- 新增依赖：`@tiptap/react`、`@tiptap/starter-kit`、`@tiptap/extension-placeholder`。
- 笔记内容从纯文本升级为 HTML；旧数据为空/纯文本时作为段落渲染。

---

## ADR-013：Markdown 导出采用后端模板生成

**状态**：已采纳  
**日期**：2026-06-22

### 背景
PRD 第三阶段要求"导出为更多格式（Markdown、Word、PDF）"。

### 决策
v1.1 先实现 Markdown 导出，由 Rust 后端按工作区/大纲结构拼接字符串返回。

### 理由
- Markdown 是创作者通用格式，便于二次编辑与版本控制。
- 后端已有完整数据（workspace、tracks、events、characters、outline、notes），
  拼接逻辑简单且避免前端暴露过多数据。
- Word/PDF 需要额外库（如 `docx-rs`、`printpdf`），留在后续切片。

### 后果
- 新增 `src-tauri/src/services/export.rs` 与 IPC `export_workspace_markdown` /
  `export_outline_markdown`。
- 前端通过 Blob 下载保存 `.md` 文件。

---

## ADR-014：撤销/重做采用前端命令历史栈

**状态**：已采纳  
**日期**：2026-06-22

### 背景
PRD 非功能性需求要求支持撤销/重做。

### 决策
在前端维护一个命令历史栈（`src/stores/historyStore.ts`），每个可逆操作记录
`redo` / `undo` 两个 `HistoryAction`；`useHistoryDispatcher` 将 action 映射到
对应 API 调用。

### 理由
- 不需要改动后端，SQLite 事务已经保证单条命令原子性。
- 命令模式易于扩展新的可逆操作。
- 与 TanStack Query 缓存配合，通过 `invalidateQueries` 刷新 UI。

### 后果
- 历史栈仅保存在内存，页面刷新后丢失（符合单会话撤销预期）。
- 批量/复杂操作（如导入工作区）暂未纳入历史栈。

---

## ADR-015：事件连接与伏笔追踪

**状态**：已采纳  
**日期**：2026-06-22

### 背景
PRD 第三阶段要求"伏笔追踪系统"和"事件关联"。数据库已有 `event_connections` 表，
但 v1.0 未暴露到前端。

### 决策
- `Event` 模型新增 `connected_event_ids`（源事件指向的目标事件）。
- 新增 `EventConnection` 模型与 `list_connections` 服务，返回源/目标标题和类型。
- `TimelineView` 支持切换"因果" / "伏笔"连接类型，点击目标事件建立真实连接。
- `StatisticsView` 增加"伏笔追踪"卡片，列出所有 `foreshadow` 连接。

### 后果
- 连线绘制从 description 文本解析改为读取连接表，更准确。
- `WorkspaceBundle` 需要包含 `event_connections`，导入时重建关系。

---

## ADR-016：第四阶段可视化采用纯前端 SVG

**状态**：已采纳  
**日期**：2026-06-22

### 背景
PRD §8 第四阶段要求甘特图视图、树状图视图、关系矩阵视图、高级统计（情节分析、
角色弧线可视化）。这些视图都是对既有数据（事件、轨道、角色、关系、大纲节点）
的**只读可视化重组**，不涉及新数据写入或新查询维度。

候选方案：
- 新增 Rust IPC 命令 + SQL 聚合
- 纯前端 SVG，复用 TanStack Query 缓存

### 决策
**纯前端 SVG，零新增 IPC 命令**。

### 理由
- 数据已在客户端缓存（`useEventsQuery`、`useCharactersQuery` 等），前端聚合无网络/IPC 往返。
- 布局算法（甘特排布、树形坐标、矩阵网格、密度分桶）是纯计算，TypeScript 实现易测试。
- 不动 Rust 后端意味着 mock 层（`src/lib/mock.ts`）自动对等，E2E 与纯 Web 模式无需额外适配。
- SVG 矢量、可访问、Framer Motion 动画自然，与 ADR-004 一致。
- 1000 事件以内 SVG 完全胜任；超过后可后续引入 Canvas 分层（与时间轴同路径演进）。

### 实现
- 布局算法：`src/features/timeline/ganttLayout.ts`、`src/features/outline/treeLayout.ts`、
  `src/features/characters/relationshipMatrix.ts`、`src/features/statistics/advancedStats.ts`。
- 视图组件：`src/components/views/GanttChart.tsx`、`OutlineTreeChart.tsx`、
  `RelationshipMatrix.tsx`、`PlotDensityChart.tsx`、`CharacterArcChart.tsx`。
- 接入点：`TimelineView`（甘特切换）、`OutlineView`（树状图切换）、
  `CharactersView`（矩阵页签）、`StatisticsView`（两张高级图表卡片）。

### 后果
- 第四阶段视图均为只读，编辑仍需回到主视图（时间轴/大纲列表/角色卡片）。
- 甘特图当前按事件序列排布，未支持真实日期区间条；后续增强可基于 `dateValue` 计算。
- 关系矩阵为有向矩阵；双向关系需两条记录，后续可加对称合并开关。

---

> 文档版本：v1.2.0  
> 最后更新：2026-06-22
