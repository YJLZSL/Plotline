# AGENTS.md — AI 协作规范

> 本文档是 **任何 AI（或人类开发者）在本仓库工作前的必读手册**。
> 它定义了代码风格、目录约定、提交流程与禁忌操作，确保多轮迭代后代码风格一致、可被下一个 AI 无损接手。

---

## 0. 黄金法则

1. **先读后写**：改动任何文件前，先 `Read` 该文件 + 至少 1 个相邻同类文件，理解现有约定。
2. **不改`main.rs`**：`src-tauri/src/main.rs` 仅是 Windows GUI 入口，逻辑全部放在 `lib.rs` 及子模块。
3. **不跳过类型**：禁止 `any`、禁止 `// @ts-ignore`、禁止 `as unknown as`。需要类型断言时用 Zod 校验后再断言。
4. **不写裸 CSS**：所有样式通过 Tailwind 类名或 `src/styles/themes.css` 的 CSS 变量。组件级私有样式用 Tailwind 的 `[selector]` 任意值语法。
5. **不提交秘密**：禁止把 `.env`、API key、本地数据库文件加入版本控制。
6. **不跳过测试**：新增 feature 必须至少 1 个单元测试；修 bug 必须加回归测试。
7. **不删除已有测试**：除非该测试覆盖的功能已删除。

---

## 1. 仓库导航

| 想做什么 | 去哪里 |
|---|---|
| 改 IPC 命令 | `src-tauri/src/commands/<domain>.rs` + `src/lib/ipc.ts` |
| 改业务逻辑 | `src-tauri/src/services/<domain>.rs` |
| 改数据模型 | `src-tauri/src/models/<domain>.rs` + **同步** `src/types/<domain>.ts` |
| 改数据库结构 | `src-tauri/migrations/NNN_*.sql`（**只新增，不修改旧文件**） |
| 加新视图 | `src/features/<domain>/` + `src/components/views/` |
| 加基础组件 | `src/components/ui/` |
| 改主题/颜色 | `src/styles/themes.css` |
| 改翻译 | `src/i18n/locales/<lang>.json` |
| 改番茄钟 | `src/components/ui/PomodoroTimer.tsx` + `src/stores/pomodoro.ts` |
| 改全局字体主题 | `src/styles/themes.css` + `src/styles/tailwind.css` + `src/stores/ui.ts` |
| 改自动更新 | `src-tauri/src/lib.rs` + `src-tauri/tauri.conf.json` + `releases/vX.Y.Z/latest.json` |

必读文档：
- `AGENTS.md` — 本文件（AI 协作规范）
- `交接文档.md` — 项目环境、构建检查、密钥状态（必读）
- `docs/文档索引.md` — 文档状态总览（先读）
- `docs/密钥管理指南.md` — 签名密钥位置、GitHub Secret 配置（必读）
- `docs/架构设计.md` — 整体架构
- `docs/测试规范.md` — 测试流程
- `docs/技术决策.md` — 关键技术决策
- `docs/数据模型.md` — 数据模型与 ER 图
- `产品需求与设计文档.md` — PRD（永远以它为最终事实源）

### 当前迭代状态（v3.2.0 开发中：时间轴拖动吸附）
- **时间轴拖动吸附**：新增 `getSnapTimeAtX` / `getSnapXAtTime` 纯函数（`src/features/timeline/timelineGrid.ts`），基于当前标尺档位计算吸附目标时间与像素位置；拖动事件时自动吸附到最近的时间网格。
- **吸附提示组件**：新增 `DragSnapHint` 与 `DragSnapTooltip`，在拖拽过程中实时显示当前吸附时间与偏移量，释放前即可预览落点。
- **EventCard 拖动归位动画**：拖拽释放后，事件卡片沿 `motionOrchestrator` 的 `dragSnap` 场景预设播放归位动画，连接线同步跟随锚点。
- **动画编排层扩展**：`motionOrchestrator` 新增 `dragSnap` 场景预设，统一管理吸附确认、卡片归位、连接线重绘的 stagger / delay / easing；`prefers-reduced-motion` 或"增强动效"关闭时退化为 200ms 同步淡入。
- **真实创作意图 E2E**：新增覆盖完整创作流程的 E2E 测试（创建事件 → 拖动吸附 → 验证时间与视觉位置一致）。
- **版本号与文档**：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.lock` 升级到 `3.2.0`；`AGENTS.md`、`更新日志.md`、`交接文档.md`、`docs/产品路线图.md` 同步更新。
- **本地构建状态**：前端 `pnpm lint/typecheck/build/test:run` 全绿；本地 Rust 编译环境仍存在 Windows build script 子进程等待 bug（`Os { code: 0, ... }`），无法重新编译，依赖 CI 验证 `cargo test` 与 `cargo clippy -- -D warnings`。
- **GitHub Release v3.2.0**：待发布

### 上一版本（v3.1.0 / v3.0.0 / v2.8.0 / v2.7.5 / v2.7.4 / v2.7.3 / v2.7.2 / v2.7.0 / v2.6.2 / v2.6.1 / v2.6.0 / v2.5.4 / v2.3.0 / v2.2.0 已发布/已标记）
- v3.1.0：时间轴对齐重写与动画编排层。时间轴坐标单一源（`ViewportState` + `getXAtTime`/`getTimeAtX`）、标尺 6 档自适应、事件卡片三 zone 重构、连接线时间锚点边缘对齐、动画编排层 5 场景预设、工具栏四分组 + Sidebar 三分组、14 个 visual E2E 测试。前端 `pnpm lint/typecheck/build/test:run` 全绿。
- GitHub Release v3.1.0：<https://github.com/YJLZSL/Plotline/releases/tag/v3.1.0>
- v3.0.0：跨视图叙事导航 + AI 创作工作流。时间轴布局引擎重写（`timelineGrid.ts` / `timeScale.ts` / `useTimelineViewport.ts`）、Timeline / Script 双视图双向同步（`workspaceSelection.ts` 全局选择状态 + `ScriptView.tsx`）、AI 创作助手侧边模块（7 个 Agent + 会话管理 + 上下文选择器）、Rust clippy 清理。前端 `pnpm lint/typecheck/build/test:run/test:e2e` 全绿。
- GitHub Release v3.0.0：<https://github.com/YJLZSL/Plotline/releases/tag/v3.0.0>
- v2.8.0：前端丝滑化与时间轴逻辑升级。时间轴事件重叠修复与拖拽升级、动效系统 spring/layout token 与增强动效开关、TimelineView 性能优化、设置页重构、首次进入工作区新手引导与各视图空状态优化、新增 `docs/前端优化指南.md`。
- GitHub Release v2.8.0：<https://github.com/YJLZSL/Plotline/releases/tag/v2.8.0>
- v2.7.5：修复 v2.7.4 CI 中发现的 RAG 关键词检索 `LIKE` 子查询缺少 `%` 通配符问题（`src-tauri/src/services/ai.rs`），导致检索结果始终返回 0 条；补全通配符后确保 AI RAG 检索能正确返回相关实体，CI/Release workflow 全绿。
- GitHub Release v2.7.5：<https://github.com/YJLZSL/Plotline/releases/tag/v2.7.5>
- v2.7.4：修复 v2.7.3 CI 中发现的 SQLite 错误 `ESCAPE expression must be a single character`（`src-tauri/src/services/ai.rs` RAG 检索中的 `LIKE ESCAPE` 子句）；v2.7.3 的所有功能改进完整保留，CI/Release workflow 全绿。
- GitHub Release v2.7.4：<https://github.com/YJLZSL/Plotline/releases/tag/v2.7.4>
- v2.7.3：修复 v2.7.2 CI 中发现的 Rust 编译错误（`src-tauri/src/services/ai.rs` 中 `NeedApi` 字段匹配不完整、`UpdateWorkspaceInput` 字段缺失、`entities` 借用/移动问题），v2.7.2 的所有功能改进完整保留。tag 已推送，但 CI/Release workflow 在 `cargo test` 阶段因 SQLite `ESCAPE expression must be a single character` 错误失败，未生成可用 Release。功能由 v2.7.4 完整发布。
- GitHub Release v2.7.3：<https://github.com/YJLZSL/Plotline/releases/tag/v2.7.3>（tag 已推送，Release 未成功；请使用 v2.7.4）
- v2.7.2：v2.7.0 体验问题深度修复（Markdown 渲染、动画性能、时间轴交互、AI 助手能力、番茄钟成就、MC 主题与字体兼容）。tag 已推送，但 CI/Release workflow 因 `src-tauri/src/services/ai.rs` 等处 Rust 编译错误失败，未生成可用 Release。功能由 v2.7.3 完整发布。
- GitHub Release v2.7.2：<https://github.com/YJLZSL/Plotline/releases/tag/v2.7.2>（tag 已推送，Release 未成功；请使用 v2.7.3）
- v2.7.0：全面打磨与 AI 增强（Markdown 渲染、动画性能、时间轴交互、AI 能力快捷栏、KV Cache/RAG、番茄钟成就重置、MC 主题趣味化）。
- GitHub Release v2.7.0：<https://github.com/YJLZSL/Plotline/releases/tag/v2.7.0>
- v2.6.2：修复 v2.6.1 Rust 测试编译错误，UI/UX 与 AI 助手改进完整保留。
- v2.6.1：时间轴布局修复、动画与设置页质感提升、AI 连接状态可见性（tag 已推送，但 Release 因 Rust 测试编译错误失败，功能由 v2.6.2 完整发布）。
- v2.6.0：AI 风格模板 chips、AI apply-to-doc、时间轴筛选折叠、模板向导空状态。
- v2.5.4：番茄钟可拖动、时间轴右键菜单、主题质感升级、AI 上下文增强。
- v2.3.0：时间轴连线修复、MC 主题配色重构、文本模式可见性、设置教程、番茄钟联动。
- v2.2.0：时间轴/事件逻辑重写、动画与性能优化、MC 主题再设计、工作区保存改进、自定义字体导入、真实浏览器测试。
- GitHub Release v2.6.0：<https://github.com/YJLZSL/Plotline/releases/tag/v2.6.0>
- GitHub Release v2.5.4：<https://github.com/YJLZSL/Plotline/releases/tag/v2.5.4>
- GitHub Release v2.3.0：<https://github.com/YJLZSL/Plotline/releases/tag/v2.3.0>
- GitHub Release v2.2.0：<https://github.com/YJLZSL/Plotline/releases/tag/v2.2.0>

### 下一迭代方向（v3.2+ 候选）
- 地图：地点分组/图层、打印/PDF 导出、角色足迹连线。
- VN：角色立绘插槽拖拽、完整预览播放器、导出 Ren'Py 增强。
- 世界观：种族/物种/宗教等实体管理、设定冲突检测。
- AI：Agent 式工作流，自动整理大纲/发现时间轴漏洞。
- UI 美术：统一空状态插画、卡片质感升级、日文翻译补全。
- 番茄钟：与写作目标绑定、每日统计、通知提醒。

---

## 2. 前端编码规范

### 2.1 文件与命名
- 组件文件：`PascalCase.tsx`（如 `EventCard.tsx`）。
- 工具/hooks：`camelCase.ts`（如 `useWorkspace.ts`）。
- 类型文件：`*.types.ts` 或集中在 `src/types/`。
- 一个文件 = 一个默认导出组件，或一组相关纯函数。

### 2.2 组件结构
```tsx
// 1. import 顺序：react → 第三方 → 本库 → 类型
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Event } from '@/types/event';

// 2. 类型声明
interface EventCardProps {
  event: Event;
  onSelect?: (id: string) => void;
}

// 3. 组件
export function EventCard({ event, onSelect }: EventCardProps) {
  // hooks 在前
  // 派生状态
  // 事件处理
  // return JSX
}

// 4. 子组件（如有）放在同一文件，跟随主组件
```

### 2.3 状态管理
- **跨组件共享**：用 Zustand store，文件位于 `src/stores/<domain>.ts`。
- **服务端数据**：用 TanStack Query，封装在 `src/features/<domain>/api.ts`。
- **组件内部状态**：用 `useState` / `useReducer`，不要无脑上 Zustand。
- **禁止** Context Provider 滥用：仅用于主题、i18n、Toast 等真正全局的。

### 2.4 路径别名
- 使用 `@/*` 指向 `src/*`，已在 `vite.config.ts` 和 `tsconfig.json` 配置。
- 禁止相对路径 `../../..`，超过 2 层就用 `@/`。

### 2.5 样式
- **必须** 通过 Tailwind 类名写样式。
- 主题颜色用 Tailwind 主题别名：`bg-bg-base`、`text-text-primary`、`bg-accent`、`border-border`。
- 动画用 Framer Motion，统一曲线 `transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}`。
- **禁止** 内联 `style={{}}` 写颜色，除非是动态计算值（如轨道色）。

### 2.6 IPC 调用
```ts
// src/lib/ipc.ts 已封装 invoke
import { invoke } from '@tauri-apps/api/core';

export async function listWorkspaces(): Promise<Workspace[]> {
  return invoke<Workspace[]>('list_workspaces');
}
```
- 所有 IPC 调用集中在 `src/features/<domain>/api.ts`，**禁止在组件里直接 `invoke`**。
- 命名约定：前端函数 `camelCase`，对应 Rust 命令 `snake_case`。
- 返回类型显式标注，禁止靠推断。

### 2.7 错误处理
- IPC 错误统一在 TanStack Query 的 `onError` 里通过 `useToast` 显示。
- **禁止** 在组件内 `try/catch` 后 `console.log` 然后吞掉。
- 可预期错误（如校验）用 `AppError` 的 `code` 字段区分。

### 2.8 时间轴与动画编排约定（v3.1.0+）
- **时间轴坐标单一源**：所有时间↔像素换算必须通过 `viewportState` + `getXAtTime` / `getTimeAtX` 纯函数（`src/features/timeline/timelineGrid.ts`）完成，**禁止**组件内独立实现 `timeToX` / `xToTime`，避免多源坐标计算导致标尺、事件卡片、连接线、Today 线错位。
- **动画场景预设统一消费**：跨视图切换、批量元素入场、拖拽归位 + 连接线、AI 面板展开、Sidebar 导航入场等动画必须通过 `src/lib/motionOrchestrator.ts` 的 `getScenePreset(scene, { enhanced })` 消费场景预设，统一管理 stagger / delay / exit timing；`prefers-reduced-motion` 或"增强动效"开关关闭时退化为 200ms 同步淡入。
- **时间轴工具栏四分组结构**：`TimelineView` 工具栏必须保持四分组结构（Create / Filter / View mode / More），View mode 使用 segmented control，More 收纳低频操作；**禁止**将筛选或视图模式控件散落到其他分组。
- **Sidebar 三分组结构**：Sidebar 必须保持三分组结构（工作区视图 / 创作辅助 / 系统），新增导航项归入对应分组并补全 `nav.tooltip.*` 文案；**禁止**新增重复或重叠的入口（如 AI 相关入口仅保留"AI 创作"）。
- **拖动吸附单一源**：拖动吸附必须通过 `viewportState` + `getSnapTimeAtX` / `getSnapXAtTime` 纯函数（`src/features/timeline/timelineGrid.ts`）完成，**禁止**组件内独立计算吸附目标，避免不同组件吸附结果不一致。

---

## 3. 后端（Rust）编码规范

### 3.1 模块组织
- `commands/` 只做：参数反序列化 → 调用 service → 错误转换 → 返回。
- `services/` 写所有业务逻辑、事务、跨表操作。
- `models/` 是纯数据结构 + serde 注解，**不含逻辑**。
- `db/` 提供 `Connection`、迁移、辅助查询函数。

### 3.2 命名
- 命令函数：`snake_case`，动词在前（`create_workspace`、`list_events`）。
- 模块文件名：`snake_case.rs`。
- Struct：`UpperCamelCase`。

### 3.3 错误
- 统一用 `AppError`（`src-tauri/src/error.rs`），实现 `serde::Serialize`。
- **禁止** `unwrap()` / `expect()` 出现在 `commands/` 和 `services/` 路径上（测试代码除外）。
- `?` 操作符搭配 `From<原错误> for AppError` 实现自动转换。

### 3.4 数据库
- 一个写操作 = 一个事务（`tx.execute_batch` 或 `Connection::unchecked_transaction`）。
- SQL 集中在 `services/` 内（不分散到 commands）。
- **禁止** 字符串拼接 SQL，统一用 `rusqlite::params!`。
- 迁移文件 `NNN_description.sql`，**只能新增，不能修改已发布的迁移**。

### 3.5 序列化同步
- Rust struct 字段必须 `#[serde(rename_all = "camelCase")]`，前端类型用 camelCase。
- 时间字段统一 `DateTime<Utc>` 序列化为 ISO 8601 字符串。
- 可选字段用 `Option<T>`，前端对应 `T | null`（不是 `T | undefined`）。

---

## 4. 提交与分支规范

### 4.1 分支

> **2026-06-22 更新**：本项目当前规模较小、迭代节奏快，经项目负责人确认，后续开发直接在 `main` 分支上进行，不再切功能分支。每次提交前必须保证本地检查全绿。

| 分支 | 用途 | 生命周期 |
|---|---|---|
| `main` | 唯一长期分支，开发线与最新 Release 对齐 | 长期 |

**开发流程**：

```
1. 确保本地 main 为最新：
   git checkout main && git pull origin main

2. 直接在 main 上开发并提交（遵循 Conventional Commits）：
   git commit -m "feat(map): 地点节点自定义图标"

3. 推送前必须全量检查通过：
   pnpm lint && pnpm typecheck && pnpm test:run && cargo test --manifest-path src-tauri/Cargo.toml && cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

4. 推送 main：
   git push origin main

5. 需要发布时打 tag 触发 CI：
   git tag v1.5.0
   git push origin v1.5.0
```

**重要原则**：
- `main` 上的代码必须始终可发布（已通过完整测试）
- 禁止从 main 切出长期存在的功能分支；所有改动直接提交到 main
- Release tag 应指向 `main` 上的某个 commit
- 发布前统一版本号、`更新日志.md`、releases/vX.Y.Z/latest.json

### 4.2 Commit 信息
遵循 **Conventional Commits**：
```
<type>(<scope>): <subject>

<body 可选>

<footer 可选，如 Closes #123>
```
- `type`：`feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `perf`
- `scope`：`workspace` / `timeline` / `characters` / `outline` / `statistics` / `notebook` / `settings` / `backend` / `ui` / `deps`
- `subject`：祈使句，不超过 50 字，结尾不加句号

示例：
```
feat(timeline): 支持滚轮缩放时间轴
fix(characters): 修复删除角色未清理关联事件
docs(agents): 补充 IPC 调用规范
```

### 4.3 提交检查清单
- [ ] 本地 `pnpm lint` 无报错
- [ ] 本地 `pnpm typecheck` 无报错
- [ ] 本地 `pnpm test:run` 全绿
- [ ] 本地 `cargo test` 全绿且 `cargo clippy -- -D warnings` 无告警
- [ ] 新增功能有对应测试
- [ ] 改动 IPC 时同步了前后端类型
- [ ] 改动数据库时新增了迁移文件
- [ ] UI 改动截图/录屏附在提交说明或相关 issue 中

### 4.4 发布检查清单（Release）
- [x] 版本号已统一（`package.json`、`Cargo.toml`、`tauri.conf.json`）
- [x] `更新日志.md` 已更新
- [x] `releases/vX.Y.Z/latest.json` 已创建（signature 字段已填入真实签名，不是 `<PLACEHOLDER>`）
- [x] **签名密钥检查**：本地 `keys/plotline.key` 存在，GitHub Secret `TAURI_SIGNING_PRIVATE_KEY` 已配置
- [x] **自动更新验证**：GitHub Release 页面包含 `.exe`、`.msi`、`.sig` 和 `latest.json` 四个文件
- [x] 老版本客户端可正常检测并安装更新（`https://github.com/YJLZSL/Plotline/releases/latest/download/latest.json` 可访问）

> **签名密钥说明**：`.github/workflows/release.yml` 已配置显式签名步骤，CI 会自动为 `.exe` 生成 `.sig` 并创建 `latest.json` 上传 Release。正常情况下无需手动干预；仅在 CI 失败或 GitHub Secret `TAURI_SIGNING_PRIVATE_KEY` 失效等紧急情况下，才使用本地 `keys/plotline.key` 手动签名并上传作为 fallback。详见 `交接文档.md` 中的 "签名密钥状态" 部分。
>
> **v2.5.3 迭代说明**：v2.5.3 的 Release 检查清单已全部完成；`.sig` 与 `latest.json` 首次由 CI 自动生成并验证通过。后续版本发布前仍需统一版本号、`更新日志.md`，但不再需要手动维护 `releases/vX.Y.Z/latest.json` 的签名。

---

## 5. 测试规范

详见 `docs/测试规范.md`。要点：

- **单元测试**：`*.test.ts(x)` 与被测文件同目录，Vitest 运行。
- **Rust 测试**：`#[cfg(test)] mod tests { ... }` 在文件底部，`cargo test` 运行。
- **E2E**：`tests/e2e/<flow>.spec.ts`，Playwright 运行，覆盖关键用户流程。
- **测试命名**：`it('should <期望行为> when <条件>')`。
- **禁止** 测试中调用真实 Tauri IPC，用 `vi.mock('@/features/<domain>/api')`。

---

## 6. 美术与交互规范（不可妥协）

> 这是本项目的核心竞争力，请严格遵守 PRD 第五章。

### 6.1 颜色
- 主色必须是 **暖色**（米白/琥珀/陶土/棕），**禁止冷蓝渐变**。
- 轨道色用马卡龙色板：`#F4B6C2 #B6D4F4 #B6F4C8 #F4E4B6 #D8B6F4 #F4CBB6`。
- 状态色：草稿灰、完成绿（柔和不刺眼）、待修改橙。

### 6.2 动效
- 时长 200-300ms，曲线 `cubic-bezier(0.16, 1, 0.3, 1)`。
- **禁止** 弹性、弹跳、闪烁、旋转 loading。
- 加载用骨架屏 + 淡入脉冲。
- 视图切换用 300ms 淡入淡出。

### 6.3 圆角与阴影
- 卡片 8px / 按钮 6px / 对话框 12px。
- 阴影柔和弥散，禁止 1px 实线高对比阴影。

### 6.4 图标
- 统一 Lucide React，2px 线宽。
- 尺寸：按钮内 16px、导航 20px、空状态 24px。
- 颜色跟随文字色或 accent，**不单独引入其他图标库**。

### 6.5 字体
- 界面字体通过 `--font-sans` 统一控制；编辑器字体通过 `--font-mono` 控制。
- 像素字体栈 `--font-pixel` 用于番茄钟 MC 主题与全局字体主题，fallback 顺序：`"Zpix", "站酷快乐体", "Microsoft YaHei", monospace`。
- 切换字体主题时通过 CSS 变量即时生效，禁止在组件内硬编码 `font-family`。

### 6.6 文案
- 中文优先，所有文案必须走 i18n。
- 错误提示友好具体，给出解决方案（如"路径不存在，请检查后重试"）。
- 空状态必须有引导文案 + CTA 按钮。

---

## 7. 禁忌清单（DO NOT）

| ❌ 禁止 | ✅ 应该 |
|---|---|
| `any` / `@ts-ignore` | 显式类型 + Zod 运行时校验 |
| 内联 `style={{ color: 'red' }}` | Tailwind 类名 / CSS 变量 |
| 组件里直接 `invoke` | 封装在 `features/<x>/api.ts` |
| 字符串拼接 SQL | `params!` 参数化 |
| `unwrap()` 在生产路径 | `?` + `AppError` |
| 改已发布迁移 | 新增迁移补丁 |
| 删除测试 | 改测试以匹配新行为 |
| 引入新依赖未经 ADR | 在 `docs/技术决策.md` 记录 |
| 用 Python 脚本生成图标 | 使用 `scripts/render-icon.py`（基于 SVG + Skia） |
| 组件内硬编码 `font-family` | 使用 CSS 变量 `--font-sans` / `--font-mono` / `--font-pixel` |
| 冷蓝色主色 | 暖色调主题 |
| 旋转 loading | 骨架屏 |
| 弹性/闪烁动画 | 200-300ms ease-out |

---

## 8. AI 接手时的 5 步上手流程

1. `Read` 本文件 + `交接文档.md` + `docs/文档索引.md` + `docs/架构设计.md` + `产品需求与设计文档.md`。
2. `git log --oneline -20` 看最近提交，了解项目节奏。
3. **检查密钥环境**：确认 `keys/plotline.key` 存在；若需 CI 自动签名，确认 GitHub Secret `TAURI_SIGNING_PRIVATE_KEY` 已配置（详见 `docs/密钥管理指南.md`）。
4. 若 `pnpm` 不可用，可直接使用 `node_modules/.bin` 中的 `tsc`、`eslint`、`vitest`、`tauri` 等命令。
5. `pnpm install && pnpm dev`（或 `./node_modules/.bin/vite`）跑起来，体验当前状态。
6. 用 `Grep`/`Glob` 定位要改的文件，**不要凭文件名猜路径**。
7. 改动后立即 `pnpm lint && pnpm typecheck && pnpm test:run && cargo test --manifest-path src-tauri/Cargo.toml`，全绿再提交。

---

> 文档版本：v0.6.0  
> 最后更新：2026-06-29（v3.2.0 开发中：时间轴拖动吸附）
