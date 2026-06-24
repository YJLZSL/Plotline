import { describe, it, expect } from 'vitest';

import { importFont, listImportedFonts, loadImportedFontFaces } from './api';

describe('font api', () => {
  it('returns empty list in web mode', async () => {
    const fonts = await listImportedFonts();
    expect(fonts).toEqual([]);
  });

  it('rejects font import in web mode', async () => {
    const file = new File([''], 'test.ttf', { type: 'font/ttf' });
    await expect(importFont(file)).rejects.toThrow('桌面端');
  });

  it('no-ops loading font faces in web mode', async () => {
    await expect(loadImportedFontFaces()).resolves.toBeUndefined();
  });
});
