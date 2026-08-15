import { describe, it, expect } from 'vitest';
import zhCN from './locales/zh-CN.json';
import ja from './locales/ja.json';

type JsonRecord = Record<string, unknown>;

function flatten(obj: JsonRecord, prefix = '', out: Record<string, unknown> = {}): Record<string, unknown> {
  for (const [key, value] of Object.entries(obj)) {
    const k = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      flatten(value as JsonRecord, k, out);
    } else {
      out[k] = value;
    }
  }
  return out;
}

describe('i18n ja locale parity', () => {
  it('ja and zh-CN should have identical key sets', () => {
    const zhFlat = flatten(zhCN as unknown as JsonRecord);
    const jaFlat = flatten(ja as unknown as JsonRecord);
    const zhKeys = Object.keys(zhFlat);
    const jaKeys = Object.keys(jaFlat);

    const missingInJa = zhKeys.filter((k) => !(k in jaFlat));
    const extraInJa = jaKeys.filter((k) => !(k in zhFlat));

    expect(missingInJa).toEqual([]);
    expect(extraInJa).toEqual([]);
  });

  it('ja values should not be empty strings', () => {
    const jaFlat = flatten(ja as unknown as JsonRecord);
    const empty = Object.entries(jaFlat).filter(([, v]) => v === '');
    expect(empty).toEqual([]);
  });
});
