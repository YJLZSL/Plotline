import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useSettingsQuery, useUpdateSettings } from './hooks';
import type { AppSettings } from '@/types';

vi.mock('./api', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key, i18n: { changeLanguage: vi.fn() } }),
}));

vi.mock('@/stores/toast', () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

import { getSettings, updateSettings } from './api';

const baseSettings: AppSettings = {
  theme: 'light',
  accentColor: '#C68A3E',
  language: 'zh-CN',
  editorFont: '',
  uiFont: '',
  fontSize: 14,
  backupPath: '',
  autoBackup: false,
  backupIntervalHours: 24,
  defaultView: 'timeline',
  timelineZoom: 'day',
  fontTheme: 'sans',
  aiProvider: '',
  aiModel: '',
  aiApiKey: '',
  aiBaseUrl: '',
  aiEnabled: false,
  aiRagEnabled: false,
  aiSystemPrompt: '',
  splashEnabled: true,
  splashDurationMs: 1500,
  animationsEnabled: true,
};

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function TestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('settings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch settings including animationsEnabled', async () => {
    vi.mocked(getSettings).mockResolvedValue(baseSettings);
    const { result } = renderHook(() => useSettingsQuery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.animationsEnabled).toBe(true);
  });

  it('should merge animationsEnabled into query cache on update', async () => {
    const updated: AppSettings = { ...baseSettings, animationsEnabled: false };
    vi.mocked(getSettings).mockResolvedValue(baseSettings);
    vi.mocked(updateSettings).mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateSettings(), { wrapper: createWrapper() });

    result.current.mutate({ animationsEnabled: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateSettings).toHaveBeenCalledWith(
      { animationsEnabled: false },
      expect.objectContaining({ client: expect.any(QueryClient) }),
    );
  });
});
