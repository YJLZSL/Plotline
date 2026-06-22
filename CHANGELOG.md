# 更新日志

本文件记录 **Plotline** 的所有重要变更。格式遵循
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。

## v1.0 发布操作手册（运营者步骤）

1. **生成签名密钥对**（一次性，安全保管私钥）：
   `pnpm tauri signer generate -w ~/.tauri/plotline.key`
2. 把 **公钥** 填入 `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`，
   替换占位符 `REPLACE_WITH_PUBLIC_KEY_AFTER_RELEASE_SETUP`。
3. 把 **私钥** 与密码导入 CI 机密：`TAURI_SIGNING_PRIVATE_KEY` 与
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`。
4. 在仓库根目录执行 `pwsh scripts/release-v1.ps1`（或手动依次执行
   `pnpm lint && pnpm typecheck && pnpm test && cargo test --manifest-path src-tauri/Cargo.toml && pnpm tauri build`）。
5. 升级版本号时务必保持三处同步：`package.json`、`src-tauri/Cargo.toml`、
   `src-tauri/tauri.conf.json`（v1.0.0 已同步完毕）。
6. 推送标签触发 CI 发布：`git tag v1.0.0 && git push --tags`。
   `.github/workflows/release.yml` 会构建三平台安装包并连同 `latest.json`
   一起上传到对应的 GitHub Release（更新客户端轮询的就是 `latest.json`）。
7. Release 发布后，在已安装的旧版本里打开 *设置 → 关于 → 检查更新*
   验证：应当检测到新版本并提示升级。

### Windows 本地构建前置条件

`pnpm tauri build` 在 Windows 上需要以下任一前置条件之一：

- 安装 [WiX Toolset v3](https://wixtoolset.org/releases/) 以产出 `.msi`
- 或安装 [NSIS](https://nsis.sourceforge.io/Download) 以产出 `.exe`

若两者都缺失，`pnpm tauri build` 会在打包阶段失败但 Rust 部分会成功编译。
推荐通过 GitHub Actions 的 `release.yml` 完成跨平台打包，本机仅做开发预览。

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
