# Plotline

<div align="center">
  <img src="src-tauri/icons/icon.png" alt="Plotline Logo" width="128" height="128" />
  <br />
  <br />
</div>

> 面向小说作者、编剧与游戏叙事设计师的**本地优先**创作工作台。
> 以 **v5.0 事件关系时间轴**为核心，可视化构建故事的时间线、事件之间的联系、角色关系与情节结构。

[![CI](https://github.com/YJLZSL/Plotline/actions/workflows/ci.yml/badge.svg)](https://github.com/YJLZSL/Plotline/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/YJLZSL/Plotline)](https://github.com/YJLZSL/Plotline/releases)

---

## 特性

### 事件关系时间轴（v5.0）
- **日历 + 关系双模式**：六种视图（时间轴 / 甘特 / 树状 / 关系 / 文本 / 剧本）随时切换
- **关系视图**：把 `event_connections` 与旧版 `connectedEventIds` 自动迁移为关系图边（因果 / 伏笔 / 关联），分层布局、连通分支与孤立事件统计
- **零拷贝迁移**：旧时间轴数据原样保留，迁移引导横幅一键直达关系图
- 日期标尺、滚轮缩放、拖动吸附、Today 参考线、因果/伏笔连线、一致性检查

### 创作工作台
- **角色管理**：卡片档案、标签筛选、力导向关系网络图、关系矩阵视图
- **大纲视图**：卷 → 章 → 场景 → 事件树形结构、拖拽排序、状态标记、Markdown 导出
- **AI 创作**：7 个创作 Agent、RAG 工作区检索、快捷动作（优化事件 / 检查漏洞 / **自动整理大纲**）、**AI 输出版本回溯**
- **故事地图**：SVG 地点节点、路径连线、地点分组 / 图层开关、角色足迹、**打印 / PDF / PNG 导出**
- **视觉小说脚本**：场景 / 对话 / 旁白 / 选项、分支预览、立绘拖拽定位、**Ren'Py 导入导出（转场 + 变量）**
- **世界观**：分类设定条目管理与跨分类冲突检测
- **小说写作**：章节管理、TipTap 富文本、字数统计与自动保存
- **番茄钟 × 写作目标**：多主题专注计时器、每日/每周目标、专注统计与系统通知
- **统计仪表板**：状态分布、角色出场、情节密度、角色弧线、伏笔追踪

### 体验与数据
- **三套主题**：明亮 / 暗黑 / 护眼，全部暖色调；全局字体主题（无衬线 / 等宽 / 像素）
- **多语言**：简体中文 / English / 日本語
- **自动保存**：每次变更立即落库；**启动自动备份**（保留最近 10 份）
- **自动更新**：内置 `tauri-plugin-updater`，*Settings → 关于* 一键检查
- **导入/导出**：JSON 完整项目备份 + Markdown 导出
- **本地优先**：所有数据存于本地 SQLite，离线可用
- **撤销/重做**：Ctrl+Z / Ctrl+Y 跨视图撤销主要编辑操作
- **快捷键**：Ctrl+B 切换侧栏、1-5 切换视图、Delete 删除选中事件

---

## 技术栈

- **桌面外壳**：Tauri 2 + Rust
- **前端**：React 18 + TypeScript + Vite + Tailwind CSS v4
- **状态**：Zustand + TanStack Query
- **富文本**：TipTap 2
- **画布**：Recharts（图表）+ 原生 SVG（关系图 / 连线 / 甘特图 / 树状图 / 矩阵 / 弧线）
- **动画**：Framer Motion
- **数据库**：SQLite (rusqlite)
- **测试**：Vitest + Playwright

详见 [`docs/架构设计.md`](docs/架构设计.md)。

---

## 快速开始

### 环境要求
- Node.js ≥ 20
- pnpm ≥ 10
- Rust ≥ 1.77
- Windows: WebView2（Win11 自带）；本应用面向 Windows 平台

### 安装与运行
```bash
pnpm install
pnpm dev          # 启动 Tauri 开发模式（含 Rust 后端）
pnpm dev:web      # 仅启动前端（用于 UI 开发 / E2E，IPC 走 mock）
```

### 构建
```bash
pnpm build              # 构建前端
pnpm tauri build        # 生成桌面安装包（NSIS + MSI）
# 产物位于 src-tauri/target/release/bundle/
```

---

## 常用脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | Tauri 开发模式 |
| `pnpm dev:web` | 纯前端开发（mock IPC） |
| `pnpm build` | 构建前端 |
| `pnpm tauri build` | 生成 NSIS / MSI 安装包 |
| `pnpm check:version` | 校验 package.json / Cargo.toml / tauri.conf.json 版本一致 |
| `python scripts/render-icon.py` | 基于 SVG 矢量源渲染所有 Tauri 图标尺寸（PNG + ICO） |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | Vitest watch |
| `pnpm test:run` | Vitest 单次运行 |
| `pnpm test:e2e` | Playwright E2E |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Rust 单元测试 |

---

## 项目结构

```
plotline/
├── src-tauri/        # Rust 后端（Tauri + SQLite）
├── src/              # React 前端
├── docs/             # 架构 / 测试 / 决策 / 数据模型 / 路线图
├── tests/            # Playwright E2E
├── scripts/          # 版本校验与图标渲染脚本
├── AGENTS.md         # AI 协作规范（必读）
├── 交接文档.md        # 当前版本状态与待办（必读）
└── 产品需求与设计文档.md  # PRD（最终事实源）
```

完整目录与模块边界见 [`docs/架构设计.md`](docs/架构设计.md)。

---

## AI 协作

本项目欢迎 AI 辅助开发。**任何 AI 接手前必须阅读：**
1. [`AGENTS.md`](AGENTS.md) — 编码规范、禁忌、提交流程
2. [`交接文档.md`](交接文档.md) — 项目环境、构建检查、密钥状态
3. [`docs/密钥管理指南.md`](docs/密钥管理指南.md) — 签名密钥位置与配置
4. [`docs/架构设计.md`](docs/架构设计.md) — 架构与数据流
5. [`产品需求与设计文档.md`](产品需求与设计文档.md) — 产品最终事实源

接手 8 步流程见 `AGENTS.md` § 8。

---

## 许可证

MIT
