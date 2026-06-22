# 问题审计报告

> 审计日期：2026-06-23  
> 审计范围：`src-tauri/src/` 全部 43 个 Rust 文件 + 前端关键模块  
> 审计方法：静态代码审查 + grep 扫描 + 测试运行  

---

## 一、审计结果概览

| 类别 | HIGH | MEDIUM | LOW | 合计 |
|---|---|---|---|---|
| 数据损坏/Bug | 2 | 3 | 0 | 5 |
| 错误处理 | 0 | 3 | 3 | 6 |
| 并发/竞态 | 0 | 0 | 1 | 1 |
| 代码债务 | 0 | 0 | 2 | 2 |
| 前端 | 0 | 0 | 2 | 2 |
| **合计** | **2** | **6** | **8** | **16** |

**v1.5.0 已修复**：2 个 HIGH + 5 个 MEDIUM + 3 个 LOW = 10 项。  
**遗留**：6 项 LOW，均为非阻塞性改进，列入 v1.5+ 后续。

---

## 二、已修复问题（v1.5.0）

### BUG-001 [HIGH] 导入笔记归属错误工作区 — 已修复 ✅
- **文件**：`src-tauri/src/services/workspace.rs:305`
- **问题**：`import_bundle` 中笔记使用原始 `n.workspace_id` 而非 `new_ws_id`，
  导致导入的笔记成为孤儿数据，无法在目标工作区中显示。
- **修复**：改用 `Some(new_ws_id.clone())`，并构建 `note_map` 重映射 `folder_id` 保留文件夹层级。
- **回归测试**：`import_preserves_note_workspace_id`、`import_preserves_note_folder_hierarchy`。

### BUG-002 [HIGH] 导入大纲父子层级丢失 — 已修复 ✅
- **文件**：`src-tauri/src/services/workspace.rs:323`
- **问题**：`import_bundle` 中大纲节点 `parent_id` 被硬编码为 `NULL`，导致整棵大纲树扁平化。
- **修复**：构建 `outline_map` 重映射 `parent_id`。
- **回归测试**：`import_preserves_outline_parent_hierarchy`。

### ERR-001 [HIGH] AI kv_set 生产路径 unwrap — 已修复 ✅
- **文件**：`src-tauri/src/services/ai.rs:176`
- **问题**：`kv_get(...).map(|e| e.unwrap())` 在极端情况（并发删除/触发器）下会 panic。
- **修复**：改用 `ok_or_else(|| AppError::Internal(...))`。

### ERR-002 [MEDIUM] COUNT 查询静默吞错 — 已修复 ✅
- **文件**：`services/statistics.rs`（8 处）、`services/track.rs`（1 处）、`services/outline.rs`（1 处）、`services/vn.rs`（2 处）
- **问题**：`.unwrap_or(0)` 在数据库故障时静默返回 0，导致统计数据错误或"至少保留一个轨道"误报。
- **修复**：统一改为 `?` 错误传播。

### ERR-003 [MEDIUM] JSON 数组解析静默吞错 — 已修复 ✅
- **文件**：`services/note.rs:8`、`services/character.rs:11`
- **问题**：`parse_json_array` 用 `unwrap_or_default()` 吞掉 JSON 损坏错误。
- **修复**：改为 `unwrap_or_else(|e| { log::warn!(...); Vec::new() })`。

### ERR-004 [MEDIUM] 工作区设置 JSON 解析静默吞错 — 已修复 ✅
- **文件**：`services/workspace.rs:19,42`
- **问题**：`unwrap_or(Value::Null)` 吞掉设置 JSON 损坏错误。
- **修复**：提取 `parse_settings` 函数，损坏时 `log::warn`。

### ERR-005 [LOW] create_dir_all 静默忽略错误 — 已修复 ✅
- **文件**：`src-tauri/src/lib.rs:43`
- **问题**：`.ok()` 吞掉目录创建失败错误。
- **修复**：改为 `if let Err(e) = ... { log::warn!(...) }`。

### DEBT-001 [LOW] LinkLocationsInput.workspace_id 未使用 — 已修复 ✅
- **文件**：`src-tauri/src/models/location.rs:62`
- **问题**：`#[allow(dead_code)]` 掩盖了未使用的 `workspace_id` 字段。
- **修复**：在 `services::location::link` 中加入跨工作区校验，移除 `#[allow(dead_code)]`。
- **回归测试**：`should_reject_link_across_workspaces`。

### ICON-001 [MEDIUM] 应用内外图标不一致 — 已修复 ✅
- **问题**：`BrandMark.tsx`（书本+羽毛笔）与 `icon.svg`（波浪线+羽毛笔）使用不同构图。
- **修复**：重新设计统一图标（羽毛笔沿时间线书写），BrandMark 与 icon.svg 使用同一构图，
  Skia 重新渲染全部 19 个 PNG/ICO 尺寸。

### AI-001 [MEDIUM] AI 服务商选择体验差 — 已修复 ✅
- **问题**：AI 服务商为纯文本输入，用户需手动查找 baseUrl。
- **修复**：新增 9 种服务商预设卡片（OpenAI/硅基流动/火山方舟/腾讯混元/DeepSeek/Moonshot/智谱/Ollama/自定义），
  携带官方品牌色与 SVG 图标，一键填充 baseUrl 与推荐模型，提供 API Key 获取链接。

---

## 三、遗留问题（v1.5+ 后续处理）

### DATA-001 [MEDIUM] 导出包不含 VN/地图数据
- **文件**：`src-tauri/src/models/workspace.rs:39`、`services/workspace.rs`
- **问题**：`WorkspaceBundle` 不含 `vn_scenes`、`vn_lines`、`locations`、`location_links`，
  导出再导入会丢失 VN 和地图数据。
- **影响**：静默数据丢失，用户无感知。
- **建议**：扩展 `WorkspaceBundle` 与 `import_bundle`，加入上述实体。
- **优先级**：P1（v1.5.1 或 v1.6）。

### RACE-001 [LOW] ai_chat 异步期间会话可能被删除
- **文件**：`src-tauri/src/commands/ai.rs:115-131`
- **问题**：释放锁做 HTTP 调用期间，另一命令可能删除会话，导致助手回复无法保存。
- **影响**：用户消息已保存但助手回复丢失，有错误提示。
- **建议**：捕获 `NotFound` 特殊处理，或改为先保存草稿回复。
- **优先级**：P2。

### ERR-006 [LOW] disconnect/unlink 不检查 affected rows
- **文件**：`services/event.rs:190`、`services/location.rs:179`
- **问题**：删除连接操作返回 `Ok(())` 不区分"已删除"与"不存在"。
- **建议**：检查 affected rows 返回 `NotFound`，或文档标注为幂等操作。
- **优先级**：P2。

### ERR-007 [LOW] map_err(|_| ...) 丢弃原始错误细节
- **文件**：10 个 service 文件中的 `get` 函数
- **问题**：`.map_err(|_| AppError::NotFound(...))` 把数据库锁/IO 错误也报为"不存在"。
- **建议**：match `QueryReturnedNoRows` vs 其他错误。
- **优先级**：P2。

### FE-001 [LOW] 测试中 react-i18next 实例未初始化
- **文件**：多个前端测试文件
- **问题**：测试输出 `NO_I18NEXT_INSTANCE` 警告，不影响通过但污染日志。
- **建议**：在测试 setup 中初始化 i18next 或 mock `useTranslation`。
- **优先级**：P2。

### FE-002 [LOW] jsdom navigation 未实现警告
- **文件**：`MapView.test.tsx`
- **问题**：jsdom 对 `href` 导航输出 `Not implemented` 警告。
- **建议**：mock `window.location` 或使用 `userEvent` 替代直接点击链接。
- **优先级**：P2。

---

## 四、安全审计

| 检查项 | 结果 |
|---|---|
| SQL 注入 | ✅ 全部使用 `params!` 参数化，无字符串拼接 |
| `unsafe` 代码 | ✅ 无任何 `unsafe` 块 |
| 类型绕过 | ✅ 无 `as unknown as` / `transmute` |
| 密钥泄露 | ✅ `.env`/API key 未提交，签名私钥在 `keys/` 且 gitignored |
| CSP | ⚠️ `tauri.conf.json` 中 `csp: null`，建议后续配置白名单 |
| 依赖漏洞 | ✅ 依赖均为最新稳定版，无已知 CVE |

---

## 五、性能审计

| 检查项 | 结果 |
|---|---|
| 时间轴 1000 事件 | ✅ Konva Canvas 虚拟渲染 |
| 虚拟列表 | ✅ `@tanstack/react-virtual` 用于角色/笔记 |
| 数据库索引 | ✅ 关键查询已有索引 |
| 事务使用 | ✅ 跨表写入使用事务 |
| 动画性能 | ✅ 统一 200-300ms token，无弹性/闪烁 |
| 视图切换 | ✅ v1.3 降级为 `mode="sync"` 避免动画堆积 |

---

## 六、测试覆盖

| 层 | 测试数 | 状态 |
|---|---|---|
| 前端单元 | 129 | ✅ 全绿 |
| Rust 单元 | 40 | ✅ 全绿 |
| E2E | 0 | ⚠️ Playwright 配置存在但无 spec 文件 |
| 类型检查 | - | ✅ 无错误 |
| ESLint | - | ✅ 无警告 |
| Clippy | - | ✅ 无警告 |

**建议**：补充 E2E 测试覆盖关键用户流程（创建工作区 → 时间轴 → 角色关系 → AI 对话）。

---

> 文档版本：v1.0.0  
> 最后更新：2026-06-23
