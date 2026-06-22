import { invoke } from '@/lib/ipc';
import type { AppSettings, UpdateSettingsInput } from '@/types';

export function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>('get_settings');
}

export function updateSettings(input: UpdateSettingsInput): Promise<AppSettings> {
  return invoke<AppSettings>('update_settings', { input });
}
