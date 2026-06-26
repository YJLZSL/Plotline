import { describe, it, expect, beforeEach } from 'vitest';

import { useMotionStore } from './motion';

describe('motion store', () => {
  beforeEach(() => {
    useMotionStore.setState({ animationsEnabled: true });
    document.documentElement.style.cssText = '';
  });

  it('should update state and set --motion-enabled to 1', () => {
    useMotionStore.getState().setAnimationsEnabled(true);
    expect(useMotionStore.getState().animationsEnabled).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--motion-enabled')).toBe('1');
  });

  it('should update state and set --motion-enabled to 0', () => {
    useMotionStore.getState().setAnimationsEnabled(false);
    expect(useMotionStore.getState().animationsEnabled).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--motion-enabled')).toBe('0');
  });

  it('should apply --motion-enabled via applyToDOM without changing state', () => {
    useMotionStore.getState().applyToDOM(false);
    expect(document.documentElement.style.getPropertyValue('--motion-enabled')).toBe('0');
    expect(useMotionStore.getState().animationsEnabled).toBe(true);
  });
});
