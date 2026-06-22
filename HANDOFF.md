# Plotline v1.3.0 归档文档

> 本文档记录 v1.3.0 版本的关键决策与遗留事项，供后续迭代参考。
> 若你是新接手的 AI，请先阅读 `AGENTS.md`，本文档仅作为历史参考。

---

## 1. 版本信息

- **版本**：v1.3.0（已发布）
- **Release**：https://github.com/YJLZSL/Plotline/releases/tag/v1.3.0
- **发布时间**：2026-06-22

---

## 2. v1.3.0 新增功能摘要

- **地图与视觉小说**：`MapView`（SVG 画布地点节点）、`VnView`（场景/对话/选项台词）
- **番茄钟**：`PomodoroTimer` 浮层组件，支持 `warm` / `mc` / `minimal` 三主题
- **全局字体主题**：`sans` / `mono` / `pixel` 三种界面字体，通过 CSS 变量 `--font-sans` / `--font-mono` 切换
- **性能优化**：`AnimatePresence mode="sync"` + 160ms 快速曲线，时间轴滚轮水平滚动 + Ctrl 缩放
- **图标重绘**：`scripts/generate-icons.mjs`（纯 Node.js，无 Python 依赖）

---

## 3. 关键文件位置

| 用途 | 路径 |
|---|---|
| 自动更新配置 | `src-tauri/tauri.conf.json` |
| 启动检查更新 | `src-tauri/src/lib.rs` |
| 更新清单 | `releases/v1.3.0/latest.json` |
| 签名私钥（勿提交） | `keys/plotline.key` |
| 图标生成脚本 | `scripts/generate-icons.mjs` |
| 插件使用指南 | `docs/PLUGINS.md` |

---

## 4. 已知遗留问题（v1.4 建议）

1. `src-tauri/src/models/location.rs:62` `workspace_id` 字段未使用，建议清理或启用。
2. `identifier` 以 `.app` 结尾，macOS 上可能冲突；当前只发布 Windows，可忽略或 v1.4 调整。
3. MapView / VnView 的 UI 交互测试尚未补齐，主要以端到端测试覆盖。
4. 空状态插画、完整 i18n 留到 v1.4。

---

## 5. 推荐下一步（v1.4）

按优先级：
1. **空状态与插画**：为 Map、VN、Timeline 空状态补齐统一插画与 i18n 文案。
2. **地图增强**：节点自定义图标、角色足迹连线、导出 PNG。
3. **VN 编辑器**：台词文本编辑、角色立绘插槽、预览播放器。
4. **番茄钟闭环**：每日专注统计、写作目标绑定、系统通知。
5. **主题扩展**：更多预设主题、主题市场接口预留。

---

> 最后更新：2026-06-22（v1.3.0 已发布，已合并到 main）
