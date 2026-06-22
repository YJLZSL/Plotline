import { describe, it, expect } from 'vitest';

import { AI_PROVIDERS, getProviderPreset } from './providers';

describe('AI provider presets', () => {
  it('exposes a non-empty list with stable ids', () => {
    expect(AI_PROVIDERS.length).toBeGreaterThan(0);
    const ids = AI_PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the major cloud providers and a custom option', () => {
    const ids = AI_PROVIDERS.map((p) => p.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('siliconflow');
    expect(ids).toContain('volcano');
    expect(ids).toContain('tencent');
    expect(ids).toContain('deepseek');
    expect(ids).toContain('custom');
  });

  it('every preset carries a baseUrl, an icon, and a brand color', () => {
    for (const p of AI_PROVIDERS) {
      expect(typeof p.baseUrl).toBe('string');
      expect(p.icon).toBeDefined();
      expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('custom preset has an empty baseUrl to let the user fill it in', () => {
    const custom = AI_PROVIDERS.find((p) => p.id === 'custom');
    expect(custom).toBeDefined();
    expect(custom?.baseUrl).toBe('');
  });

  it('getProviderPreset returns the matching preset by id', () => {
    expect(getProviderPreset('openai').id).toBe('openai');
    expect(getProviderPreset('tencent').id).toBe('tencent');
  });

  it('getProviderPreset falls back to custom for unknown ids', () => {
    expect(getProviderPreset('nonexistent').id).toBe('custom');
  });

  it('ollama preset points to localhost for offline use', () => {
    const ollama = getProviderPreset('ollama');
    expect(ollama.baseUrl).toContain('localhost');
    expect(ollama.baseUrl).toContain('11434');
  });
});
