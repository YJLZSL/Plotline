import { describe, expect, it } from 'vitest';

import { AI_STYLE_TEMPLATES } from './promptTemplates';

describe('promptTemplates', () => {
  it('should export 6 built-in style templates', () => {
    expect(AI_STYLE_TEMPLATES).toHaveLength(6);
  });

  it('should have unique ids and all required fields', () => {
    const ids = AI_STYLE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const template of AI_STYLE_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.labelKey).toMatch(/^ai\.style/);
      expect(template.template).toBeTruthy();
      expect(template.systemPrompt).toBeTruthy();
      expect(template.icon).toBeTruthy();
    }
  });

  it('should include the six required genres', () => {
    const ids = AI_STYLE_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'fantasy',
        'urban',
        'romance',
        'suspense',
        'fanqie',
        'zhihu',
      ]),
    );
  });
});
