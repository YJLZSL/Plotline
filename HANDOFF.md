# Plotline v1.5.0 交接文档

> 本文档面向**下一个接手的 AI**。请首先阅读 `AGENTS.md`（已更新为 v1.5.0 状态），本文档补充当前状态、已知问题与下一步任务。

---

## 1. 版本信息

- **版本**：v1.5.0（已发布）
- **Release**：https://github.com/YJLZSL/Plotline/releases/tag/v1.5.0
- **发布时间**：2026-06-23
- **分支策略**：自 v1.4.0 起，所有开发直接在 `main` 分支进行，不再切功能分支。提交前必须全量检查通过。

---

## 2. v1.5.0 新增与修复摘要

- **AI 多服务商支持**：设置页 AI 标签新增可视化服务商选择卡片（`src/features/ai/providers.tsx`），内置 OpenAI、硅基流动、火山方舟、腾讯混元、DeepSeek、Moonshot、智谱 AI、Ollama 本地、自定义共 9 种预设，每个预设携带官方品牌色、简化单色 SVG 图标、推荐 baseUrl 与模型名；AI 助手面板顶部同步显示当前服务商品牌图标。
- **统一应用图标**：重新设计羽毛笔沿时间线书写的优雅图标（`src-tauri/icons/icon.svg` + `src/components/ui/BrandMark.tsx`），应用内外使用同一构图；Skia 重新渲染全部 19 个 PNG/ICO 尺寸。
- **数据导入修复**：修复工作区导入时笔记归属错误工作区（HIGH）、大纲父子层级丢失（HIGH）、笔记文件夹层级丢失（MEDIUM）三个数据损坏 bug，新增 4 项 Rust 回归测试。
- **错误处理加固**：移除 AI `kv_set` 生产路径 `unwrap()`（HIGH）；统计/计数查询 `unwrap_or(0)` 统一改为 `?` 传播（13 处）；JSON 解析损坏时 `log::warn` 而非静默吞错（4 处）；地点连接新增跨工作区校验。
- **竞品调研与问题审计**：新增 `docs/COMPETITOR_RESEARCH.md`（5 款竞品对比）与 `docs/ISSUE_AUDIT.md`（16 项问题，10 项已修复）。

---

## 3. 关键文件位置

| 用途 | 路径 |
|---|---|
| AI 服务商预设 | `src/features/ai/providers.tsx`、`src/features/ai/providers.test.ts` |
| AI 助手面板 | `src/components/layout/AiAssistantPanel.tsx`、`src/features/ai/*` |
| AI 后端 | `src-tauri/src/services/ai.rs`、`src-tauri/src/commands/ai.rs` |
| 应用图标源 | `src-tauri/icons/icon.svg` |
| 图标渲染脚本 | `scripts/render-icon.py`（依赖 `skia-python`） |
| 应用内品牌标记 | `src/components/ui/BrandMark.tsx` |
| 工作区导入逻辑 | `src-tauri/src/services/workspace.rs`（`import_bundle`） |
| 统计服务 | `src-tauri/src/services/statistics.rs` |
| 设置视图 | `src/components/views/SettingsView.tsx` |
| 更新清单 | `releases/v1.5.0/latest.json` |
| 竞品调研 | `docs/COMPETITOR_RESEARCH.md` |
| 问题审计 | `docs/ISSUE_AUDIT.md` |
| 项目规范 | `AGENTS.md` |

---

## 4. 已知遗留问题（待下一个 AI 审查/确认）

详见 `docs/ISSUE_AUDIT.md` 第三章，摘要如下：

1. **[MEDIUM] 导出包不含 VN/地图数据**：`WorkspaceBundle` 缺少 `vn_scenes`、`vn_lines`、`locations`、`location_links`，导出再导入会静默丢失。P1 优先级。
2. **[LOW] ai_chat 异步期间会话可能被删除**：释放锁做 HTTP 调用期间，另一命令可能删除会话。P2。
3. **[LOW] disconnect/unlink 不检查 affected rows**：删除连接不区分"已删除"与"不存在"。P2。
4. **[LOW] map_err(\|_\|) 丢弃原始错误细节**：10 个 service 的 `get` 函数把数据库错误报为"不存在"。P2。
5. **[LOW] 测试中 react-i18next 实例未初始化**：测试输出 `NO_I18NEXT_INSTANCE` 警告，不影响通过。P2。
6. **[LOW] jsdom navigation 未实现警告**：`MapView.test.tsx` 输出 `Not implemented` 警告。P2。
7. **[安全] CSP 为 null**：`tauri.conf.json` 中 `csp: null`，建议配置白名单。P2。
8. **[测试] 无 E2E spec**：Playwright 配置存在但无 spec 文件。P2。

---

## 5. 下一个 AI 的核心任务

1. **阅读文档**：`AGENTS.md` + `docs/COMPETITOR_RESEARCH.md` + `docs/ISSUE_AUDIT.md` + `产品需求与设计文档.md`。
2. **确认基线**：运行 `pnpm lint && pnpm typecheck && pnpm test:run && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` 确认全绿。
3. **选择 v1.6 方向**：参考 `AGENTS.md` 下一迭代方向与 `docs/ISSUE_AUDIT.md` 优先级，选择 2-3 个主题推进。
4. **直接提交到 main**：每批改动必须通过全量检查。
5. **完成后更新本文档与 `AGENTS.md`**。

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

> 最后更新：2026-06-23（v1.5.0 已发布，已合并到 main）
