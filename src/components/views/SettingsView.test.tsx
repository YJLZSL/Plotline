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

const mockSetEnhancedAnimations = vi.fn();
const mockSetFirstWorkspaceVisit = vi.fn();

vi.mock('@/stores/ui', () => ({
  useThemeStore: vi.fn((selector?: (state: { applyToDOM: typeof mockApplyToDOM }) => unknown) =>
    selector ? selector({ applyToDOM: mockApplyToDOM }) : { applyToDOM: mockApplyToDOM },
  ),
  useUIStore: vi.fn(
    (
      selector?: (state: {
        aiPanelOpen: boolean;
        toggleAiPanel: () => void;
        enhancedAnimations: boolean;
        setEnhancedAnimations: typeof mockSetEnhancedAnimations;
        firstWorkspaceVisit: boolean;
        setFirstWorkspaceVisit: typeof mockSetFirstWorkspaceVisit;
      }) => unknown,
    ) =>
      selector
        ? selector({
            aiPanelOpen: false,
            toggleAiPanel: vi.fn(),
            enhancedAnimations: false,
            setEnhancedAnimations: mockSetEnhancedAnimations,
            firstWorkspaceVisit: false,
            setFirstWorkspaceVisit: mockSetFirstWorkspaceVisit,
          })
        : {
            aiPanelOpen: false,
            toggleAiPanel: vi.fn(),
            enhancedAnimations: false,
            setEnhancedAnimations: mockSetEnhancedAnimations,
            firstWorkspaceVisit: false,
            setFirstWorkspaceVisit: mockSetFirstWorkspaceVisit,
          },
  ),
}));

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object' && 'version' in options) {
        return `${key}:${options.version}`;
      }
      if (options && typeof options === 'object' && 'family' in options) {
        return `${key}:${options.family}`;
      }
      return key;
    },
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
  useAiConnectionTest: vi.fn(() => ({
    data: null,
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
  APP_VERSION: '2.8.0',
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

  it('should render enhanced animations toggle and call store setter', () => {
    renderSettings();
    const toggle = screen.getByTestId('enhanced-animations-toggle');
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(mockSetEnhancedAnimations).toHaveBeenCalledWith(true);
  });

  it('should disable enhanced animations toggle when animations are turned off', () => {
    vi.mocked(useSettingsQuery).mockReturnValue({
      data: { ...baseSettings, animationsEnabled: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useSettingsQuery>);
    renderSettings();
    const toggle = screen.getByTestId('enhanced-animations-toggle');
    expect(toggle).toBeDisabled();
  });

  it('should toggle animations enabled', () => {
    renderSettings();
    const toggle = screen.getByTestId('animations-enabled-toggle');
    fireEvent.click(toggle);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('should render font preview with Tailwind arbitrary value class and CSS variable', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('settings-tab-editor'));
    await waitFor(() => {
      const previews = screen.getAllByTestId('font-preview');
      expect(previews.length).toBeGreaterThan(0);
      previews.forEach((preview) => {
        expect(preview.className).toContain('[font-family:var(--preview-font)]');
        const style = preview.getAttribute('style') ?? '';
        expect(style).toContain('--preview-font');
        expect(style).not.toContain('font-family:');
      });
    });
  });

  it('should switch to AI tab and render AI settings section', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('settings-tab-ai'));
    await waitFor(() => {
      expect(screen.getByTestId('ai-settings-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('ai-enabled-toggle')).toBeInTheDocument();
  });

  it('should render editor tab cards', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('settings-tab-editor'));
    await waitFor(() => {
      expect(screen.getByTestId('editor-font-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('default-view-card')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-zoom-card')).toBeInTheDocument();
    expect(screen.getByTestId('import-font-card')).toBeInTheDocument();
  });

  it('should render data tab cards', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('settings-tab-data'));
    await waitFor(() => {
      expect(screen.getByTestId('backup-path-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('auto-backup-card')).toBeInTheDocument();
    expect(screen.getByTestId('backup-interval-card')).toBeInTheDocument();
  });

  it('should render about tab cards', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('settings-tab-about'));
    await waitFor(() => {
      expect(screen.getByTestId('about-app-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('feature-description-card')).toBeInTheDocument();
    expect(screen.getByTestId('check-update-card')).toBeInTheDocument();
  });

  it('should expand and collapse feature description panel', async () => {
    renderSettings();
    fireEvent.click(screen.getByTestId('settings-tab-about'));
    await waitFor(() => {
      expect(screen.getByTestId('feature-description-card')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('feature-description-content')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('feature-description-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('feature-description-content')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('feature-description-toggle'));
    await waitFor(() => {
      expect(screen.queryByTestId('feature-description-content')).not.toBeInTheDocument();
    });
  });

  it('should filter settings by search query', async () => {
    renderSettings();
    const searchInput = screen.getByTestId('settings-search-input');
    fireEvent.change(searchInput, { target: { value: 'settings.themeDescription' } });
    await waitFor(() => {
      expect(screen.getByTestId('settings-search-results')).toBeInTheDocument();
    });
    expect(screen.getByTestId('theme-card')).toBeInTheDocument();
    expect(screen.queryByTestId('animations-card')).not.toBeInTheDocument();
  });

  it('should filter settings by group name', async () => {
    renderSettings();
    const searchInput = screen.getByTestId('settings-search-input');
    fireEvent.change(searchInput, { target: { value: 'settings.data' } });
    await waitFor(() => {
      expect(screen.getByTestId('settings-search-results')).toBeInTheDocument();
    });
    expect(screen.getByTestId('backup-path-card')).toBeInTheDocument();
    expect(screen.getByTestId('auto-backup-card')).toBeInTheDocument();
    expect(screen.getByTestId('backup-interval-card')).toBeInTheDocument();
  });

  it('should show no results when search matches nothing', async () => {
    renderSettings();
    const searchInput = screen.getByTestId('settings-search-input');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });
    await waitFor(() => {
      expect(screen.getByTestId('settings-search-results')).toBeInTheDocument();
    });
    expect(screen.getByText('common.noResults')).toBeInTheDocument();
  });

  it('should clear search when switching tabs', async () => {
    renderSettings();
    const searchInput = screen.getByTestId('settings-search-input');
    fireEvent.change(searchInput, { target: { value: 'theme' } });
    await waitFor(() => {
      expect(screen.getByTestId('settings-search-results')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('settings-tab-editor'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-tab-panel-editor')).toBeInTheDocument();
    });
    expect(searchInput).toHaveValue('');
  });
});
