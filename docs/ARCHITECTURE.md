# 架构设计文档（Architecture）

> 本文档描述 Plotline 的整体技术架构、模块边界、数据流和关键技术决策。
> 任何 AI 接手开发前，请先通读本文与 `AGENTS.md`。

---

## 一、技术栈总览

| 层 | 选型 | 说明 |
|---|---|---|
| 桌面外壳 | **Tauri 2.x** | 跨平台（Win/macOS/Linux），Rust 后端，包体积 ~10MB |
| 前端框架 | **React 18 + TypeScript 5** | 主流生态，AI 友好 |
| 构建工具 | **Vite 5** | 极速 HMR，Tauri 官方推荐 |
| 样式方案 | **Tailwind CSS v4 + CSS Variables** | 实用优先 + 主题切换 |
| 状态管理 | **Zustand 5**（UI/本地状态） | 轻量、无样板 |
| 服务端状态 | **TanStack Query 5** | 缓存 Tauri IPC 调用结果 |
| 路由 | **React Router 6** | 工作区 ↔ 视图嵌套路由 |
| 富文本 | **TipTap 2** | 事件描述 / 笔记编辑器 |
| 画布 | **原生 SVG + Framer Motion** | 时间轴事件、角色关系图、连线 |
| 图表 | **Recharts** | 统计视图 |
| 动画 | **Framer Motion 11** | 200-300ms ease-out 过渡 |
| 图标 | **Lucide React** | 2px 线性图标 |
| UI 原语 | **Radix UI** | 无障碍交互（对话框、菜单、Tooltip） |
| 表单 | **React Hook Form + Zod** | 类型安全的表单与校验 |
| 日期 | **date-fns** | 日期处理 |
| Markdown 导出 | **后端字符串模板** | v1.1 新增 |
| HTML 转 Markdown | **turndown** | 未来用于反向转换 |
| 后端语言 | **Rust（stable）** | Tauri 原生 |
| 数据库 | **SQLite + rusqlite** | 嵌入式本地数据库 |
| 序列化 | **serde + serde_json** | Rust ↔ JSON |
| 国际化 | **i18next + react-i18next** | 中/繁/英 |
| 测试 | **Vitest + React Testing Library + Playwright** | 单元 + E2E |
| 包管理 | **pnpm** | workspace 友好 |

---

## 二、目录结构

```
plotline/
├── src-tauri/                # Rust 后端
│   ├── src/
│   │   ├── main.rs           # Windows 入口（不要改）
│   │   ├── lib.rs            # Tauri Builder 与插件注册
│   │   ├── db/               # 数据库连接、迁移
│   │   ├── models/           # 与 PRD 第三章节对齐的领域模型
│   │   ├── commands/         # Tauri commands（前端可调用）
│   │   ├── services/         # 业务逻辑（与 commands 解耦）
│   │   ├── error.rs          # 统一错误类型
│   │   └── export.rs         # 导入/导出 JSON
│   ├── migrations/           # SQL 迁移脚本
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── src/                      # React 前端
│   ├── app/                  # 应用级（路由、Provider、根布局）
│   ├── components/
│   │   ├── ui/               # 基础原子组件（Button、Card、Dialog...）
│   │   ├── layout/           # 应用布局（Sidebar、Toolbar、StatusBar）
│   │   └── views/            # 顶级视图 + 第四阶段可视化（甘特图、树状图、关系矩阵、高级统计图表）
│   ├── features/             # 按业务领域拆分
│   │   ├── workspace/        # 工作区
│   │   ├── timeline/         # 时间轴
│   │   ├── characters/       # 角色
│   │   ├── outline/          # 大纲
│   │   ├── statistics/       # 统计
│   │   ├── notebook/         # 笔记
│   │   └── settings/         # 设置
│   ├── stores/               # Zustand stores
│   ├── hooks/                # 通用 hooks
│   ├── lib/                  # ipc 封装、格式化、工具函数
│   ├── types/                # 与 Rust 模型同步的 TS 类型
│   ├── styles/               # 全局样式、主题变量
│   ├── i18n/                 # 翻译资源
│   ├── App.tsx
│   └── main.tsx
├── tests/                    # Playwright E2E
├── docs/                     # 架构、测试、ADR、数据模型
├── public/                   # 静态资源
├── AGENTS.md                 # AI 协作规范（必读）
├── README.md
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── eslint.config.js
└── .github/workflows/ci.yml  # CI 流水线
```

### 模块边界原则
- `src/components/ui/`：**纯展示、无业务**的原子组件，任何 feature 都可使用。
- `src/components/views/`：**顶级视图外壳**，内部组合 `features/*` 的子模块。
- `src/features/<domain>/`：包含该领域的组件、hooks、store slice、ipc 调用。
- `src-tauri/src/commands/`：**仅做参数校验与 IO 转发**，业务逻辑放在 `services/`。
- `src/types/`：与 `src-tauri/src/models/` 一一对应，是前后端的契约层。

---

## 三、数据流

```
┌─────────────────────────────────────────────────────────────┐
│ React UI                                                    │
│   └─ TanStack Query (useQuery / useMutation)                │
│       └─ lib/ipc.ts -> invoke<T>('command_name', args)      │
└──────────────────┬──────────────────────────────────────────┘
                   │  JSON-RPC over Tauri IPC
┌──────────────────▼──────────────────────────────────────────┐
│ Rust commands/  (参数校验 + 错误转换)                       │
│   └─ services/  (业务逻辑)                                  │
│       └─ db/    (rusqlite 连接池 + 事务)                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
                SQLite (本地文件)
```

### 关键约定
- 所有 IPC 命令返回 `Result<T, AppError>`，前端通过 `invoke` 解包。
- `AppError` 序列化为 `{ code: string, message: string }`，前端统一 toast 显示。
- 写操作采用**乐观更新 + 失败回滚**：TanStack Query 的 `onMutate` 写入缓存，`onError` 回滚。
- 所有时间戳使用 ISO 8601 字符串存储（UTC），UI 层格式化为本地时区。
- 自动保存 = 每次写操作立即落库；前端无需"保存"按钮。

---

## 四、主题与美术体系

> 严格遵循 PRD 第五章"视觉设计系统"。

### 主题令牌（CSS Variables）
在 `src/styles/themes.css` 中定义三套主题（light / dark / sepia），通过 `data-theme` 属性切换。
Tailwind 通过 `@theme inline` 引用这些变量，保证 **一套类名跨主题生效**。

```css
[data-theme="light"] {
  --bg-base: #FAF7F0;          /* 米白 */
  --bg-surface: #FFFFFF;
  --bg-elevated: #F5EFE3;
  --text-primary: #3A2E26;     /* 深棕灰 */
  --text-secondary: #7A6B5E;
  --accent: #C68A3E;           /* 琥珀 */
  --accent-soft: #E8C988;
  --border: #E5DDC9;
  --shadow: 0 1px 3px rgba(58,46,38,0.08), 0 8px 24px rgba(58,46,38,0.06);
}
[data-theme="dark"] {
  --bg-base: #1E1A16;
  --bg-surface: #2A241F;
  --bg-elevated: #352D27;
  --text-primary: #F5EFE3;
  --text-secondary: #B5A89A;
  --accent: #E0A95C;
  --accent-soft: #8A5E2C;
  --border: #3D352E;
  --shadow: 0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4);
}
[data-theme="sepia"] {
  --bg-base: #F2E8D5;
  --bg-surface: #EFE2C8;
  --bg-elevated: #E7D7B6;
  --text-primary: #4A3927;
  --text-secondary: #7A6347;
  --accent: #A86A2C;
  --accent-soft: #D4B47C;
  --border: #D6C29C;
  --shadow: 0 1px 3px rgba(74,57,39,0.10), 0 8px 24px rgba(74,57,39,0.08);
}
```

### 设计原则
- **暖色调主导**：禁止使用冷蓝色渐变作为主色。
- **柔和阴影**：`box-shadow` 用大面积低不透明度，避免锐利边。
- **圆角**：卡片 8px、按钮 6px、对话框 12px。
- **轨道色板**：马卡龙色系（淡粉/淡蓝/淡绿/淡黄/淡紫），饱和度 ≤ 60%。
- **动画**：统一 `cubic-bezier(0.16, 1, 0.3, 1)` 200-300ms，禁止弹性/闪烁。
- **加载状态**：骨架屏 + 淡入脉冲，**禁用旋转 loading 图标**。

---

## 五、性能与可靠性

- **1000 事件流畅滚动**：时间轴使用 Konva Canvas（非 DOM），仅渲染视口内事件。
- **虚拟列表**：角色卡片、笔记列表用 `@tanstack/react-virtual`。
- **数据库索引**：`events(workspace_id, track_id, date)`、`characters(workspace_id)` 等关键查询索引。
- **事务**：所有跨表写入使用 SQLite 事务，失败回滚。
- **自动备份**：v1.0 起在 Tauri `setup` hook 中调用
  `services::backup::backup_workspace_db`，每次启动把当前 `.db` 滚动复制到
  `<app-data>/backups/plotline-<ISO8601>.db`，按文件名时间戳保留最近 10 份；
  失败仅 `log::warn!`，不阻塞主流程。
- **自动更新**：v1.0 起集成 `tauri-plugin-updater`，manifest endpoint 指向
  GitHub Releases，签名采用 Ed25519。详见 ADR-010。
- **一致性检查**：`services::consistency::check_event_conflicts` 检测同一角色
  在同一时间点跨多轨道的冲突，前端 `TimelineView` 工具栏可手动触发。
- **事件连接与伏笔追踪**：v1.1 起 `event_connections` 表正式启用，`TimelineView`
  可创建因果/伏笔连接，`StatisticsView` 展示伏笔生命周期。详见 ADR-015。
- **撤销/重做**：v1.1 起前端维护命令历史栈（Zustand middleware），覆盖事件、轨道、
  角色、笔记、大纲节点的创建/更新/删除。详见 ADR-014。
- **Markdown 导出**：v1.1 起后端 `services::export` 支持导出工作区/大纲为 Markdown。
  详见 ADR-013。
- **第四阶段可视化**：v1.2 起新增甘特图、大纲树状图、关系矩阵、情节密度图、
  角色弧线时间轴。均为**纯前端 SVG**实现，复用既有 TanStack Query 数据缓存，
  不新增 IPC 命令，mock 层自动对等。布局算法集中在 `features/*/layout.ts`，
  视图组件在 `components/views/`。详见 ADR-016。
- **崩溃恢复**：应用启动时检测 `.db.lock`，若存在则提示恢复。
- **动效一致性**：`src/lib/motion.ts` 暴露 fast/base/slow 三档 token，所有
  framer-motion `transition` 必须引用 token，禁止字面量。详见 ADR-008。

---

## 六、关键决策记录（ADR 摘要）

详见 `docs/DECISIONS.md`。

1. **ADR-001**：选择 Tauri 而非 Electron —— 包体积、内存占用、原生体验更优。
2. **ADR-002**：选择 SQLite 而非 JSON 文件 —— 关系数据查询效率、事务保证。
3. **ADR-003**：状态管理用 Zustand 而非 Redux —— 减少样板，AI 易上手。
4. **ADR-004**：时间轴用 SVG + Framer Motion —— 矢量、可访问、动画自然。
5. **ADR-005**：前后端类型同步采用手工维护 + Zod 运行时校验 —— 避免 codegen 复杂度。
6. **ADR-006**：自动保存采用"每次变更立即落库"而非定时保存 —— 数据零丢失。
7. **ADR-008**：集中化动效 token（fast/base/slow）—— 一致缓动 + 微交互提速。
8. **ADR-009**：启动时滚动备份 SQLite —— 本地优先的数据保护兜底。
9. **ADR-010**：自动更新通过 `tauri-plugin-updater` + GitHub Releases —— Ed25519 签名。
10. **ADR-011**：一致性检查先做最小切片 —— 同一角色跨轨道时间点冲突。
11. **ADR-012**：富文本编辑器采用 TipTap 2 —— 可扩展、React 友好。
12. **ADR-013**：Markdown 导出采用后端模板生成 —— 创作者通用格式。
13. **ADR-014**：撤销/重做采用前端命令历史栈 —— 不改动后端、覆盖主要 CRUD。
14. **ADR-015**：事件连接与伏笔追踪 —— 启用 `event_connections` 并暴露到前端。
15. **ADR-016**：第四阶段可视化采用纯前端 SVG —— 零新增 IPC、复用数据缓存。

---

> 文档版本：v1.2.0  
> 最后更新：2026-06-22
