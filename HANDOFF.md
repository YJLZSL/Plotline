# Plotline v1.3.0 交接文档

> 本文件面向下一个接手开发的 AI / 人类开发者，汇总当前分支状态、已完成工作、关键文件位置、已知问题与推荐下一步。

---

## 1. 分支与版本

- **当前分支**：`feat/v1.3-map-vn-polish`
- **目标版本**：`v1.3.0`
- **版本号文件**：
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`
  - `scripts/release-v1.ps1`
  - `tests/e2e/v1-ui-regression.spec.ts`
  - `tests/e2e/visual/release-smoke.spec.ts`
- **构建产物**（本地）：
  - `src-tauri/target/release/bundle/nsis/Plotline_1.3.0_x64-setup.exe`
  - `src-tauri/target/release/bundle/msi/Plotline_1.3.0_x64_en-US.msi`

---

## 2. 已完成工作（v1.3.0）

### 2.1 文档更新
- `AGENTS.md`、`docs/ARCHITECTURE.md`、`docs/DATA_MODEL.md`、`docs/DECISIONS.md`、`docs/TESTING.md`、`CHANGELOG.md`、`README.md`、`产品需求与设计文档.md` 均已更新到 v1.3.0。

### 2.2 性能与交互修复
- `src/app/AppRoutes.tsx`：路由切换使用 `AnimatePresence mode="sync"` + `MOTION_FAST`（160ms），避免快速切换卡死。
- `src/components/layout/Sidebar.tsx`：活动指示器按路由使用独立 `layoutId`，减少布局抖动。
- `src/components/views/TimelineView.tsx`：滚轮默认水平滚动，`Ctrl`/`Cmd`+滚轮切换缩放。
- 列表 stagger 动画最大延迟限制在 0.1s。

### 2.3 地图与视觉小说
- 后端：`src-tauri/src/services/location.rs`、`src-tauri/src/services/vn.rs` 提供完整 CRUD。
- 前端视图：`src/components/views/MapView.tsx`、`src/components/views/VnView.tsx`。
- `MapView` 拖拽已改为窗口级鼠标事件，避免鼠标移出窗口后丢失。

### 2.4 番茄钟多主题
- 组件：`src/components/ui/PomodoroTimer.tsx`
- 状态：`src/stores/pomodoro.ts`
- 主题：`warm` / `mc` / `minimal`，`mc` 主题使用像素字体。
- 入口：`src/components/layout/WorkspaceLayout.tsx` 状态栏可开关番茄钟。

### 2.5 全局字体主题
- 迁移：`src-tauri/migrations/003_font_theme.sql`
- 后端模型/命令：`src-tauri/src/models/settings.rs`、`src-tauri/src/commands/settings.rs`
- 前端状态：`src/stores/ui.ts` 中 `useThemeStore.setFontTheme()` 通过 CSS 变量 `--font-sans` / `--font-mono` 全局生效。
- 样式：`src/styles/themes.css` 已接入字体变量。

### 2.6 UI 自适应与美术
- `src/components/layout/Toolbar.tsx`：右侧操作区自动换行。
- `src/styles/themes.css`：统一暖色主题、圆角、阴影。
- 图标：暖色渐变背景 + 白色故事曲线 + 圆角遮罩。

### 2.7 图标重绘
- 脚本：`scripts/generate-icons.mjs`（纯 Node.js 内置模块，无 Python 依赖）。
- 测试：`scripts/generate-icons.test.ts`。
- 生成命令：`node scripts/generate-icons.mjs`。

### 2.8 测试补齐
- `src/stores/pomodoro.test.ts`
- `src/stores/ui.test.ts`
- `scripts/generate-icons.test.ts`
- `src-tauri/src/commands/settings.rs` Rust 测试模块

---

## 3. 关键命令（pnpm 不可用时）

当前环境无 `pnpm`/`npm`，已验证的替代命令：

```bash
# 类型检查
./node_modules/.bin/tsc --noEmit

# Lint
./node_modules/.bin/eslint . --max-warnings=0

# 前端单元测试
./node_modules/.bin/vitest run

# Rust 测试（Windows + MSVC）
cd "/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Auxiliary/Build"
cmd //c "vcvarsall.bat x64 && set PATH=%PATH%;C:\\Users\\23501\\.cargo\\bin && cd /d D:\\AIKFCC\\Plotline && C:\\Users\\23501\\.cargo\\bin\\cargo.exe test --manifest-path src-tauri/Cargo.toml"

# 图标生成
node scripts/generate-icons.mjs

# 前端构建
./node_modules/.bin/tsc -b && ./node_modules/.bin/vite build

# Tauri 发布构建（pnpm 不可用时需改 tauri.conf.json beforeBuildCommand）
# 临时把 src-tauri/tauri.conf.json 的 beforeBuildCommand 改为：
# "node ./node_modules/typescript/lib/tsc.js -b && node ./node_modules/vite/bin/vite.js build"
# 再执行：
export PATH="$PATH:/c/Users/23501/.cargo/bin"
cd "/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Auxiliary/Build"
cmd //c "vcvarsall.bat x64 && cd /d D:\\AIKFCC\\Plotline && D:\\AIKFCC\\Plotline\\node_modules\\.bin\\tauri.cmd build"
```

> 标准环境仍保留 `pnpm build` / `pnpm tauri build`，`tauri.conf.json` 已恢复为 `"beforeBuildCommand": "pnpm build"`。

---

## 4. 自动更新（v1.3.0 已配置）

- **机制**：`tauri-plugin-updater` v2 + GitHub Releases + `latest.json`。
- **启动行为**：`src-tauri/src/lib.rs` 在应用启动后自动调用 `updater.check()`，检测到新版本时弹出对话框，用户确认后自动下载并安装。
- **手动触发**：保留 *设置 → 关于 → 检查更新* 入口。
- **密钥**：
  - 私钥：`keys/plotline.key`（**已加入 `.gitignore`，绝不可提交**）
  - 公钥：已写入 `src-tauri/tauri.conf.json`
- **CI Secret**：正式发布前必须把私钥内容设置到 GitHub 仓库 Secrets：
  - `TAURI_SIGNING_PRIVATE_KEY` = `keys/plotline.key` 的完整内容
- **latest.json**：本地草稿位于 `releases/v1.3.0/latest.json`，正式发布时应作为 release asset 上传，并确保 URL 与 `tauri.conf.json` 的 endpoint 一致。

## 5. 已知问题与注意事项

1. **cargo 路径**：当前 Git Bash 默认 PATH 不含 `~/.cargo/bin`，运行 `cargo` 或 `tauri` 前需手动追加。
2. **pnpm 缺失**：CI/本地若无 pnpm，需使用上述替代命令或安装 pnpm/corepack。
3. **Rust warning**：`src-tauri/src/models/location.rs:62` `workspace_id` 字段未使用，不影响构建，但建议 v1.4 清理或启用。
4. **Tauri 警告**：`identifier` 以 `.app` 结尾，macOS 上可能冲突；本项目当前只发布 Windows，可忽略或在 v1.4 调整。
5. **测试范围**：MapView / VnView 的 UI 交互测试尚未补齐，主要以端到端测试覆盖。
6. **发布流程**：v1.3.0 已通过 GitHub Release 手动发布成功，后续可推送 tag 触发 `.github/workflows/release.yml` 自动构建。

## 6. GitHub Release 发布记录（v1.3.0 已完成）

v1.3.0 已发布到 https://github.com/YJLZSL/Plotline/releases/tag/v1.3.0，包含 NSIS 安装包、MSI 安装包及自动更新清单 `latest.json`。

后续版本若无法通过 CI 自动发布，可按以下步骤手动创建 Release：

1. 在 GitHub 仓库 Settings → Secrets and variables → Actions 中设置：
   - `TAURI_SIGNING_PRIVATE_KEY` = `keys/plotline.key` 完整内容
2. 打开 <https://github.com/YJLZSL/Plotline/releases/new>，选择 tag（或新建）。
3. 上传以下文件（来自 `src-tauri/target/release/bundle/`）：
   - `nsis/Plotline_*.exe` 及 `.sig`
   - `msi/Plotline_*.msi` 及 `.sig`
   - `releases/vX.Y.Z/latest.json`
4. 发布后确认 `https://github.com/YJLZSL/Plotline/releases/latest/download/latest.json` 可访问。
5. 在旧版本客户端启动或点击"检查更新"，验证自动更新流程。

## 7. 推荐下一步（v1.4）

按优先级：
1. **空状态与插画**：为 Map、VN、Timeline 空状态补齐统一插画与 i18n 文案。
2. **地图增强**：节点自定义图标、角色足迹连线、导出 PNG。
3. **VN 编辑器**：台词文本编辑、角色立绘插槽、预览播放器。
4. **番茄钟闭环**：每日专注统计、写作目标绑定、系统通知。
5. **主题扩展**：更多预设主题、主题市场接口预留。
6. **E2E 回归**：更新 `tests/e2e/visual/release-smoke.spec.ts` 覆盖 Map/VN/Pomodoro。

---

## 6. 如何继续开发

1. 先阅读 `AGENTS.md` 与本文件。
2. 运行基线检查：
   ```bash
   ./node_modules/.bin/tsc --noEmit
   ./node_modules/.bin/eslint . --max-warnings=0
   ./node_modules/.bin/vitest run
   ```
3. 按需切出新分支，例如 `feat/v1.4-map-polish`。
4. 修改后再次运行上述检查 + Rust 测试。

---

> 最后更新：2026-06-22
