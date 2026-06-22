import { describe, it, expect } from 'vitest';

import { isAppError } from './ipc';

describe('isAppError', () => {
  it('should identify AppError shape', () => {
    expect(isAppError({ code: 'NOT_FOUND', message: 'not found' })).toBe(true);
  });

  it('should reject non-AppError values', () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError({})).toBe(false);
    expect(isAppError({ code: 1, message: 'x' })).toBe(false);
    expect(isAppError('string')).toBe(false);
  });
});
