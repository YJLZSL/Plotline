import { describe, expect, it, vi, afterEach } from 'vitest';

import { invoke, isWebMode } from '@/lib/ipc';
import { sendPomodoroNotification } from './api';

vi.mock('@/lib/ipc', () => ({
  invoke: vi.fn(),
  isWebMode: vi.fn(() => true),
}));

describe('sendPomodoroNotification', () => {
  const originalNotification = window.Notification;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'Notification', {
      value: originalNotification,
      writable: true,
      configurable: true,
    });
  });

  it('should call the Tauri command on desktop', async () => {
    vi.mocked(isWebMode).mockReturnValue(false);
    vi.mocked(invoke).mockResolvedValue(null);
    await sendPomodoroNotification('title', 'body');
    expect(invoke).toHaveBeenCalledWith('send_pomodoro_notification', { title: 'title', body: 'body' });
  });

  it('should fall back to the web Notification API when already granted', async () => {
    vi.mocked(isWebMode).mockReturnValue(true);
    const notify = vi.fn();
    Object.defineProperty(window, 'Notification', {
      value: class {
        static permission = 'granted';
        constructor(title: string, options: NotificationOptions) {
          notify(title, options);
        }
      },
      writable: true,
      configurable: true,
    });
    await sendPomodoroNotification('专注结束', '休息一下');
    expect(notify).toHaveBeenCalledWith('专注结束', expect.objectContaining({ body: '休息一下' }));
  });

  it('should not throw when notifications are unavailable', async () => {
    vi.mocked(isWebMode).mockReturnValue(true);
    Object.defineProperty(window, 'Notification', { value: undefined, configurable: true });
    await expect(sendPomodoroNotification('title', 'body')).resolves.toBeUndefined();
  });
});
