import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AppSettings, FontTheme, Theme } from '@/types';
import { FONT_STACKS } from '@/lib/fonts';

interface UIState {
  sidebarCollapsed: boolean;
  detailPanelOpen: boolean;
  aiPanelOpen: boolean;
  enhancedAnimations: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;
  toggleAiPanel: () => void;
  setAiPanelOpen: (open: boolean) => void;
  setEnhancedAnimations: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      detailPanelOpen: false,
      aiPanelOpen: false,
      enhancedAnimations: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleDetailPanel: () => set((s) => ({ detailPanelOpen: !s.detailPanelOpen })),
      setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
      toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
      setEnhancedAnimations: (enabled) => set({ enhancedAnimations: enabled }),
    }),
    { name: 'plotline:ui' },
  ),
);

const THEME_FONT_STACKS: Record<FontTheme, string> = {
  sans: FONT_STACKS.sans,
  mono: FONT_STACKS.mono,
  pixel: FONT_STACKS.pixel,
  smiley: FONT_STACKS.smiley,
};

interface ThemeState {
  theme: Theme;
  accentColor: string;
  fontTheme: FontTheme;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: string) => void;
  setFontTheme: (fontTheme: FontTheme) => void;
  applyToDOM: (settings: Partial<AppSettings> & { pixelFont?: string; smileyFont?: string }) => void;
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
    const uiFont = THEME_FONT_STACKS[fontTheme];
    const editorFont = fontTheme === 'pixel' ? THEME_FONT_STACKS.pixel : THEME_FONT_STACKS.mono;
    get().applyToDOM({
      uiFont,
      editorFont,
      pixelFont: THEME_FONT_STACKS.pixel,
      smileyFont: THEME_FONT_STACKS.smiley,
    });
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
    if (settings.pixelFont) {
      root.style.setProperty('--font-pixel', settings.pixelFont);
    }
    if (settings.smileyFont) {
      root.style.setProperty('--font-smiley', settings.smileyFont);
    }
    if (typeof settings.animationsEnabled === 'boolean') {
      root.style.setProperty('--motion-enabled', settings.animationsEnabled ? '1' : '0');
    }
  },
}));
