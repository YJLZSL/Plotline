/**
 * IPC 调用封装。
 * - 在 Tauri 桌面环境下调用真实 Rust 后端命令。
 * - 在纯 Web 开发/E2E 模式下（import.meta.env.MODE === 'web'）走 mock 层，
 *   mock 数据保存在 localStorage，便于无 Rust 环境下做 UI 开发与 Playwright 测试。
 *
 * 任何 feature 调用 IPC 必须通过本模块导出的函数，禁止在组件中直接 `invoke`。
 */

import { invoke as tauriInvoke } from '@tauri-apps/api/core';

import { mockIpc } from './mock';

export const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const isWebMode = (): boolean => import.meta.env.MODE === 'web' || !isTauri();

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (isWebMode()) {
    return mockIpc<T>(command, args);
  }
  return tauriInvoke<T>(command, args);
}

export interface AppError {
  code: string;
  message: string;
}

export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as { code: unknown }).code === 'string'
  );
}
