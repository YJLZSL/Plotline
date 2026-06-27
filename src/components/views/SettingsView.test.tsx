import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { SettingsView } from './SettingsView';
import type { AppSettings } from '@/types';

const mockApplyToDOM = vi.fn();
const mockMutateAsync = vi.fn();
const mockMutate = vi.fn();

vi.mock('@/features/settings/hooks', () => ({
  useSettingsQuery: vi.fn(),
  useUpdateSettings: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    mutate: mockMutate,
    isPending: false,
  })),
}));

vi.mock('@/stores/ui', () => ({
  useThemeStore: vi.fn((selector?: (state: { applyToDOM: typeof mockApplyToDOM }) => unknown) =>
    selector ? selector({ applyToDOM: mockApplyToDOM }) : { applyToDOM: mockApplyToDOM },
  ),
  useUIStore: vi.fn((selector?: (state: { aiPanelOpen: boolean; toggleAiPanel: () => void }) => unknown) =>
    selector
      ? selector({ aiPanelOpen: false, toggleAiPanel: vi.fn() })
      : { aiPanelOpen: false, toggleAiPanel: vi.fn() },
  ),
}));

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/features/ai/hooks', () => ({
  useAiModelsQuery: vi.fn(() => ({
    data: [],
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/features/font/api', () => ({
  importFont: vi.fn(),
  listImportedFonts: vi.fn(() => Promise.resolve([])),
  loadImportedFontFaces: vi.fn(),
}));

vi.mock('@/features/settings/updater', () => ({
  checkForUpdates: vi.fn(() => Promise.resolve({ info: { available: false }, install: null })),
}));

vi.mock('@/lib/version', () => ({
  APP_VERSION: '2.6.1',
}));

vi.mock('@/stores/toast', () => ({
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
}));

import { useSettingsQuery } from '@/features/settings/hooks';

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
  aiProvider: 'openai',
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
    return (
      <MemoryRouter>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
  };
}

function renderSettings() {
  return render(<SettingsView workspaceId="ws-1" workspaceName="测试工作区" />, {
    wrapper: createWrapper(),
  });
}

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSettingsQuery).mockReturnValue({
      data: baseSettings,
      isLoading: false,
    } as unknown as ReturnType<typeof useSettingsQuery>);
  });

  it('should render appearance tab by default', () => {
    renderSettings();
    expect(screen.getByTestId('theme-light')).toBeInTheDocument();
    expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
    expect(screen.getByTestId('theme-sepia')).toBeInTheDocument();
    expect(screen.getByTestId('theme-mc')).toBeInTheDocument();
  });

  it('should render theme cards in a 2-column grid', () => {
    const { container } = renderSettings();
    const grid = container.querySelector('.grid-cols-2');
    expect(grid).toBeInTheDocument();
    expect(grid?.querySelectorAll('[data-testid^="theme-"]').length).toBe(4);
  });

  it('should mark selected theme with ring accent', () => {
    renderSettings();
    const light = screen.getByTestId('theme-light');
    expect(light.className).toContain('ring-accent');
  });

  it('should switch theme when a theme card is clicked', () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('theme-dark'));
    expect(mockApplyToDOM).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
  });

  it('should render all four font theme options including smiley', () => {
    renderSettings();
    expect(screen.getByTestId('font-theme-sans')).toBeInTheDocument();
    expect(screen.getByTestId('font-theme-mono')).toBeInTheDocument();
    expect(screen.getByTestId('font-theme-pixel')).toBeInTheDocument();
    expect(screen.getByTestId('font-theme-smiley')).toBeInTheDocument();
  });

  it('should apply pixel font stack without Smiley Sans as primary', () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('font-theme-pixel'));
    expect(mockApplyToDOM).toHaveBeenCalledWith(
      expect.objectContaining({
        uiFont: expect.stringContaining('Fusion Pixel 10px'),
        editorFont: expect.stringContaining('Fusion Pixel 10px'),
      }),
    );
    expect(mockApplyToDOM).not.toHaveBeenCalledWith(
      expect.objectContaining({
        uiFont: expect.stringMatching(/^"Smiley Sans"/),
      }),
    );
  });

  it('should apply smiley font stack to UI font only', () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('font-theme-smiley'));
    expect(mockApplyToDOM).toHaveBeenCalledWith(
      expect.objectContaining({
        uiFont: expect.stringContaining('Smiley Sans'),
        editorFont: expect.stringContaining('JetBrains Mono'),
      }),
    );
  });

  it('should switch tabs and keep AI connection placeholder', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('settings-tab-ai'));
    await waitFor(() => {
      expect(screen.getByTestId('ai-connection-placeholder')).toBeInTheDocument();
    });
    expect(screen.getByTestId('ai-enabled-toggle')).toBeInTheDocument();
  });

  it('should render card groups in editor tab', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('settings-tab-editor'));
    await waitFor(() => {
      expect(screen.getByText('settings.fontTheme')).toBeInTheDocument();
    });
    expect(screen.getByText('settings.importFont')).toBeInTheDocument();
  });
});
