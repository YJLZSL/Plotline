# Plotline

<div align="center">
  <img src="src-tauri/icons/icon.png" alt="Plotline Logo" width="128" height="128" />
  <br />
  <br />
</div>

> 面向小说作者、编剧与游戏叙事设计师的**本地优先**创作工作台。
> 通过可视化方式构建故事的时间线、角色关系与情节结构。

[![CI](https://github.com/YJLZSL/Plotline/actions/workflows/ci.yml/badge.svg)](https://github.com/YJLZSL/Plotline/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/YJLZSL/Plotline)](https://github.com/YJLZSL/Plotline/releases)

---

## 特性

- **可视化时间轴**：水平滚动、日期标尺、滚轮缩放（时/日/月/年）、多轨道、事件拖拽、因果/伏笔连线、**一致性检查**、**甘特图视图**
- **角色管理**：卡片档案、标签筛选、力导向关系网络图（6 种关系类型 + 强度）、**关系矩阵视图**（N×N 强度网格）
- **大纲视图**：卷 → 章 → 场景 → 事件树形结构、上下移动排序、状态标记、**Markdown 导出**、**树状图视图**
- **统计仪表板**：状态分布饼图、轨道事件条形图、角色出场频率图、**伏笔追踪**、**情节密度分布**、**角色弧线时间轴**
- **故事地图**（v1.3）：SVG 画布地点节点、路径连线、关联事件/角色
- **视觉小说脚本**（v1.3）：场景、对话/旁白/选项台词、分支预览
- **番茄钟**（v1.3）：多主题专注计时器（warm / mc / minimal）
- **全局字体主题**（v1.3）：无衬线 / 等宽 / 像素，即时切换
- **资料库**：**TipTap 富文本**笔记 + 全文搜索 + 标签 + 自动保存
- **撤销/重做**：Ctrl+Z / Ctrl+Y 跨视图撤销主要编辑操作
- **三套主题**：明亮 / 暗黑 / 护眼，全部暖色调
- **自动保存**：每次变更立即落库，无需手动保存
- **启动自动备份**：每次启动滚动备份 SQLite 文件，保留最近 10 份
- **自动更新**：内置 `tauri-plugin-updater`，*Settings → 关于* 一键检查
- **导入/导出**：JSON 完整项目备份 + **Markdown 导出**
- **本地优先**：所有数据存于本地 SQLite，离线可用
- **快捷键**：Ctrl+B 切换侧栏、1-5 切换视图、Delete 删除选中事件、Ctrl+Z 撤销
- **品牌视觉**：自研 BrandMark + AppIcon 统一图标容器；高清重绘应用图标；动效 token 化（160/220/300ms）

> v1.3 新增地图、VN、番茄钟、全局字体主题与高清图标；v1.2 第四阶段新增的可视化均为纯前端 SVG，零新增 IPC，复用既有数据缓存。

---

## 技术栈

- **桌面外壳**：Tauri 2 + Rust
- **前端**：React 18 + TypeScript + Vite + Tailwind CSS v4
- **状态**：Zustand + TanStack Query
- **富文本**：TipTap 2
- **画布**：Recharts（图表）+ 原生 SVG（关系图/连线/甘特图/树状图/矩阵/弧线）
- **动画**：Framer Motion
- **数据库**：SQLite (rusqlite)
- **测试**：Vitest + Playwright

详见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

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
