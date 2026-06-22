/**
 * 自动更新检查封装。
 * - 在 Tauri 桌面环境下调用 `@tauri-apps/plugin-updater` 真实检查更新。
 * - 在纯 Web 模式下走轻量 stub：直接返回 `{ available: false, currentVersion }`，
 *   便于 Playwright / E2E 在没有打包签名时仍能渲染 UI。
 */

import { isTauri } from '@/lib/ipc';

export interface UpdateCheckResult {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  notes?: string;
}

export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  if (!isTauri()) {
    return { available: false, currentVersion };
  }

  const mod = await import('@tauri-apps/plugin-updater');
  const update = await mod.check();
  if (!update) {
    return { available: false, currentVersion };
  }
  return {
    available: true,
    currentVersion,
    latestVersion: update.version,
    notes: update.body,
  };
}

export async function installLatestUpdate(): Promise<void> {
  if (!isTauri()) {
    throw new Error('Updater is only available in the desktop app.');
  }
  const mod = await import('@tauri-apps/plugin-updater');
  const update = await mod.check();
  if (!update) {
    throw new Error('No update available');
  }
  await update.downloadAndInstall();
}
