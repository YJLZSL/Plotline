import { invoke, isWebMode } from '@/lib/ipc';

/**
 * C3: 专注/休息结束的系统通知。
 *
 * Tauri 桌面端通过 `send_pomodoro_notification` 命令调用系统通知插件；
 * 纯 Web 开发模式或命令失败时，退回到浏览器 Notification API（若已授权）。
 * 所有失败均静默忽略——通知是辅助反馈，不应打断创作主流程。
 */
export async function sendPomodoroNotification(title: string, body: string): Promise<void> {
  if (!isWebMode()) {
    try {
      await invoke<void>('send_pomodoro_notification', { title, body });
      return;
    } catch {
      // 插件不可用时退回 Web Notification。
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
      return;
    }
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
  } catch {
    // 某些 WebView 会拒绝 Notification；此时番茄钟内已有声音 + toast 兜底。
  }
}
