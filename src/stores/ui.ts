import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AppSettings, FontTheme, Theme } from '@/types';
import { FONT_STACKS } from '@/lib/fonts';

interface UIState {
  sidebarCollapsed: boolean;
  detailPanelOpen: boolean;
  aiPanelOpen: boolean;
  enhancedAnimations: boolean;
  firstWorkspaceVisit: boolean;
  /** B2: 编辑器是否跟随界面字体主题（前端偏好，persist 到 localStorage）。 */
  editorFollowsFontTheme: boolean;
  /** B4: MC 主题下是否应用自定义强调色（前端偏好，persist 到 localStorage）。 */
  mcUseCustomAccent: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;
  toggleAiPanel: () => void;
  setAiPanelOpen: (open: boolean) => void;
  setEnhancedAnimations: (enabled: boolean) => void;
  setFirstWorkspaceVisit: (visited: boolean) => void;
  setEditorFollowsFontTheme: (follows: boolean) => void;
  setMcUseCustomAccent: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      detailPanelOpen: false,
      aiPanelOpen: false,
      enhancedAnimations: false,
      firstWorkspaceVisit: true,
      editorFollowsFontTheme: false,
      mcUseCustomAccent: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleDetailPanel: () => set((s) => ({ detailPanelOpen: !s.detailPanelOpen })),
      setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
      toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
      setEnhancedAnimations: (enabled) => set({ enhancedAnimations: enabled }),
      setFirstWorkspaceVisit: (visited) => set({ firstWorkspaceVisit: visited }),
      setEditorFollowsFontTheme: (follows) => set({ editorFollowsFontTheme: follows }),
      setMcUseCustomAccent: (mcUseCustomAccent) => set({ mcUseCustomAccent }),
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
    const theme = settings.theme ?? root.getAttribute('data-theme') ?? 'light';
    if (settings.theme) {
      root.setAttribute('data-theme', settings.theme);
    }
    if (settings.accentColor) {
      root.style.setProperty('--accent-custom', settings.accentColor);
      // B4: MC 主题默认使用草绿强调色；只有用户显式开启"MC 也应用自定义色"
      // 时才以内联 --accent 覆盖 themes.css 中的固定值。
      const mcUseCustomAccent = useUIStore.getState().mcUseCustomAccent;
      if (theme === 'mc') {
        if (mcUseCustomAccent) {
          root.style.setProperty('--accent', settings.accentColor);
        } else {
          root.style.removeProperty('--accent');
        }
      } else {
        root.style.removeProperty('--accent');
      }
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
