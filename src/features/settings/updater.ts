/**
 * 应用内自动更新封装。
 * - 在 Tauri 桌面环境下调用 `@tauri-apps/plugin-updater` 真实检查/下载/安装更新。
 * - 在纯 Web 模式下走轻量 stub，便于 Playwright / E2E 在没有打包签名时仍能渲染 UI。
 */

import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater';
import { isTauri } from '@/lib/ipc';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  notes?: string;
}

export interface UpdateCheckResult {
  info: UpdateInfo;
  install?: (onEvent?: (progress: DownloadEvent) => void) => Promise<void>;
}

function buildInstall(update: Update): UpdateCheckResult['install'] {
  return async (onEvent) => {
    await update.downloadAndInstall(onEvent);
  };
}

export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  if (!isTauri()) {
    return { info: { available: false, currentVersion } };
  }

  const update = await check();
  if (!update) {
    return { info: { available: false, currentVersion } };
  }

  return {
    info: {
      available: true,
      currentVersion,
      latestVersion: update.version,
      notes: update.body,
    },
    install: buildInstall(update),
  };
}
