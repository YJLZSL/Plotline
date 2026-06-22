import { describe, it, expect } from 'vitest';

import { cn, truncate, relativeTime, formatDate } from './utils';

describe('cn', () => {
  it('should merge classes', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('should handle conditional classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('should resolve tailwind conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

describe('truncate', () => {
  it('should not modify short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should truncate long strings with ellipsis', () => {
    expect(truncate('hello world foo', 8)).toBe('hello w…');
  });

  it('should handle exactly maxLen', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('formatDate', () => {
  it('should format ISO string', () => {
    const result = formatDate('2026-06-22T10:00:00Z', 'zh-CN');
    expect(result).toMatch(/2026/);
  });

  it('should return empty for empty input', () => {
    expect(formatDate('')).toBe('');
  });
});

describe('relativeTime', () => {
  it('should return 刚刚 for very recent', () => {
    const result = relativeTime(new Date().toISOString());
    expect(result).toBe('刚刚');
  });

  it('should return N 分钟前 for minutes', () => {
    const past = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(relativeTime(past)).toBe('5 分钟前');
  });

  it('should return N 小时前 for hours', () => {
    const past = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(relativeTime(past)).toBe('3 小时前');
  });
});
