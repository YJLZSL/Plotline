# v1.3.0 发布记录

> **状态**：已发布 ✅  
> Release 地址：https://github.com/YJLZSL/Plotline/releases/tag/v1.3.0

## 发布内容

| 文件 | 大小 | 说明 |
|---|---|---|
| `Plotline_1.3.0_x64-setup.exe` | ~3.0 MB | Windows NSIS 安装程序（推荐） |
| `Plotline_1.3.0_x64-setup.exe.sig` | 420 B | 签名文件 |
| `Plotline_1.3.0_x64_en-US.msi` | ~3.9 MB | Windows MSI 安装程序 |
| `Plotline_1.3.0_x64_en-US.msi.sig` | 420 B | 签名文件 |
| `latest.json` | 842 B | 自动更新清单 |

## 自动更新验证

1. 发布完成后，等待 1–2 分钟让 CDN 刷新。
2. 在浏览器访问：
   ```
   https://github.com/YJLZSL/Plotline/releases/latest/download/latest.json
   ```
   应返回包含 `v1.3.0` 与 NSIS 安装包 URL 的 JSON。
3. 在已安装旧版本（如 v1.2.0）的 Windows 机器上启动 Plotline：
   - 应用启动后会自动检查更新；
   - 或进入 *设置 → 关于 → 检查更新* 手动触发；
   - 应弹出"发现新版本"对话框，点击确认后自动下载并安装。

## 后续迭代如何自动化

设置好 `TAURI_SIGNING_PRIVATE_KEY` 后，下次发布只需：

```bash
git tag v1.4.0
git push origin v1.4.0
```

`.github/workflows/release.yml` 会自动构建 Windows 安装包、签名、生成并上传 `latest.json`。

> 若 CI 不可用，也可通过 GitHub MCP 插件或 `gh` CLI 手动创建 Release 并上传产物。