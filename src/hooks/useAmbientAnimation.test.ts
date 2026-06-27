import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useAmbientAnimation } from './useAmbientAnimation';
import { useMotionStore } from '@/stores/motion';

vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useReducedMotion } from 'framer-motion';

describe('useAmbientAnimation', () => {
  beforeEach(() => {
    localStorage.clear();
    useMotionStore.setState({ animationsEnabled: true, fancyAnimationsEnabled: false });
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('should return base motion when animations are enabled', () => {
    const { result } = renderHook(() => useAmbientAnimation());
    expect(result.current.enabled).toBe(true);
    expect(result.current.animate).toBe(true);
    expect(result.current.fancy).toBe(false);
    expect((result.current.transition as { duration: number }).duration).toBeGreaterThan(0);
  });

  it('should return zero duration transition when animations are disabled', () => {
    useMotionStore.setState({ animationsEnabled: false });
    const { result } = renderHook(() => useAmbientAnimation());
    expect(result.current.enabled).toBe(false);
    expect(result.current.animate).toBe(false);
    expect(result.current.fancy).toBe(false);
    expect((result.current.transition as { duration: number }).duration).toBe(0);
  });

  it('should disable effects when reduced motion is preferred', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { result } = renderHook(() => useAmbientAnimation());
    expect(result.current.enabled).toBe(false);
    expect(result.current.animate).toBe(false);
    expect(result.current.fancy).toBe(false);
  });

  it('should report fancy mode only when enabled and animations are on', () => {
    useMotionStore.setState({ fancyAnimationsEnabled: true });
    const { result } = renderHook(() => useAmbientAnimation());
    expect(result.current.fancy).toBe(true);

    useMotionStore.setState({ animationsEnabled: false });
    const { result: off } = renderHook(() => useAmbientAnimation());
    expect(off.current.fancy).toBe(false);
  });
});
