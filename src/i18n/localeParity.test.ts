import { describe, it, expect } from 'vitest';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

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

describe('i18n locale parity', () => {
  it('zh-CN and en should have identical key sets', () => {
    const zhFlat = flatten(zhCN as unknown as JsonRecord);
    const enFlat = flatten(en as unknown as JsonRecord);
    const zhKeys = Object.keys(zhFlat);
    const enKeys = Object.keys(enFlat);

    const missingInEn = zhKeys.filter((k) => !(k in enFlat));
    const extraInEn = enKeys.filter((k) => !(k in zhFlat));

    expect(missingInEn).toEqual([]);
    expect(extraInEn).toEqual([]);
  });

  it('en values should not be empty strings', () => {
    const enFlat = flatten(en as unknown as JsonRecord);
    const empty = Object.entries(enFlat).filter(([, v]) => v === '');
    expect(empty).toEqual([]);
  });
});
