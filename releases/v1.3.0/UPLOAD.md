# Plotline v1.3.0 GitHub Release 上传清单

> 当前环境缺少 `GITHUB_TOKEN` 与 `gh` CLI，无法自动创建 Release。请按以下步骤手动完成上传。

## 1. 设置 CI Secret（只需一次）

在 GitHub 仓库页面：

```
Settings → Secrets and variables → Actions → New repository secret
```

添加：

- **Name**: `TAURI_SIGNING_PRIVATE_KEY`
- **Value**: `keys/plotline.key` 文件的完整内容（Base64 编码的私钥）

> 私钥文件位于本地 `D:\AIKFCC\Plotline\keys\plotline.key`，**切勿将其提交到 Git 或发送给他人**。

## 2. 创建 GitHub Release

访问：

```
https://github.com/YJLZSL/Plotline/releases/new
```

填写：

- **Choose a tag**: `v1.3.0`（若不存在则新建）
- **Release title**: `Plotline v1.3.0`
- **Description**: 复制 `CHANGELOG.md` 中 `[1.3.0]` 部分的内容，或写：

```
Plotline v1.3.0 已发布。启动应用即可自动检查并安装更新。
```

## 3. 上传以下文件

文件均位于本地 `D:\AIKFCC\Plotline\`：

| 文件 | 来源路径 |
|---|---|
| `Plotline_1.3.0_x64-setup.exe` | `src-tauri/target/release/bundle/nsis/Plotline_1.3.0_x64-setup.exe` |
| `Plotline_1.3.0_x64-setup.exe.sig` | `src-tauri/target/release/bundle/nsis/Plotline_1.3.0_x64-setup.exe.sig` |
| `Plotline_1.3.0_x64_en-US.msi` | `src-tauri/target/release/bundle/msi/Plotline_1.3.0_x64_en-US.msi` |
| `Plotline_1.3.0_x64_en-US.msi.sig` | `src-tauri/target/release/bundle/msi/Plotline_1.3.0_x64_en-US.msi.sig` |
| `latest.json` | `releases/v1.3.0/latest.json` |

## 4. 验证自动更新

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

## 5. 后续迭代如何自动化

设置好 `TAURI_SIGNING_PRIVATE_KEY` 后，下次发布只需：

```bash
git tag v1.4.0
git push origin v1.4.0
```

`.github/workflows/release.yml` 会自动构建 Windows 安装包、签名、生成并上传 `latest.json`。
