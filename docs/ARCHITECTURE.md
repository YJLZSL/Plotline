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
│   │   └── views/            # 顶级视图（5 大模块各一个）
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
- **自动备份**：每次启动时复制 `.db` 到 `backups/`，保留最近 10 份。
- **崩溃恢复**：应用启动时检测 `.db.lock`，若存在则提示恢复。
- **撤销/重做**：前端维护操作历史栈（Zustand middleware），仅对编辑类操作生效。

---

## 六、关键决策记录（ADR 摘要）

详见 `docs/DECISIONS.md`。

1. **ADR-001**：选择 Tauri 而非 Electron —— 包体积、内存占用、原生体验更优。
2. **ADR-002**：选择 SQLite 而非 JSON 文件 —— 关系数据查询效率、事务保证。
3. **ADR-003**：状态管理用 Zustand 而非 Redux —— 减少样板，AI 易上手。
4. **ADR-004**：时间轴用 SVG + Framer Motion —— 矢量、可访问、动画自然。
5. **ADR-005**：前后端类型同步采用手工维护 + Zod 运行时校验 —— 避免 codegen 复杂度。
6. **ADR-006**：自动保存采用"每次变更立即落库"而非定时保存 —— 数据零丢失。

---

> 文档版本：v0.2.0  
> 最后更新：2026-06-22
