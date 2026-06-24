# Plotline v2.2.0 交接文档

> 本文档面向**下一个接手的 AI**。请首先阅读 `AGENTS.md`，本文档补充当前状态、已完成工作、发布遗留事项与下一步任务。

---

## 1. 版本信息

- **版本**：v2.2.0
- **代码**：已完成 Phase 2-6，待提交并推送到 `main`
- **构建产物**：
  - `src-tauri/target/release/bundle/nsis/Plotline_2.2.0_x64-setup.exe`（NSIS 安装包，已签名）
  - `src-tauri/target/release/bundle/msa/Plotline_2.2.0_x64_en-US.msi`（MSI 安装包）
  - `releases/v2.2.0/latest.json`（自动更新清单，已填签名）
- **签名**：使用 `keys/plotline.key` 完成 minisign 签名
- **发布时间**：2026-06-24

---

## 2. 待完成发布步骤

### 2.1 提交并推送代码

```bash
git add -A
git commit -m "chore(release): v2.2.0"
git push origin main
```

### 2.2 打 Tag 并推送

```bash
git tag v2.2.0
git push origin v2.2.0
```

Tag 推送后会触发 `.github/workflows/release.yml`，CI 会重新构建并上传 Release 产物。

### 2.3 上传产物与发布 Release

CI 草稿 Release 生成后，确认以下产物已上传：
- `Plotline_2.2.0_x64-setup.exe`
- `Plotline_2.2.0_x64-setup.exe.sig`
- `Plotline_2.2.0_x64_en-US.msi`
- `latest.json`

然后发布 Release：

```bash
gh release edit v2.2.0 --draft=false
```

### 2.4 验证自动更新

安装 v2.1.0 旧版本 → 启动 → 应弹出 v2.2.0 更新提示。

---

## 3. v2.2.0 已完成工作摘要

### 3.1 时间轴/事件逻辑重写
- 新增 `src/features/timeline/timeScale.ts`，用真实 UTC 日历步进替换固定 30/365 天近似。
- `TimelineView` 接入 `timeScale`，`DateRuler` 刻度与事件坐标对齐。
- 移除 `EventCard.dragConstraints`，实现真实横向拖拽与相邻事件排序。
- 连线层支持 hover 加粗并点击删除连接。
- 一致性冲突可视化：事件卡片红色角标/边框，编辑对话框顶部提示。
- 事件编辑对话框新增马卡龙色板颜色选择器。
- 甘特图改用真实日期布局，相对事件按 `sortOrder` 堆叠。
- 轨道层引入水平虚拟化与 `useMemo` 优化。

### 3.2 动画与性能优化
- 动画时长统一压缩至 150-200ms。
- 支持 `prefers-reduced-motion`。
- 用 CSS `active:scale` 反馈替代部分 Framer Motion `whileTap`。
- 新增全局保存状态指示 `SaveStatus` 与 `BeforeUnloadGuard`。

### 3.3 MC 主题再设计
- 泥土棕/草绿/红石红/圆石灰/木板褐配色。
- 控件方块化：`[data-theme="mc"] button/ input/ textarea/ select` 圆角 2px。
- 番茄钟音效闭环：开始/暂停/重置/阶段切换/完成均播放音效，MC 主题完成播放 explosion。
- 修复设置预览与 accent 冲突：MC 主题固定草绿强调色，用户自定义 accent 不再覆盖。

### 3.4 工作区保存改进
- 工作区选择器支持重命名、编辑描述与封面颜色。
- 实现后台定时备份调度器 `services/backup::start_auto_backup_scheduler`。
- 撤销/重做扩展至工作区元数据编辑。
- Bundle 导入增加版本校验（仅支持版本 2）。
- 数据库触发器联动子表变更，自动更新 `workspaces.updated_at`。

### 3.5 自定义字体导入
- 默认内置得意黑（Smiley Sans）字体文件与 `@font-face`。
- 统一 `fontTheme` 与 `uiFont`/`editorFont` 模型：选择字体主题时同步设置两者。
- 支持在设置页导入 `.ttf/.otf/.woff/.woff2` 到 `app_data/fonts/` 并动态注入 `@font-face`。

### 3.6 测试状态
- 前端：`vitest run` — 149 passed（新增 font、history workspace 等测试）
- Rust：`cargo test` — 48 passed（新增 backup scheduler、bundle version、updated_at trigger 测试）
- `cargo clippy -- -D warnings` — 无告警
- `eslint --max-warnings=0` — 无警告
- `tsc --noEmit` — 无错误
- Playwright E2E — 14 passed

---

## 4. 关键文件位置

| 用途 | 路径 |
|---|---|
| 时间轴缩放/映射 | `src/features/timeline/timeScale.ts` |
| 时间轴视图 | `src/components/views/TimelineView.tsx` |
| 动画 token | `src/lib/motion.ts` |
| 保存状态指示 | `src/components/layout/SaveStatus.tsx`、`src/components/layout/BeforeUnloadGuard.tsx` |
| 番茄钟音效 | `src/lib/sound.ts`、`src/components/ui/PomodoroTimer.tsx` |
| 主题变量 | `src/styles/themes.css`、`src/stores/ui.ts` |
| 工作区选择器 | `src/components/views/WorkspaceSelector.tsx` |
| 撤销/重做 | `src/stores/historyStore.ts`、`src/hooks/useHistoryDispatcher.ts` |
| 自动更新 | `src-tauri/src/services/backup.rs`、`src-tauri/src/lib.rs` |
| Bundle 导入 | `src-tauri/src/services/workspace.rs` |
| 迁移触发器 | `src-tauri/migrations/007_workspace_updated_at_triggers.sql` |
| 字体导入 | `src/features/font/api.ts`、`src/main.tsx` |
| 设置视图 | `src/components/views/SettingsView.tsx` |
| 更新清单 | `releases/v2.2.0/latest.json` |
| 签名私钥（勿提交） | `keys/plotline.key` |
| 项目规范 | `AGENTS.md` |
| 发布日志 | `CHANGELOG.md` |

---

## 5. 已知遗留问题（v2.3+ 候选）

详见 `AGENTS.md` 下一迭代方向，摘要如下：

1. 地图：地点分组/图层、打印/PDF 导出、角色足迹连线。
2. VN：角色立绘插槽拖拽、完整预览播放器、导出 Ren'Py 增强。
3. 世界观：种族/物种/宗教等实体管理、设定冲突检测。
4. AI：Agent 式工作流，自动整理大纲/发现时间轴漏洞。
5. UI 美术：统一空状态插画、卡片质感升级、日文翻译补全。
6. 番茄钟：与写作目标绑定、每日统计、通知提醒。

---

## 6. 下一个 AI 的核心任务

1. **完成 v2.2.0 发布**：提交 push main → 打 tag → 触发 CI → 上传产物 → 发布 Release。
2. **确认基线**：运行 `pnpm lint && pnpm typecheck && pnpm test:run && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`
3. **选择 v2.3 方向**：参考 `AGENTS.md` 下一迭代方向。
4. 直接提交到 `main`：每批改动必须通过全量检查。

---

## 7. 快速启动

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test:run
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
pnpm tauri dev        # 桌面开发
pnpm dev:web          # 纯前端开发
```

---

> 最后更新：2026-06-24  
> 当前状态：v2.2.0 功能与构建已完成，签名与 latest.json 已就绪，**待提交 main 并推送 tag 触发 CI 发布**
