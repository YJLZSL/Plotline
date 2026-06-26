import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AppSettings, FontTheme, Theme } from '@/types';

interface UIState {
  sidebarCollapsed: boolean;
  detailPanelOpen: boolean;
  aiPanelOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;
  toggleAiPanel: () => void;
  setAiPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      detailPanelOpen: false,
      aiPanelOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleDetailPanel: () => set((s) => ({ detailPanelOpen: !s.detailPanelOpen })),
      setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
      toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
    }),
    { name: 'plotline:ui' },
  ),
);

const FONT_STACKS: Record<FontTheme, string> = {
  sans: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  pixel: '"Smiley Sans", "Fusion Pixel 10px", "Zpix", "站酷快乐体", "Microsoft YaHei", monospace',
};

interface ThemeState {
  theme: Theme;
  accentColor: string;
  fontTheme: FontTheme;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: string) => void;
  setFontTheme: (fontTheme: FontTheme) => void;
  applyToDOM: (settings: Partial<AppSettings>) => void;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: 'light',
  accentColor: '#C68A3E',
  fontTheme: 'sans',
  setTheme: (theme) => {
    set({ theme });
    get().applyToDOM({ theme });
  },
  setAccentColor: (accentColor) => {
    set({ accentColor });
    get().applyToDOM({ accentColor });
  },
  setFontTheme: (fontTheme) => {
    set({ fontTheme });
    const uiFont = FONT_STACKS[fontTheme];
    const editorFont = fontTheme === 'pixel' ? FONT_STACKS.pixel : FONT_STACKS.mono;
    get().applyToDOM({ uiFont, editorFont });
  },
  applyToDOM: (settings) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (settings.theme) {
      root.setAttribute('data-theme', settings.theme);
    }
    if (settings.accentColor) {
      root.style.setProperty('--accent-custom', settings.accentColor);
    }
    if (settings.fontSize) {
      root.style.fontSize = `${settings.fontSize}px`;
    }

    if (settings.uiFont) {
      root.style.setProperty('--font-sans', settings.uiFont);
    }
    if (settings.editorFont) {
      root.style.setProperty('--font-mono', settings.editorFont);
    }
    if (typeof settings.animationsEnabled === 'boolean') {
      root.style.setProperty('--motion-enabled', settings.animationsEnabled ? '1' : '0');
    }
  },
}));
