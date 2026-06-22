# Plotline

> 面向小说作者、编剧与游戏叙事设计师的**本地优先**创作工作台。
> 通过可视化方式构建故事的时间线、角色关系与情节结构。

[![CI](https://github.com/YJLZSL/Plotline/actions/workflows/ci.yml/badge.svg)](https://github.com/YJLZSL/Plotline/actions/workflows/ci.yml)

---

## 特性

- **可视化时间轴**：水平滚动、多轨道、滚轮缩放、事件因果连线
- **角色管理**：卡片档案、标签分类、关系网络图
- **大纲视图**：卷 → 章 → 场景 → 事件，拖拽排序
- **统计仪表板**：角色出场频率、情节密度热力图
- **资料库**：富文本笔记 + 全文搜索
- **三套主题**：明亮 / 暗黑 / 护眼，全部暖色调
- **自动保存**：每次变更立即落库，无需手动保存
- **导入/导出**：JSON 完整项目备份
- **本地优先**：所有数据存于本地 SQLite，离线可用

---

## 技术栈

- **桌面外壳**：Tauri 2 + Rust
- **前端**：React 18 + TypeScript + Vite + Tailwind CSS v4
- **状态**：Zustand + TanStack Query
- **画布**：Konva（时间轴）+ Recharts（图表）
- **数据库**：SQLite (rusqlite)
- **测试**：Vitest + Playwright

详见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

---

## 快速开始

### 环境要求
- Node.js ≥ 20
- pnpm ≥ 10
- Rust ≥ 1.75
- Windows: WebView2（Win11 自带）/ macOS: Xcode CLI / Linux: webkit2gtk

### 安装与运行
```bash
pnpm install
pnpm dev          # 启动 Tauri 开发模式（含 Rust 后端）
pnpm dev:web      # 仅启动前端（用于 UI 开发 / E2E，IPC 走 mock）
```

### 构建
```bash
pnpm build        # 生成桌面安装包（src-tauri/target/release/bundle/）
```

---

## 常用脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | Tauri 开发模式 |
| `pnpm dev:web` | 纯前端开发（mock IPC） |
| `pnpm build` | 构建桌面安装包 |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | Vitest watch |
| `pnpm test:run` | Vitest 单次运行 |
| `pnpm test:coverage` | 覆盖率报告 |
| `pnpm test:e2e` | Playwright E2E |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Rust 单元测试 |
| `pnpm format` | Prettier 格式化 |
| `pnpm tauri` | Tauri CLI 透传 |

---

## 项目结构

```
plotline/
├── src-tauri/        # Rust 后端（Tauri + SQLite）
├── src/              # React 前端
├── docs/             # 架构 / 测试 / 决策 / 数据模型
├── tests/            # Playwright E2E
├── AGENTS.md         # AI 协作规范（必读）
└── 产品需求与设计文档.md  # PRD（最终事实源）
```

完整目录与模块边界见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

---

## AI 协作

本项目欢迎 AI 辅助开发。**任何 AI 接手前必须阅读：**
1. [`AGENTS.md`](AGENTS.md) — 编码规范、禁忌、提交流程
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 架构与数据流
3. [`产品需求与设计文档.md`](产品需求与设计文档.md) — 产品最终事实源

接手 5 步流程见 `AGENTS.md` § 8。

---

## 许可证

MIT
