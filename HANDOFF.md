# Plotline v1.4.0 交接文档

> 本文档面向**下一个接手的 AI**。请首先阅读 `AGENTS.md`（已更新为 v1.4.0 状态及新的分支策略），本文档补充当前状态、已知问题与下一步任务。

---

## 1. 版本信息

- **版本**：v1.4.0（已发布）
- **Release**：https://github.com/YJLZSL/Plotline/releases/tag/v1.4.0
- **发布时间**：2026-06-22
- **分支策略**：自 v1.4.0 起，所有开发直接在 `main` 分支进行，不再切功能分支。提交前必须全量检查通过。

---

## 2. v1.4.0 新增与改造摘要

- **AI 创作助手**：工作区右侧 `AiAssistantPanel`，后端 `services/ai.rs` 实现会话/消息/KV 缓存/RAG 倒排索引，支持 OpenAI 兼容 API。
- **VN 增强**：台词排序、场景关系图、预览升级、Ren'Py 导出。
- **地图增强**：地点自定义 emoji/Lucide 图标、连线标签编辑、角色足迹连线、PNG 导出。
- **开场动画**：`SplashOverlay` 羽毛笔沿时间线动画，可开关与调时长。
- **应用内自动更新**：`tauri.conf.json` 关闭原生 dialog，前端 `UpdatePrompt` + 设置页一键安装，旧版无需卸载即可更新。
- **质量整顿**：全量测试 122 + 35 通过，`cargo clippy -- -D warnings` 无告警。

---

## 3. 关键文件位置

| 用途 | 路径 |
|---|---|
| 自动更新配置 | `src-tauri/tauri.conf.json` |
| 应用内更新 UI | `src/App.tsx`、`src/features/settings/updater.ts`、`src/components/views/SettingsView.tsx` |
| 更新清单 | `releases/v1.4.0/latest.json` |
| 签名私钥（勿提交） | `keys/plotline.key` |
| AI 助手后端 | `src-tauri/src/services/ai.rs`、`src-tauri/src/commands/ai.rs` |
| AI 助手前端 | `src/components/layout/AiAssistantPanel.tsx`、`src/features/ai/*` |
| VN | `src/components/views/VnView.tsx`、`src/features/vn/*`、`src-tauri/src/services/vn.rs` |
| 地图 | `src/components/views/MapView.tsx`、`src/features/map/*`、`src-tauri/src/services/location.rs` |
| 设置/主题 | `src/components/views/SettingsView.tsx`、`src/stores/ui.ts`、`src/styles/themes.css` |
| 项目规范 | `AGENTS.md` |

---

## 4. 已知遗留问题（待下一个 AI 审查/确认）

1. `src-tauri/src/models/location.rs:62` `workspace_id` 字段在 `LinkLocationsInput` 中未使用（已加 `#[allow(dead_code)]`）。需确认是否该清理，还是未来会用于权限校验。
2. 应用 `identifier` 为 `com.plotline.app`，当前仅发布 Windows；若未来发布 macOS，需检查是否冲突。
3. `MapView` / `VnView` 的复杂交互主要依赖组件测试与 E2E，单元测试覆盖较薄。
4. AI 助手目前未做流式输出、未做本地模型/离线 fallback、RAG 分词较简单（按空格）。
5. 部分设置项（如备份路径、自动备份间隔）前端有 UI，但后端定时备份逻辑尚未实现。
6. 空状态插画、日文翻译、更多主题预设仍为占位或缺失。
7. 当前发布产物只有 Windows x64；若未来需要 arm64 或其他平台，需扩展 CI 矩阵。

---

## 5. 下一个 AI 的核心任务

请按以下顺序开展工作，并在完成后更新本文档与 `AGENTS.md`：

1. **全面审查**（read-only）
   - 通读 `AGENTS.md`、`docs/ARCHITECTURE.md`、`docs/DECISIONS.md`、`docs/DATA_MODEL.md`、`产品需求与设计文档.md`。
   - 浏览 `src/` 与 `src-tauri/src/` 核心模块，理解当前架构与数据流。
   - 运行 `pnpm lint && pnpm typecheck && pnpm test:run && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` 确认基线。

2. **竞品调研**
   - 选取 2–3 款同类叙事/写作工具（如 Scrivener、Plottr、Campfire、Notion、Obsidian + 插件）。
   - 对比维度：功能模块、交互方式、定价、本地优先/云端、导出能力、AI 集成。
   - 输出一份简洁的 `docs/COMPETITOR_RESEARCH.md`，指出 Plotline 的优劣势与可借鉴点。

3. **Bug 与问题排查**
   - 运行应用（`pnpm tauri dev` 或安装最新 Release），覆盖：工作区创建/导入、时间轴、角色关系、大纲、地图、VN、AI 助手、设置、自动更新提示。
   - 记录所有异常、UI 错位、文案缺失、性能卡顿、可访问性问题。
   - 对代码进行静态审查，查找潜在 `unwrap()`、SQL 注入风险、类型不一致、内存泄漏、竞态条件。
   - 输出 `docs/ISSUE_AUDIT.md`：分类（bug/性能/体验/安全/债务）、优先级、建议修复方案。

4. **后续开发计划**
   - 基于 PRD、竞品调研与问题清单，制定 v1.5 迭代计划。
   - 明确优先级（P0 必须修，P1 下个版本做，P2 远期）。
   - 更新 `CHANGELOG.md` 的「下一迭代方向」或新增 `docs/ROADMAP_v1.5.md`。

5. **直接提交到 main**
   - 只产出调研/审计文档时，可直接提交到 `main`。
   - 若开始修复 bug 或实现功能，同样直接提交到 `main`，但每批改动必须通过全量检查。

---

## 6. 快速启动

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test:run
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
pnpm tauri dev        # 桌面开发
pnpm dev:web          # 纯前端开发
```

---

> 最后更新：2026-06-22（v1.4.0 已发布，已合并到 main，分支策略改为直接 main 开发）
