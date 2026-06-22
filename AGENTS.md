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
- `docs/ARCHITECTURE.md` — 整体架构
- `docs/TESTING.md` — 测试流程
- `docs/DECISIONS.md` — 关键技术决策
- `docs/DATA_MODEL.md` — 数据模型与 ER 图
- `产品需求与设计文档.md` — PRD（永远以它为最终事实源）

### 当前迭代状态（v1.5.0 已完成）
- **AI 多服务商支持**：设置页 AI 标签新增可视化服务商选择卡片（`src/features/ai/providers.tsx`），内置 OpenAI、硅基流动、火山方舟、腾讯混元、DeepSeek、Moonshot、智谱 AI、Ollama 本地、自定义共 9 种预设，每个预设携带官方品牌色、简化单色 SVG 图标、推荐 baseUrl 与模型名，点击自动填充并提供「获取 API Key」直达链接；AI 助手面板顶部同步显示当前服务商品牌图标。
- **统一应用图标**：重新设计羽毛笔沿时间线书写的优雅图标（`src-tauri/icons/icon.svg` + `src/components/ui/BrandMark.tsx`），应用内外使用同一构图，消除此前 BrandMark 与 icon.svg 不一致问题；Skia 重新渲染全部 19 个 PNG/ICO 尺寸。
- **数据导入修复**：修复工作区导入时笔记归属错误工作区（HIGH）、大纲父子层级丢失（HIGH）、笔记文件夹层级丢失（MEDIUM）三个数据损坏 bug，新增 4 项 Rust 回归测试。
- **错误处理加固**：移除 AI `kv_set` 生产路径 `unwrap()`（HIGH）；统计/计数查询 `unwrap_or(0)` 统一改为 `?` 传播（13 处）；JSON 解析损坏时 `log::warn` 而非静默吞错（4 处）；地点连接新增跨工作区校验。
- **竞品调研与问题审计**：新增 `docs/COMPETITOR_RESEARCH.md`（5 款竞品对比）与 `docs/ISSUE_AUDIT.md`（16 项问题，10 项已修复）。
- **测试**：本地 `vitest run`（129 passed）、`cargo test`（40 passed）、`cargo clippy -- -D warnings`、`eslint` 全绿。
- **构建与发布**：v1.5.0 Windows 安装包（NSIS + MSI）与签名 `latest.json` 已发布到 GitHub Release。

### 下一迭代方向（v1.6 候选）
- **导出格式扩展**：增加 ePub、PDF、Word 导出，对标 Scrivener 编译系统。
- **导出包补全**：`WorkspaceBundle` 加入 VN 场景/台词、地点、地点连线，消除静默数据丢失。
- **AI 流式输出**：支持 SSE 流式响应，AI 回复逐字显示；AI 系统提示词可配置。
- **VN 编辑器**：台词富文本编辑、角色立绘插槽、预览播放器、分支调试器。
- **地图 polish**：地点分组/图层、更丰富的图标库、地图打印/PDF 导出。
- **世界观模块**：参考 Campfire 增加种族/物种/宗教等实体管理。
- **UI 美术**：统一空状态插画、卡片质感升级、更多主题预设、日文翻译补全。
- **E2E 测试**：补充 Playwright spec 覆盖关键用户流程。
- **CSP 配置**：`tauri.conf.json` 配置 CSP 白名单替代 `null`。

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
- 发布前统一版本号、CHANGELOG、releases/vX.Y.Z/latest.json

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

---

## 5. 测试规范

详见 `docs/TESTING.md`。要点：

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
| 引入新依赖未经 ADR | 在 `docs/DECISIONS.md` 记录 |
| 用 Python 脚本生成图标 | 使用 `scripts/render-icon.py`（基于 SVG + Skia） |
| 组件内硬编码 `font-family` | 使用 CSS 变量 `--font-sans` / `--font-mono` / `--font-pixel` |
| 冷蓝色主色 | 暖色调主题 |
| 旋转 loading | 骨架屏 |
| 弹性/闪烁动画 | 200-300ms ease-out |

---

## 8. AI 接手时的 5 步上手流程

1. `Read` 本文件 + `docs/ARCHITECTURE.md` + `产品需求与设计文档.md`。
2. `git log --oneline -20` 看最近提交，了解项目节奏。
3. 若 `pnpm` 不可用，可直接使用 `node_modules/.bin` 中的 `tsc`、`eslint`、`vitest`、`tauri` 等命令。
4. `pnpm install && pnpm dev`（或 `./node_modules/.bin/vite`）跑起来，体验当前状态。
5. 用 `Grep`/`Glob` 定位要改的文件，**不要凭文件名猜路径**。
6. 改动后立即 `pnpm lint && pnpm typecheck && pnpm test:run && cargo test --manifest-path src-tauri/Cargo.toml`，全绿再提交。

---

> 文档版本：v0.5.0  
> 最后更新：2026-06-23
