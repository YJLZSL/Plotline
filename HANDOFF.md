# Plotline v1.5.0 交接文档

> 本文档面向**下一个接手的 AI**。请首先阅读 `AGENTS.md`（已更新为 v1.5.0 状态），本文档补充当前状态、已完成工作、发布遗留事项与下一步任务。

---

## 1. 版本信息

- **版本**：v1.5.0
- **代码**：已提交并推送到 `main`（commit `38a3981`）
- **Tag**：`v1.5.0` 已推送，CI 构建成功
- **GitHub Release**：草稿状态（`isDraft: true`），已包含构建产物
  - `Plotline_1.5.0_x64-setup.exe`（NSIS 安装包）
  - `Plotline_1.5.0_x64_en-US.msi`（MSI 安装包）
- **发布时间**：2026-06-23

---

## 2. ⚠️ 发布遗留事项（需要下一个 AI 完成）

### 2.1 安装包签名 + latest.json + 发布草稿

**问题**：本地 `tauri signer sign` 命令在非 TTY（非交互式终端）环境下挂起，
输出 "Signing without password." 后不退出、不生成 `.sig` 文件。
这是 Tauri CLI 在无 TTY 环境下的已知行为问题，不影响代码与功能正确性。

**CI 已完成的工作**：
- `v1.5.0` tag 已推送，`release.yml` CI 已成功运行
- CI 使用 `tauri-apps/tauri-action@v0`，已设置 `TAURI_SIGNING_PRIVATE_KEY` secret
- 草稿 Release 已创建，包含 NSIS exe + MSI 两个产物
- 但草稿 Release 中**没有** `.sig` 签名文件和 `latest.json`

**下一个 AI 需要做的事**（按顺序）：

1. **签名安装包**（在有 TTY 的终端中执行）：
   ```bash
   # 设置环境变量
   export TAURI_SIGNING_PRIVATE_KEY=$(cat keys/plotline.key)
   # 或 Windows PowerShell:
   $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content keys/plotline.key -Raw).Trim()

   # 签名（必须在真实终端中运行，不能在非交互式 shell 中）
   ./node_modules/.bin/tauri signer sign \
     src-tauri/target/release/bundle/nsis/Plotline_1.5.0_x64-setup.exe
   # 会生成 Plotline_1.5.0_x64-setup.exe.sig
   ```

2. **填充 `releases/v1.5.0/latest.json`**：
   - 将 `.sig` 文件内容（Base64）填入 `signature` 字段
   - 模板已创建在 `releases/v1.5.0/latest.json`，`signature` 字段为 `"PENDING_CI_SIGNATURE"` 占位

3. **上传 `latest.json` 到 GitHub Release**：
   ```bash
   gh release upload v1.5.0 releases/v1.5.0/latest.json
   ```

4. **发布草稿 Release**：
   ```bash
   gh release edit v1.5.0 --draft=false
   ```

5. **验证自动更新**：安装旧版本 → 启动 → 应弹出更新提示

### 2.2 替代方案（如果签名仍然挂起）

如果本地签名持续失败，可以：
- **方案 A**：在 GitHub Actions CI 中重新触发构建，确保 `TAURI_SIGNING_PRIVATE_KEY` secret 已正确设置，CI 会自动签名并上传 `latest.json`
- **方案 B**：在 Windows CMD（非 PowerShell）真实终端中运行签名命令
- **方案 C**：使用 `minisign` 工具直接签名（Tauri 使用 minisign 格式）

---

## 3. v1.5.0 已完成工作摘要

### 3.1 AI 多服务商支持（核心功能）
- 设置页 AI 标签新增可视化服务商选择卡片（`src/features/ai/providers.tsx`）
- 内置 9 种预设：OpenAI、硅基流动、火山方舟、腾讯混元、DeepSeek、Moonshot、智谱 AI、Ollama 本地、自定义
- 每个预设携带官方品牌色、简化单色 SVG 图标、推荐 baseUrl 与模型名
- 点击自动填充 baseUrl 并补全推荐模型，提供「获取 API Key」直达链接
- AI 助手面板顶部同步显示当前服务商品牌图标（`AiAssistantPanel.tsx`）

### 3.2 统一应用图标
- 重新设计羽毛笔沿时间线书写的优雅图标（`src-tauri/icons/icon.svg`）
- 应用内 `BrandMark.tsx` 与应用图标使用同一构图，消除此前不一致问题
- Skia 重新渲染全部 19 个 PNG/ICO 尺寸

### 3.3 数据导入修复
- 修复导入笔记归属错误工作区（HIGH）— `services/workspace.rs:305`
- 修复导入大纲父子层级丢失（HIGH）— `services/workspace.rs:323`
- 修复导入笔记文件夹层级丢失（MEDIUM）
- 新增 4 项 Rust 回归测试

### 3.4 错误处理加固
- 移除 AI `kv_set` 生产路径 `unwrap()`（HIGH）— `services/ai.rs:176`
- 统计/计数查询 `unwrap_or(0)` 改为 `?` 传播（13 处）
- JSON 解析损坏时 `log::warn` 而非静默吞错（4 处）
- 地点连接新增跨工作区校验，移除 `#[allow(dead_code)]`

### 3.5 竞品调研与问题审计
- 新增 `docs/COMPETITOR_RESEARCH.md`（5 款竞品对比：Scrivener/Plottr/Campfire/Obsidian/Notion）
- 新增 `docs/ISSUE_AUDIT.md`（16 项问题，10 项已修复，6 项 LOW 遗留）

### 3.6 测试状态
- 前端：`vitest run` — 129 passed（新增 7 项 provider 测试）
- Rust：`cargo test` — 40 passed（新增 5 项回归测试）
- `cargo clippy -- -D warnings` — 无告警
- `eslint --max-warnings=0` — 无警告
- `tsc --noEmit` — 无错误

---

## 4. 关键文件位置

| 用途 | 路径 |
|---|---|
| AI 服务商预设 | `src/features/ai/providers.tsx`、`src/features/ai/providers.test.ts` |
| AI 助手面板 | `src/components/layout/AiAssistantPanel.tsx`、`src/features/ai/*` |
| AI 后端 | `src-tauri/src/services/ai.rs`、`src-tauri/src/commands/ai.rs` |
| 应用图标源 | `src-tauri/icons/icon.svg` |
| 图标渲染脚本 | `scripts/render-icon.py`（依赖 `skia-python`，已安装） |
| 应用内品牌标记 | `src/components/ui/BrandMark.tsx` |
| 工作区导入逻辑 | `src-tauri/src/services/workspace.rs`（`import_bundle`） |
| 设置视图（含服务商卡片） | `src/components/views/SettingsView.tsx` |
| 更新清单模板 | `releases/v1.5.0/latest.json`（signature 待填） |
| 签名私钥（勿提交） | `keys/plotline.key` |
| 竞品调研 | `docs/COMPETITOR_RESEARCH.md` |
| 问题审计 | `docs/ISSUE_AUDIT.md` |
| 项目规范 | `AGENTS.md` |
| 发布操作手册 | `CHANGELOG.md` 第 76-112 行 |

---

## 5. 已知遗留问题（v1.5+ 后续处理）

详见 `docs/ISSUE_AUDIT.md` 第三章，摘要如下：

1. **[MEDIUM] 导出包不含 VN/地图数据**：`WorkspaceBundle` 缺少 VN/地点/连线数据。P1。
2. **[LOW] ai_chat 异步期间会话可能被删除**。P2。
3. **[LOW] disconnect/unlink 不检查 affected rows**。P2。
4. **[LOW] map_err(\|_\|) 丢弃原始错误细节**（10 处）。P2。
5. **[LOW] 测试中 react-i18next 实例未初始化**。P2。
6. **[LOW] jsdom navigation 未实现警告**。P2。
7. **[安全] CSP 为 null**。P2。
8. **[测试] 无 E2E spec**。P2。

---

## 6. 下一个 AI 的核心任务

1. **完成 v1.5.0 发布**：签名安装包 → 填充 latest.json → 上传 → 发布草稿 Release（见第 2 节）
2. **阅读文档**：`AGENTS.md` + `docs/COMPETITOR_RESEARCH.md` + `docs/ISSUE_AUDIT.md`
3. **确认基线**：运行 `pnpm lint && pnpm typecheck && pnpm test:run && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`
4. **选择 v1.6 方向**：参考 `AGENTS.md` 下一迭代方向与 `docs/ISSUE_AUDIT.md` 优先级
5. **直接提交到 main**：每批改动必须通过全量检查
6. **完成后更新本文档与 `AGENTS.md`**

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

> 最后更新：2026-06-23  
> 当前状态：v1.5.0 代码与功能已完成，已推送 main 和 tag，CI 构建成功，  
> 草稿 Release 已创建，**唯一遗留：安装包签名 + latest.json + 发布草稿**（本地非 TTY 环境签名挂起）
