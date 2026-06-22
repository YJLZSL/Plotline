import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AppSettings, Theme } from '@/types';

interface UIState {
  sidebarCollapsed: boolean;
  detailPanelOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      detailPanelOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleDetailPanel: () => set((s) => ({ detailPanelOpen: !s.detailPanelOpen })),
      setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
    }),
    { name: 'plotline:ui' },
  ),
);

interface ThemeState {
  theme: Theme;
  accentColor: string;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: string) => void;
  applyToDOM: (settings: Partial<AppSettings>) => void;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: 'light',
  accentColor: '#C68A3E',
  setTheme: (theme) => {
    set({ theme });
    get().applyToDOM({ theme });
  },
  setAccentColor: (accentColor) => {
    set({ accentColor });
    get().applyToDOM({ accentColor });
  },
  applyToDOM: (settings) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (settings.theme) {
      root.setAttribute('data-theme', settings.theme);
    }
    if (settings.accentColor) {
      root.style.setProperty('--accent', settings.accentColor);
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
  },
}));
