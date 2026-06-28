import { describe, it, expect } from 'vitest';

import {
  MOTION_FAST_SPEC,
  MOTION_BASE_SPEC,
  MOTION_SLOW_SPEC,
  MOTION_FAST,
  MOTION_BASE,
  MOTION_SLOW,
  MOTION_TAB,
  MOTION_DRAG_RETURN,
  MOTION_SPRING,
  MOTION_LAYOUT,
  EASE_STANDARD,
  MOTION_TOKENS,
  type MotionTokenSpec,
} from './motion';

describe('motion tokens', () => {
  it('should expose the standard easing curve', () => {
    expect(EASE_STANDARD).toEqual([0.16, 1, 0.3, 1]);
  });

  it('should follow fast < base < slow ordering', () => {
    expect(MOTION_FAST_SPEC.duration).toBeLessThan(MOTION_BASE_SPEC.duration);
    expect(MOTION_BASE_SPEC.duration).toBeLessThan(MOTION_SLOW_SPEC.duration);
  });

  it('should set fast at 120ms, base at 180ms, slow at 200ms', () => {
    expect(MOTION_FAST_SPEC.duration).toBeCloseTo(0.12);
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
    expect(MOTION_TOKENS.spring).toBe(MOTION_SPRING);
    expect(MOTION_TOKENS.layout).toBe(MOTION_LAYOUT);
  });

  it('should keep duration-based token durations within the 120-200ms performance window', () => {
    const durationTokens = [MOTION_FAST, MOTION_BASE, MOTION_SLOW, MOTION_TAB, MOTION_DRAG_RETURN] as MotionTokenSpec[];
    durationTokens.forEach((token) => {
      expect(token.duration).toBeGreaterThanOrEqual(0.12);
      expect(token.duration).toBeLessThanOrEqual(0.2);
    });
  });

  it('should configure MOTION_SPRING as a critically damped spring (no bounce)', () => {
    expect(MOTION_SPRING.type).toBe('spring');
    const { stiffness, damping, mass } = MOTION_SPRING as {
      stiffness: number;
      damping: number;
      mass: number;
    };
    expect(stiffness).toBeGreaterThanOrEqual(300);
    expect(stiffness).toBeLessThanOrEqual(400);
    expect(damping).toBeGreaterThanOrEqual(28);
    expect(damping).toBeLessThanOrEqual(32);
    expect(mass).toBeGreaterThanOrEqual(0.8);
    expect(mass).toBeLessThanOrEqual(1);
    const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
    expect(dampingRatio).toBeGreaterThanOrEqual(1);
  });

  it('should configure MOTION_LAYOUT as a low-tension spring without bounce', () => {
    expect(MOTION_LAYOUT.type).toBe('spring');
    const { stiffness, damping, mass } = MOTION_LAYOUT as {
      stiffness: number;
      damping: number;
      mass: number;
    };
    const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
    expect(dampingRatio).toBeGreaterThanOrEqual(1);
    expect(stiffness).toBeLessThan((MOTION_SPRING as { stiffness: number }).stiffness);
  });
});
