import { describe, it, expect, beforeEach } from 'vitest';

import { useThemeStore } from './ui';

describe('theme store', () => {
  beforeEach(() => {
    useThemeStore.setState({
      theme: 'light',
      accentColor: '#C68A3E',
      fontTheme: 'sans',
    });
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
  });

  it('should set data-theme attribute', () => {
    useThemeStore.getState().setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should set custom accent color css variable', () => {
    useThemeStore.getState().setAccentColor('#ff0000');
    expect(document.documentElement.style.getPropertyValue('--accent-custom')).toBe('#ff0000');
  });

  it('should apply sans font theme to --font-sans', () => {
    useThemeStore.getState().setFontTheme('mono');
    expect(document.documentElement.style.getPropertyValue('--font-sans')).toContain('JetBrains Mono');
  });

  it('should apply pixel font theme to --font-sans and --font-mono', () => {
    useThemeStore.getState().setFontTheme('pixel');
    expect(document.documentElement.style.getPropertyValue('--font-sans')).toContain('Fusion Pixel 10px');
    expect(document.documentElement.style.getPropertyValue('--font-mono')).toContain('Fusion Pixel 10px');
  });

  it('should apply smiley font theme to --font-sans only', () => {
    useThemeStore.getState().setFontTheme('smiley');
    expect(document.documentElement.style.getPropertyValue('--font-sans')).toContain('Smiley Sans');
    expect(document.documentElement.style.getPropertyValue('--font-mono')).toContain('JetBrains Mono');
  });

  it('should set --motion-enabled css variable from animationsEnabled', () => {
    useThemeStore.getState().applyToDOM({ animationsEnabled: false });
    expect(document.documentElement.style.getPropertyValue('--motion-enabled')).toBe('0');
    useThemeStore.getState().applyToDOM({ animationsEnabled: true });
    expect(document.documentElement.style.getPropertyValue('--motion-enabled')).toBe('1');
  });
});
