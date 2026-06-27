import { describe, it, expect } from 'vitest';
import themesCss from './themes.css?raw';
import tailwindCss from './tailwind.css?raw';
import { FONT_STACKS } from '@/lib/fonts';

describe('themes.css', () => {
  it('should define --bg-base-gradient for all themes', () => {
    expect(themesCss).toContain('--bg-base-gradient');
    expect(themesCss).toMatch(/\[data-theme="dark"\][\s\S]*?--bg-base-gradient/);
    expect(themesCss).toMatch(/\[data-theme="sepia"\][\s\S]*?--bg-base-gradient/);
    expect(themesCss).toMatch(/\[data-theme="mc"\][\s\S]*?--bg-base-gradient/);
  });

  it('should not apply MC textures to global inputs, textareas, or selects', () => {
    expect(themesCss).not.toContain('[data-theme="mc"] input,');
    expect(themesCss).not.toContain('[data-theme="mc"] textarea,');
    expect(themesCss).not.toContain('[data-theme="mc"] select {');
  });

  it('should apply MC input textures only inside .mc-textured', () => {
    expect(themesCss).toContain('[data-theme="mc"] .mc-textured input,');
    expect(themesCss).toContain('[data-theme="mc"] .mc-textured textarea,');
    expect(themesCss).toContain('[data-theme="mc"] .mc-textured select {');
  });

  it('should not apply MC textures to all dialogs without explicit .mc-textured', () => {
    expect(themesCss).not.toContain('[data-theme="mc"] [role="dialog"] > div,');
    expect(themesCss).not.toContain('[data-theme="mc"] [class*="dialog"] > div:first-child {');
  });

  it('should apply MC dialog textures only when dialog has .mc-textured', () => {
    expect(themesCss).toContain('[data-theme="mc"] [role="dialog"].mc-textured > div,');
    expect(themesCss).toContain('[data-theme="mc"] [class*="dialog"].mc-textured > div:first-child {');
  });

  it('should keep .mc-button and .mc-textured texture rules', () => {
    expect(themesCss).toContain('[data-theme="mc"] .mc-button,');
    expect(themesCss).toContain('[data-theme="mc"] .mc-textured {');
  });
});

describe('tailwind.css @font-face', () => {
  it('should include local() fallbacks for Fusion Pixel 10px', () => {
    expect(tailwindCss).toContain('font-family: "Fusion Pixel 10px"');
    expect(tailwindCss).toContain('local("Fusion Pixel 10px Monospaced")');
    expect(tailwindCss).toContain('local("FusionPixel10pxMonospaced")');
    expect(tailwindCss).toContain('font-display: swap');
  });

  it('should include local() fallbacks for Smiley Sans', () => {
    expect(tailwindCss).toContain('font-family: "Smiley Sans"');
    expect(tailwindCss).toContain('local("Smiley Sans Oblique")');
    expect(tailwindCss).toContain('local("SmileySans")');
    expect(tailwindCss).toContain('font-display: swap');
  });
});

describe('FONT_STACKS', () => {
  it('should define non-empty font stacks', () => {
    const keys = Object.keys(FONT_STACKS) as Array<keyof typeof FONT_STACKS>;
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach((key) => {
      const stack = FONT_STACKS[key];
      expect(stack).toBeTruthy();
      expect(stack.length).toBeGreaterThan(0);
      expect(stack).not.toContain('  ');
    });
  });
});
