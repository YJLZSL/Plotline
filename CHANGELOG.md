# 更新日志

本文件记录 **Plotline** 的所有重要变更。格式遵循
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。

## [1.5.0] - 2026-06-23

**目标**：完善 AI 助手多服务商支持、统一应用图标、修复数据导入与错误处理缺陷，发布 v1.5.0 小版本。

### 新增
- **AI 服务商预设** (`src/features/ai/providers.tsx` +
  `src/components/views/SettingsView.tsx`)：
  设置页 AI 标签新增可视化服务商选择卡片，内置 OpenAI、硅基流动、火山方舟、
  腾讯混元、DeepSeek、Moonshot、智谱 AI、Ollama 本地、自定义共 9 种预设，
  每个预设携带官方品牌色、简化单色 SVG 图标、推荐 baseUrl 与模型名。
  点击预设自动填充 baseUrl 并补全推荐模型，并提供「获取 API Key」直达链接。
  AI 助手面板顶部同步显示当前服务商品牌图标，保证视觉一致。
- **全新统一应用图标** (`src-tauri/icons/icon.svg` + `scripts/render-icon.py` +
  `src/components/ui/BrandMark.tsx`)：
  重新设计羽毛笔沿时间线书写的优雅图标，应用内外使用同一构图。
  应用内 `BrandMark` 线性图标与应用图标（512×512 渐变背景）完全统一，
  消除此前 BrandMark（书本+羽毛笔）与 icon.svg（波浪线+羽毛笔）不一致问题。
  使用 Skia 重新渲染所有 19 个 PNG/ICO 尺寸。
- **竞品调研文档** `docs/COMPETITOR_RESEARCH.md`。
- **问题审计文档** `docs/ISSUE_AUDIT.md`。
- **新单元测试**：
  前端 `src/features/ai/providers.test.ts`（7 项）验证预设完整性、
  主流厂商覆盖、Ollama 本地端点、未知 id 回退逻辑；
  Rust 端 `services::workspace::tests`（4 项）验证导入笔记归属正确工作区、
  笔记文件夹层级保留、大纲父子层级保留、生成新工作区 ID；
  Rust 端 `services::location::tests::should_reject_link_across_workspaces`
  验证跨工作区连接被拒绝。

### 变更
- **应用版本号** 从 `1.4.0` 同步升级到 `1.5.0`（`package.json`、
  `src-tauri/tauri.conf.json`、`SettingsView`）。
- `services::location::link` 新增 `workspace_id` 校验，拒绝跨工作区连接地点，
  移除 `models::location::LinkLocationsInput.workspace_id` 上的 `#[allow(dead_code)]`。
- `services::ai::kv_set` 移除生产路径上的 `unwrap()`，改用 `ok_or_else` 返回
  `AppError::Internal`，避免极端情况下 panic。
- 统计与计数查询（`services::statistics`、`services::track`、`services::outline`、
  `services::vn`）将 `.unwrap_or(0)` 替换为 `?` 错误传播，避免数据库错误被静默吞掉。
- `services::note` 与 `services::character` 的 `parse_json_array` 在 JSON 损坏时
  记录 `log::warn` 而非静默返回空数组。
- `services::workspace` 的设置 JSON 解析在损坏时记录 `log::warn`。
- `lib.rs` 启动时 `create_dir_all` 失败记录 `log::warn` 而非静默 `.ok()`。

### 修复
- **HIGH 修复导入笔记归属错误** (`services::workspace::import_bundle`)：
  导入工作区时笔记使用了原始 `workspace_id` 而非新生成的 `new_ws_id`，
  导致笔记成为孤儿数据不可见。现已修正并保留笔记文件夹层级（`folder_id` 重映射）。
- **HIGH 修复导入大纲层级丢失** (`services::workspace::import_bundle`)：
  导入时大纲节点 `parent_id` 被硬编码为 `NULL`，导致整棵大纲树扁平化。
  现已构建 `outline_map` 重映射父子关系。
- **修复 `services::track::delete` 计数吞错**：
  COUNT 查询使用 `unwrap_or(0)`，数据库故障时计数变为 0 触发"至少保留一个轨道"
  误报；改用 `?` 传播真实错误。

### 文档
- 更新 `AGENTS.md` 当前迭代状态至 v1.5.0 完成。
- 重写 `HANDOFF.md` 为 v1.5.0 交接文档。

---

## v1.4.0 发布操作手册（运营者步骤）

> **状态**：v1.4.0 已发布 ✅  
> Release 地址：https://github.com/YJLZSL/Plotline/releases/tag/v1.4.0

v1.4.0 由 `feat/v1.4-ai-vn-map` 分支经 GitHub Actions `release.yml` 自动构建并上传，
产物包括 `Plotline_1.4.0_x64-setup.exe`、`Plotline_1.4.0_x64_en-US.msi` 与 `latest.json`。
旧版客户端（v1.3.0+）通过 `https://github.com/YJLZSL/Plotline/releases/latest/download/latest.json`
检测更新并可在应用内一键安装。

后续版本（v1.5.0+）可按以下步骤发布：

1. **签名密钥对**（已在 v1.3.0 生成，私钥务必安全保管，不可提交）：
   - 私钥：`keys/plotline.key`（已加入 `.gitignore`）
   - 公钥：`keys/plotline.key.pub`（已填入 `src-tauri/tauri.conf.json`）
   - 若重新生成：`pnpm tauri signer generate -w keys/plotline.key --force`
2. **CI 机密**：把私钥内容设置到 GitHub 仓库 Settings → Secrets and variables → Actions：
   - `TAURI_SIGNING_PRIVATE_KEY` = `keys/plotline.key` 的完整内容
   - 无密码时无需设置 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
3. **本地发布构建**（无 `pnpm` 时使用替代命令）：
   ```bash
   ./node_modules/.bin/tsc --noEmit
   ./node_modules/.bin/eslint . --max-warnings=0
   ./node_modules/.bin/vitest run
   export PATH="$PATH:/c/Users/23501/.cargo/bin"
   cargo test --manifest-path src-tauri/Cargo.toml --lib
   # 临时将 tauri.conf.json 的 beforeBuildCommand 改为 Node 直接调用后：
   ./node_modules/.bin/tauri build
   ```
4. **签名安装包并生成 latest.json**：
   ```bash
   ./node_modules/.bin/tauri signer sign --private-key-path keys/plotline.key \
     src-tauri/target/release/bundle/nsis/Plotline_1.3.0_x64-setup.exe
   # 将生成的 .sig 内容填入 releases/v1.3.0/latest.json 的 signature 字段
   ```
5. **推送标签触发 CI 发布**：
   ```bash
   git tag v1.4.0
   git push origin v1.4.0
   ```
   `.github/workflows/release.yml` 会构建 Windows 安装包并连同 `latest.json`
   一起上传到对应的 GitHub Release（应用内更新客户端轮询的就是 `latest.json`）。
   
   > 若 CI 构建失败或需要手动上传，可使用 [GitHub MCP 插件](https://github.com/cli/cli) 或 `gh` CLI 直接创建 Release 并上传产物。
6. **验证自动更新**：启动已安装的旧版本，应用在启动时会自动弹出应用内更新提示；
   也可在 *设置 → 关于 → 检查更新* 手动触发。点击「下载并安装」后应用会自动关闭并替换为新版本。

---

### Windows 本地构建前置条件

`pnpm tauri build` 在 Windows 上需要以下任一前置条件之一：

- 安装 [WiX Toolset v3](https://wixtoolset.org/releases/) 以产出 `.msi`
- 或安装 [NSIS](https://nsis.sourceforge.io/Download) 以产出 `.exe`

若两者都缺失，`pnpm tauri build` 会在打包阶段失败但 Rust 部分会成功编译。
推荐通过 GitHub Actions 的 `release.yml` 完成跨平台打包，本机仅做开发预览。

---

## [1.4.0] - 2026-06-22

**目标**：补齐 AI 创作助手（KV 缓存 + RAG 检索增强）、VN 与地图高级功能、
全新开场动画与美术动效打磨，并发布 v1.4.0 Windows 安装包，实现旧版应用内自动更新。

### 新增
- **AI 创作助手** (`src/components/layout/AiAssistantPanel.tsx` +
  `src-tauri/src/services/ai.rs` + `src-tauri/src/commands/ai.rs`)：
  工作区右侧滑出面板，支持多会话、角色消息、OpenAI 兼容 API 调用。
  引入 KV 缓存 (`ai_kv`) 保存常用上下文，RAG 倒排索引 (`ai_chunks` /
  `ai_chunk_terms`) 基于工作区内容检索增强生成，降低 Token 消耗并提升回答相关性。
- **VN 功能增强** (`src/components/views/VnView.tsx` + `src/features/vn/*` +
  `src-tauri/src/services/vn.rs`)：
  台词支持排序与类型切换，新增场景关系图，预览模式升级，支持导出 Ren'Py 脚本。
- **地图功能增强** (`src/components/views/MapView.tsx` + `src/features/map/*` +
  `src-tauri/src/services/location.rs`)：
  地点节点支持自定义 emoji / Lucide 图标，连线可编辑标签，新增角色足迹连线，
  支持将地图导出为 PNG。
- **全新开场动画** (`src/components/layout/SplashOverlay.tsx`)：
  羽毛笔沿时间线书写的品牌动画，支持在设置中关闭或调整时长 (0.8s–4s)，
  并遵循 `prefers-reduced-motion`。
- **应用内自动更新升级** (`src/App.tsx` + `src/features/settings/updater.ts` +
  `src/components/views/SettingsView.tsx`)：
  关闭 Tauri 原生更新弹窗，改为启动时应用内 ConfirmDialog 提示，
  设置页保留手动检查入口，均可一键下载安装，无需用户手动卸载旧版。
- **新数据迁移** `004_ai_assistant.sql`：扩展 `app_settings` 的 AI 配置与开场动画开关。
- **新单元测试**：`SplashOverlay.test.tsx`、`MapView.test.tsx`、`VnView.test.tsx`、
  Rust 端 `services::ai::tests` 与 `services::vn::tests`。

### 变更
- **应用版本号** 从 `1.3.0` 同步升级到 `1.4.0`（`package.json`、
  `src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`SettingsView`、
  `WorkspaceLayout`、`App` 等）。
- `tauri.conf.json` 中 `plugins.updater.dialog` 设为 `false`，由前端完全接管更新交互。
- `release.yml` 增加 NSIS 安装步骤，确保 Windows NSIS 安装包在 CI 中正常产出。

### 修复
- 修复 `SettingsView` 版本号硬编码不一致问题。
- 修复地点删除后右侧面板未清空的问题。
- 清理 Rust 端 Clippy warning（冗余闭包、无用 `Into::into`、未使用字段）。

### 文档
- 更新 `AGENTS.md` 当前迭代状态至 v1.3.0 完成、v1.4.0 方向。

---

## [1.3.0] - 2026-06-22

**目标**：补齐地图/VN 视图、修复性能与交互问题、重绘图标、实现番茄钟多主题与全局字体切换，构建发布 Windows 安装包。

### 新增
- **故事地图** (`src/components/views/MapView.tsx` + `src/features/map/*` + `src-tauri/src/services/location.rs`)：
  SVG 画布地点节点、拖拽编辑、路径连线、关联事件/角色。
- **视觉小说脚本编辑器** (`src/components/views/VnView.tsx` + `src/features/vn/*` + `src-tauri/src/services/vn.rs`)：
  场景列表、对话/旁白/选项台词、预览模式与分支跳转。
- **番茄钟组件** (`src/components/ui/PomodoroTimer.tsx` + `src/stores/pomodoro.ts`)：
  支持 25/5/15 分钟三档，warm / mc / minimal 三种主题；MC 主题使用像素字体与方块进度条。
- **全局字体主题** (`src/styles/themes.css` + `src/stores/ui.ts` + `SettingsView`)：
  设置页支持无衬线 / 等宽 / 像素三种界面字体主题，切换后即时生效。
- **高清应用图标** (`scripts/generate-icons.mjs`)：用 Node.js + Canvas 8x 超采样生成所有尺寸，替代 Python 脚本。
- **应用内自动更新** (`tauri-plugin-updater` + GitHub Releases)：
  - 启动时自动检查更新，检测到新版本后自动下载并安装；
  - 保留 *设置 → 关于 → 检查更新* 手动触发入口；
  - Ed25519 签名，公钥已写入 `src-tauri/tauri.conf.json`。
- **前端单元测试**：新增 `src/stores/pomodoro.test.ts`、`src/stores/ui.test.ts`、
  `scripts/generate-icons.test.ts`。
- **Rust 单元测试**：扩展 `commands::settings::tests` 验证 `font_theme` 读写与合并。
- **ADR-017 至 ADR-022**：记录地图/VN、图标生成、滚轮交互、视图切换动画、番茄钟、全局字体主题等决策。

### 变更
- **应用版本号** 从 `1.2.0` 同步升级到 `1.3.0`（`package.json`、`src-tauri/Cargo.toml`、
  `src-tauri/tauri.conf.json`、`WorkspaceLayout`、`SettingsView`、E2E 脚本、发布脚本等）。
- **视图切换动画降级**：`AppRoutes.tsx` `AnimatePresence mode="wait"` 改为 `mode="sync"`，
  duration 降到 `MOTION_FAST`，避免快速切换卡死。
- **列表入场 stagger delay** 统一限制到 0.1s 以内，减少动画拖慢感。
- **时间轴滚轮交互**：垂直滚轮映射为水平滚动（上滚向左、下滚向右），按住 Ctrl 时滚轮切换缩放级别。
- **UI 自适应**：Toolbar 按钮组支持换行/隐藏文字，Sidebar 折叠态保持 56px，小窗口下布局不断裂。

### 文档
- 更新 `AGENTS.md` v0.4.0：新增 v1.3 迭代重点、番茄钟/字体/图标规范。
- 更新 `产品需求与设计文档.md`：路线图拆分为 v1.2/v1.3/v1.4。
- 更新 `docs/ARCHITECTURE.md` v1.3.0：补充 map/vn/PomodoroTimer、性能与滚轮章节。
- 更新 `docs/DECISIONS.md` v1.3.0：新增 6 条 ADR。
- 更新 `docs/DATA_MODEL.md` v1.3.0：补充 locations/location_links/vn_scenes/vn_lines 与 font_theme。
- 更新 `docs/TESTING.md` v1.3.0：补充 map/vn/番茄钟测试要求与 pnpm 不可用时的替代命令。
- 更新 `README.md`：特性列表加入地图/VN/番茄钟/字体主题/高清图标。

### 修复
- 修复 `VnView.tsx` 调用 `VnPreview` 时传入未声明的 `scenes` prop 导致的类型错误。
- 修复时间轴滚轮方向与用户需求不一致的问题。

---

## [1.2.0] - 2026-06-22

**统计**：本轮迭代完成 PRD §8 第四阶段路线图全部 4 项产品能力，新增 12 个文件
（4 个布局算法 + 4 个视图组件 + 4 个测试），修改 8 个文件；前端单元测试从 60 个
增长到 97 个（+37），Rust 测试 15 个保持全绿。本机已构建
`Plotline_1.2.0_x64-setup.exe`。

### 新增
- **甘特图视图** (`src/components/views/GanttChart.tsx` + `src/features/timeline/ganttLayout.ts`)：
  时间轴视图工具栏新增「时间轴 / 甘特图」切换按钮。甘特图按轨道横向排布事件节点，
  按日期升序排列，事件条颜色跟随轨道色，选中高亮，双击进入编辑。支持轨道显隐过滤。
- **大纲树状图视图** (`src/components/views/OutlineTreeChart.tsx` +
  `src/features/outline/treeLayout.ts`)：大纲视图工具栏新增「列表 / 树状图」切换按钮。
  树状图以 SVG 绘制卷→章→场景层级，父子节点贝塞尔连线，节点颜色按类型区分，
  状态圆点指示草稿/完成/待修改，点击节点联动右侧详情。
- **角色关系矩阵视图** (`src/components/views/RelationshipMatrix.tsx` +
  `src/features/characters/relationshipMatrix.ts`)：角色视图工具栏新增「矩阵」页签。
  N×N 网格展示角色两两关系，单元格颜色按关系类型区分、不透明度按强度（1-5）递增，
  对角线自交单元格灰化，底部图例与统计关系总数，点击表头/行标签可选中角色。
- **高级统计：情节密度分布** (`src/components/views/PlotDensityChart.tsx` +
  `src/features/statistics/advancedStats.ts`)：统计视图新增条形图，按事件时间顺序
  分桶（默认 8 段），峰值段高亮琥珀色，悬停显示具体事件数。
- **高级统计：角色弧线时间轴** (`src/components/views/CharacterArcChart.tsx`)：
  统计视图新增 SVG 时间轴，每角色一行，按事件出现顺序绘制圆点（颜色=角色色，
  描边=状态色），下方列出角色弧线描述（最多 6 个）。
- **新单元测试**：`ganttLayout.test.ts`（7）、`treeLayout.test.ts`（8）、
  `relationshipMatrix.test.ts`（6）、`advancedStats.test.ts`（6）、
  `GanttChart.test.tsx`（2）、`OutlineTreeChart.test.tsx`（2）、
  `RelationshipMatrix.test.tsx`（2）、`AdvancedCharts.test.tsx`（4）。
- **国际化文案扩展**：新增 `gantt.*`、`treeChart.*`、`matrix.*`、
  `statistics.plotDensity`、`statistics.characterArc`、`statistics.peakCount`、
  `statistics.segment` 等键，同步维护 `zh-CN.json` 与 `en.json`。

### 变更
- **应用版本号** 从 `1.0.0` 同步升级到 `1.2.0`（`package.json`、
  `src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`WorkspaceLayout`、
  `SettingsView`、E2E 回归脚本、发布脚本、`Cargo.lock` 全部保持一致）。
- `TimelineView` 工具栏新增视图模式切换组（时间轴 / 甘特图）。
- `OutlineView` 工具栏新增视图模式切换组（列表 / 树状图）。
- `CharactersView` 页签新增「矩阵」选项，并订阅关系数据。
- `StatisticsView` 订阅事件与角色数据，追加两张高级统计卡片。

### 备注与后续
- 插件系统仍为可选远期规划，不在 v1.2 范围内。
- 甘特图目前按事件序列排布，未支持跨日期区间条；后续可基于 `dateValue` 计算真实时长。
- 关系矩阵为有向矩阵（[源,目标] 单元格），双向关系需建立两条记录；后续可加对称合并开关。

## [1.1.0] - 2026-06-22

**统计**：本轮迭代涉及 42 个文件（32 个修改 + 10 个新增）；新增 4 项产品能力；
新增 20 个单元测试；前端测试从 40 个增长到 60 个，Rust 测试从 11 个增长到 15 个，全部通过。

### 新增
- **富文本笔记编辑器** (`src/components/ui/RichEditor.tsx`)：基于 TipTap 2，支持粗体、斜体、
  标题、列表、引用、行内代码；替换 `NotebookView` 的纯文本 `Textarea`。
- **撤销/重做系统** (`src/stores/historyStore.ts` + `src/hooks/useHistoryDispatcher.ts` +
  `src/components/layout/HistoryControls.tsx`)：为事件、轨道、角色、笔记、大纲节点提供
  50 步历史栈；支持 Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z 快捷键。
- **Markdown 导出** (`src-tauri/src/services/export.rs` + `src/features/workspace/exportApi.ts`)：
  支持导出整个工作区或仅大纲为 Markdown；`WorkspaceSelector` 与 `OutlineView` 提供导出按钮。
- **事件连接与伏笔追踪** (`src-tauri/src/services/event.rs` 新增 `connected_event_ids` 与
  `list_connections` + `StatisticsView` 伏笔追踪面板 + `TimelineView` 连接类型切换)：
  支持因果/伏笔两种连接类型，统计视图展示伏笔生命周期列表。
- **新依赖**：`@tiptap/react`、`@tiptap/starter-kit`、`@tiptap/extension-placeholder`、
  `turndown`、`@types/turndown`。
- **新单元测试**：`src/components/ui/RichEditor.test.tsx`、`src/stores/historyStore.test.ts`、
  `src/features/timeline/eventApi.test.ts`、`src/features/workspace/exportApi.test.ts`；
  扩展 `src/lib/utils.test.ts` 与 `src/lib/mock.test.ts`。
- **Rust 测试扩展**：`services::event::tests` 新增连接加载/类型测试；
  新增 `services::export::tests` 工作区/大纲 Markdown 导出测试。

### 变更
- **应用版本号** 从 `1.0.0` 同步升级到 `1.1.0`（`package.json`、`src-tauri/Cargo.toml`、
  `src-tauri/tauri.conf.json`、`SettingsView`、`WorkspaceLayout` 五处保持一致）。
- `Event` 模型与类型新增 `connectedEventIds` 字段；`WorkspaceBundle` 新增 `eventConnections`，
  导入/导出时完整保留事件连接关系。
- `StatusBar` 显示版本更新为 `v1.1.0`，并加入撤销/重做按钮。

### 修复
- `TimelineView` 的连接绘制从 description 文本解析改为读取 `event_connections` 表，
  消除标题重名导致的连接错误。
- `workspace::import_bundle` 现在会正确导入 `event_connections`。

### 备注与后续
- Word/PDF 导出、写作辅助 AI、协作同步仍为可选远期规划，不在 v1.1 范围内。
- 撤销/重做暂未覆盖轨道排序（reorder）与大纲节点移动（move），留待后续增强。

## [1.0.0] - 2026-06-22

**实际构建产物（本机）**：
`src-tauri/target/release/bundle/nsis/Plotline_1.0.0_x64-setup.exe`
（2.86 MB，Windows x64 NSIS 安装包，已通过 `pnpm tauri build --bundles nsis` 实际产出）。

**GitHub Release**：https://github.com/YJLZSL/Plotline/releases/tag/v1.0.0
（已上传 `Plotline_1.0.0_x64-setup.exe` 作为 asset；自动更新客户端将从此处的
`latest.json` 拉取更新清单）。

**统计**：本轮迭代涉及 39 个文件（30 个修改 + 9 个新增）；新增 4 项产品能力；
2 项视觉系统焕新；修复 1 项禁令违规缺陷。单元测试从 31 个增长到 40 个，全部通过。

### 新增
- **Plotline 品牌标记** (`src/components/ui/BrandMark.tsx`)：手绘风羽毛笔 + 书脊融合 SVG。
  应用于 Sidebar 顶部、`WorkspaceSelector` 导航栏与空状态、`SplashOverlay`。
- **统一图标容器** `<AppIcon>` (`src/components/ui/AppIcon.tsx`)：提供 `sm/md/lg`
  尺寸与 `neutral/accent/muted/inherit` 色调 token，统一了侧边栏、空状态等装饰性
  图标的呈现。
- **动效 token** (`src/lib/motion.ts`)：`MOTION_FAST` (160ms) / `MOTION_BASE` (220ms)
  / `MOTION_SLOW` (300ms)，全部使用 PRD §5.5 规定的
  `cubic-bezier(0.16, 1, 0.3, 1)` 缓动曲线。把"裸字面量"替换为引用 token。
- **启动自动备份** (`src-tauri/src/services/backup.rs`)：应用每次启动时把
  SQLite 文件复制到 `backups/plotline-<ISO8601>.db`，并按文件名排序保留最近 10 份；
  失败仅写日志、不阻塞主流程。
- **时间线一致性检查** (`src-tauri/src/services/consistency.rs` + IPC
  `check_consistency` + `TimelineView` 工具栏按钮)：检测"同一角色在同一 `date_value`
  出现在多个轨道"的冲突，通过 Toast 友好反馈。
- **自动更新基础设施**：集成 `tauri-plugin-updater` 与 `@tauri-apps/plugin-updater`，
  `tauri.conf.json` 配置 GitHub Releases 端点，`SettingsView → 关于` 提供
  "检查更新" 按钮。pubkey 在首次发布时由运营者填入（详见上方发布操作手册）。
- **国际化文案扩展**：新增 `toast.backupFailed`、`settings.checkUpdate*`、
  `timeline.consistency*`，同时维护 `zh-CN.json` 与 `en.json`。
- **新单元测试**：`src/lib/motion.test.ts`、`src/components/ui/AppIcon.test.tsx`、
  `src/components/ui/BrandMark.test.tsx`、`src/lib/mock.test.ts` 一致性用例；
  Rust 端 `services::backup::tests`（4 个）与 `services::consistency::tests`（3 个）。
- **发布脚本与可视化点击回归**：新增 `scripts/release-v1.ps1` 一键校验脚本，
  以及 `tests/e2e/visual/release-smoke.spec.ts` 真实浏览器点击 + 截图留痕脚本。

### 变更
- **应用版本号** 从 `0.2.0` 同步升级到 `1.0.0`（`package.json`、`src-tauri/Cargo.toml`、
  `src-tauri/tauri.conf.json` 三处保持一致）。
- **动效统一**：全仓库不再出现裸 `duration: 0.25`，所有 framer-motion `transition`
  改为引用 `@/lib/motion` 中的 token。
- **CSS `fade-in`** 关键帧从 300ms 调整到 220ms 以符合微交互节奏。
- **`SplashOverlay`** 用 `<BrandMark>` 代替临时内联 SVG，去掉"白色 P"占位 logo。
- **`Sidebar` 头部** 用 `<BrandMark size={20} />` 替换字母 "P"。
- **`Button` 载入态** 从旋转 spinner 改为三点呼吸动画（修复 AGENTS 禁令）。
- **`tauri.conf.json`** 新增 `plugins.updater` 段；`capabilities/default.json` 新增
  `updater:default` 权限。
- **`lib.rs`** `setup` 钩子在数据库打开前调用一次自动备份；`invoke_handler`
  注册 `check_consistency` 命令；构建器注册 `tauri_plugin_updater`。

### 修复
- **AGENTS 禁忌清单违规** —— `Button.tsx` 的 `border-t-transparent animate-spin`
  旋转 loading 替换为符合 PRD §5.5 的脉冲点 (`pulse-dot` 关键帧)。
- **`Feedback.tsx`** 移除未使用的 `EASE_STANDARD` 导入残留。
- **`WorkspaceSelector`** 不再导入已被替换的 `Sparkles` 图标，避免未使用导入告警。

### 备注与后续
- 备份失败目前仅写日志、未通过 Tauri event 反馈到前端 Toast；预留国际化文案键
  `toast.backupFailed`，下一轮可加事件管线。
- 时间线"一致性冲突"目前只在 Toast 计数提示，未在事件卡片上以红色圆点标注；
  下一轮可基于 `check_consistency` 返回的 `eventIds` 增强 UI。
- 富文本笔记（TipTap 2）、撤销/重做、Markdown 导出仍未实现，留待 v1.1 切片。
