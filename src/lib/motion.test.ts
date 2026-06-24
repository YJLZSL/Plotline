import { describe, it, expect } from 'vitest';

import {
  MOTION_FAST_SPEC,
  MOTION_BASE_SPEC,
  MOTION_SLOW_SPEC,
  MOTION_FAST,
  MOTION_BASE,
  MOTION_SLOW,
  EASE_STANDARD,
  MOTION_TOKENS,
} from './motion';

describe('motion tokens', () => {
  it('should expose the standard easing curve', () => {
    expect(EASE_STANDARD).toEqual([0.16, 1, 0.3, 1]);
  });

  it('should follow fast < base < slow ordering', () => {
    expect(MOTION_FAST_SPEC.duration).toBeLessThan(MOTION_BASE_SPEC.duration);
    expect(MOTION_BASE_SPEC.duration).toBeLessThan(MOTION_SLOW_SPEC.duration);
  });

  it('should set fast at 150ms, base at 180ms, slow at 200ms', () => {
    expect(MOTION_FAST_SPEC.duration).toBeCloseTo(0.15);
    expect(MOTION_BASE_SPEC.duration).toBeCloseTo(0.18);
    expect(MOTION_SLOW_SPEC.duration).toBeCloseTo(0.2);
  });

  it('should share the same easing curve across tokens', () => {
    expect(MOTION_FAST_SPEC.ease).toEqual(EASE_STANDARD);
    expect(MOTION_BASE_SPEC.ease).toEqual(EASE_STANDARD);
    expect(MOTION_SLOW_SPEC.ease).toEqual(EASE_STANDARD);
  });

  it('should expose tokens via the MOTION_TOKENS map', () => {
    expect(MOTION_TOKENS.fast).toBe(MOTION_FAST);
    expect(MOTION_TOKENS.base).toBe(MOTION_BASE);
    expect(MOTION_TOKENS.slow).toBe(MOTION_SLOW);
  });
});
