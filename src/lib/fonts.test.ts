import { describe, it, expect } from 'vitest';

import { FONT_STACKS } from './fonts';

describe('FONT_STACKS', () => {
  it('includes robust CJK fallbacks for sans stack', () => {
    expect(FONT_STACKS.sans).toContain('Inter');
    expect(FONT_STACKS.sans).toContain('PingFang SC');
    expect(FONT_STACKS.sans).toContain('Microsoft YaHei');
    expect(FONT_STACKS.sans).toContain('Hiragino Sans GB');
    expect(FONT_STACKS.sans).toContain('Noto Sans CJK SC');
    expect(FONT_STACKS.sans).toContain('Source Han Sans SC');
    expect(FONT_STACKS.sans).toContain('Noto Sans SC');
    expect(FONT_STACKS.sans).toContain('system-ui');
    expect(FONT_STACKS.sans).toContain('-apple-system');
  });

  it('includes CJK fallback for mono stack', () => {
    expect(FONT_STACKS.mono).toContain('JetBrains Mono');
    expect(FONT_STACKS.mono).toContain('Fira Code');
    expect(FONT_STACKS.mono).toContain('Consolas');
    expect(FONT_STACKS.mono).toContain('Noto Sans Mono CJK SC');
    expect(FONT_STACKS.mono).toContain('Noto Sans Mono SC');
    expect(FONT_STACKS.mono).toContain('Microsoft YaHei');
    expect(FONT_STACKS.mono).toContain('monospace');
  });

  it('keeps pixel and smiley fonts as primary but degrades safely', () => {
    expect(FONT_STACKS.pixel).toContain('Fusion Pixel 10px');
    expect(FONT_STACKS.pixel).toContain('Zpix');
    expect(FONT_STACKS.pixel).toContain('Microsoft YaHei');
    expect(FONT_STACKS.pixel).toContain('Noto Sans SC');
    expect(FONT_STACKS.pixel).toContain('monospace');

    expect(FONT_STACKS.smiley).toContain('Smiley Sans');
    expect(FONT_STACKS.smiley).toContain('PingFang SC');
    expect(FONT_STACKS.smiley).toContain('Microsoft YaHei');
    expect(FONT_STACKS.smiley).toContain('Noto Sans SC');
    expect(FONT_STACKS.smiley).toContain('system-ui');
  });
});
