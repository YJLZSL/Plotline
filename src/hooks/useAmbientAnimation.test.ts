import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useAmbientAnimation } from './useAmbientAnimation';
import { useMotionStore } from '@/stores/motion';

describe('useAmbientAnimation', () => {
  beforeEach(() => {
    useMotionStore.setState({ animationsEnabled: true });
  });

  it('should return base motion when animations are enabled', () => {
    const { result } = renderHook(() => useAmbientAnimation());
    expect(result.current.enabled).toBe(true);
    expect(result.current.animate).toBe(true);
    expect((result.current.transition as { duration: number }).duration).toBeGreaterThan(0);
  });

  it('should return zero duration transition when animations are disabled', () => {
    useMotionStore.setState({ animationsEnabled: false });
    const { result } = renderHook(() => useAmbientAnimation());
    expect(result.current.enabled).toBe(false);
    expect(result.current.animate).toBe(false);
    expect((result.current.transition as { duration: number }).duration).toBe(0);
  });
});
