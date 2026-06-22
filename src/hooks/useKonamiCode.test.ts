import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useKonamiCode } from './useKonamiCode';

function dispatchKeys(keys: string[]) {
  for (const key of keys) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  }
}

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

describe('useKonamiCode', () => {
  it('calls callback when Konami code is entered', () => {
    const cb = vi.fn();
    renderHook(() => useKonamiCode(cb));
    dispatchKeys(KONAMI);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does not call callback for partial or wrong sequences', () => {
    const cb = vi.fn();
    renderHook(() => useKonamiCode(cb));
    dispatchKeys(['ArrowUp', 'ArrowUp', 'ArrowDown', 'Escape']);
    expect(cb).not.toHaveBeenCalled();
  });
});
