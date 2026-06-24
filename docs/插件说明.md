# Plotline 插件与技能使用指南

> 本文档汇总 Plotline 项目中可用的外部插件（MCP）与技能（Skill）的使用方法，方便后续 AI 或人类开发者快速上手。

---

## 目录

- [GitHub MCP 插件](#github-mcp-插件)
- [Canva MCP 插件](#canva-mcp-插件)
- [其他可用数据源插件](#其他可用数据源插件)
- [项目内置技能](#项目内置技能)
- [推荐工作流](#推荐工作流)

---

## GitHub MCP 插件

### 用途

- 操作 GitHub 仓库（Issue、PR、Release、仓库设置）
- 代码搜索与文件读取（无需本地 clone）
- 调度 Copilot 编码 Agent

### 在 Plotline 项目中的典型用法

#### 1. 查看仓库状态

```bash
# 无需命令，直接通过 MCP 工具调用：
# - search_repositories → 搜索仓库信息
# - list_releases → 列出所有 Release
# - list_branches → 列出所有分支
```

#### 2. 创建 Release（无需 gh CLI）

**传统方式**（需要本地 `gh` CLI）：
```bash
GH_TOKEN="..." gh release create v1.4.0 \
  --repo YJLZSL/Plotline \
  --title "Plotline v1.4.0" \
  --notes "..." \
  --target main \
  Plotline_1.4.0_x64-setup.exe \
  latest.json
```

**使用 GitHub MCP 插件**（更灵活，无需本地 CLI）：

GitHub MCP 插件提供了丰富的 API，可以直接查询 Release、创建 Issue、PR 等。对于上传文件到 Release，当前推荐结合以下两种方式：

- **方式 A（推荐）**：本地构建完成后，使用 `gh` CLI（已下载到 `/tmp/gh/bin/gh.exe`）一键上传
- **方式 B**：若 `gh` 不可用，可通过 GitHub REST API 直接上传（需脚本封装）
- **方式 C**：推送 tag 触发 `.github/workflows/release.yml` CI 自动构建并上传

#### 3. 修改仓库描述

```bash
gh repo edit YJLZSL/Plotline \
  --description "本地优先的叙事创作工作台 | ..." \
  --homepage "https://github.com/YJLZSL/Plotline"
```

或通过 MCP 插件的 `update_repo` 等效操作。

#### 4. 常见查询操作

| 操作 | MCP 工具 |
|---|---|
| 查看仓库信息 | `search_repositories` |
| 列出 Release | `list_releases` |
| 获取特定 Release | `get_release_by_tag` |
| 列出分支 | `list_branches` |
| 列出 Issues | `list_issues` / `search_issues` |
| 列出 PR | `list_pull_requests` / `search_pull_requests` |
| 读取文件内容 | `get_file_contents` |
| 创建/更新文件 | `create_or_update_file` |
| 推送多个文件 | `push_files` |

---

## Canva MCP 插件

### 用途

- 生成海报、演示文稿、小红书笔记等视觉设计
- 基于品牌模板批量产出物料
- 上传资产、管理文件夹、添加评论

### 在 Plotline 项目中的潜在用法

Plotline 作为创作工具，可能用到 Canva 的场景：

1. **生成项目宣传海报**：为 Plotline 制作功能介绍海报、更新日志配图
2. **制作演示文稿**：项目路演、功能介绍 PPT
3. **品牌素材管理**：统一 Logo、配色、字体规范

#### 示例：生成项目海报

```
# 调用 Canva MCP 的 generate-design
design_type: "poster"
query: "Plotline 叙事创作工作台功能介绍海报，暖色调，米白背景，展示时间轴、角色关系、地图、番茄钟四大功能模块"
```

#### 示例：导入设计到 Canva

若有现成的 HTML/PNG 素材，可通过 `import-design-from-url` 导入为可编辑的 Canva 设计。

---

## 其他可用数据源插件

Plotline 项目当前主要使用以下 Kimi 数据源插件（主要用于分析/调研，非核心功能）：

| 插件 | 用途 | 在 Plotline 中可能的使用场景 |
|---|---|---|
| `yahoo_finance` | 股票金融数据 | 若项目涉及付费功能分析 |
| `ifind` | 中国 A 股/港股/美股数据 | 同上 |
| `tianyancha` | 企业工商信息 | 合作伙伴背景调研 |
| `scholar` | 学术文献搜索 | 叙事学/写作工具相关论文调研 |
| `world_bank_open_data` | 全球发展数据 | 若有数据可视化相关功能 |
| `imf` | 全球经济数据 | 同上 |
| `yuandian_law` | 中国法律数据库 | 软件著作权/开源协议咨询 |

> 使用这些数据源时，请先阅读对应技能的 `SKILL.md`，再调用数据源工具。

---

## 项目内置技能

Plotline 项目本身也依赖 Kimi Work 的多个内置技能，这些技能在开发过程中可随时调用：

| 技能 | 用途 | 触发关键词 |
|---|---|---|
| `deep-research-swarm` | 深度调研 | 竞品分析、市场调研 |
| `report-writing` | 报告撰写 | 技术文档、用户手册 |
| `swarm-coding` |  swarm 编码 | 大规模功能开发 |
| `seaborn-visualization` | 数据可视化 | 统计图表、分析报告 |
| `docx` | Word 文档生成 | 导出文档、需求规格书 |
| `md-to-pdf` | Markdown 转 PDF | 文档导出 |
| `kimi-data-tools-v2` | 网络搜索/数据获取 | 实时信息查询 |
| `kimi-webbridge` | 浏览器自动化 | 网页测试、截图验证 |

---

## 推荐工作流

### 场景：手动发布新版本（v1.4.0+）

```
1. 本地构建与测试
   ├── tsc --noEmit
   ├── eslint . --max-warnings=0
   ├── vitest run
   └── cargo test --manifest-path src-tauri/Cargo.toml

2. 构建安装包
   └── pnpm tauri build（或 Node 直接调用）

3. 签名与生成 latest.json
   ├── tauri signer sign ...
   └── 更新 releases/vX.Y.Z/latest.json

4. 推送代码
   ├── git add -A
   ├── git commit -m "release: vX.Y.Z"
   └── git push origin feat/xxx

5. 创建 GitHub Release（三选一）
   ├── [推荐] 推送 tag 触发 CI 自动构建
   │   └── git tag vX.Y.Z && git push origin vX.Y.Z
   ├── [备选] 使用 gh CLI 手动创建
   │   └── GH_TOKEN=... gh release create vX.Y.Z ...
   └── [备选] 使用 GitHub MCP 插件查询/验证
       └── get_release_by_tag, list_releases

6. 验证
   ├── 访问 releases/latest/download/latest.json
   ├── 确认 5 个文件已上传
   └── 旧版本客户端测试自动更新
```

---

## 插件与技能的获取与更新

- **MCP 插件**：由 Kimi Work 运行时自动提供，无需手动安装。当前可用的插件列表会在每次对话开始时显示。
- **技能（Skill）**：由 Kimi Work 内置管理，可通过 `SkillManage` 工具查看、创建、更新。
- **项目本地技能**：若有 Plotline 专属的自定义技能，建议放在 `docs/skills/` 目录下，并在本文件中引用。

---

> 最后更新：2026-06-22
> 版本：v1.3.0
> 维护者：AI 助手（按 AGENTS.md 规范更新）
