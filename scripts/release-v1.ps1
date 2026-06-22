# Plotline v1.1 一键发布前置校验脚本
# 用法：在仓库根目录执行 `pwsh scripts/release-v1.ps1`
# 任一步骤失败立即退出非零并打印失败步骤名称。

$ErrorActionPreference = 'Stop'

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )
    Write-Host ""
    Write-Host "==> 步骤：$Name" -ForegroundColor Cyan
    try {
        & $Action
        if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
            throw "步骤 '$Name' 退出码为 $LASTEXITCODE"
        }
        Write-Host "    [ok] $Name 通过" -ForegroundColor Green
    } catch {
        Write-Host "    [fail] $Name 失败：$($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Invoke-Step -Name 'pnpm typecheck' -Action { pnpm typecheck }
Invoke-Step -Name 'pnpm lint' -Action { pnpm lint }
Invoke-Step -Name 'pnpm test --run' -Action { pnpm test --run }
Invoke-Step -Name 'cargo test --lib' -Action {
    cargo test --manifest-path src-tauri/Cargo.toml --lib
}
Invoke-Step -Name 'pnpm tauri build' -Action { pnpm tauri build }

Write-Host ""
Write-Host "所有发布前置校验已通过。" -ForegroundColor Green
Write-Host "Windows 产物默认位于 src-tauri/target/release/bundle/" -ForegroundColor Yellow
Write-Host "下一步：git tag v1.3.0 && git push --tags 触发 release.yml" -ForegroundColor Yellow
