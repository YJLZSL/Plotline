import { describe, it, expect, beforeEach } from 'vitest';

import { useMotionStore } from './motion';

describe('motion store', () => {
  beforeEach(() => {
    localStorage.clear();
    useMotionStore.setState({ animationsEnabled: true, fancyAnimationsEnabled: false });
    document.documentElement.style.cssText = '';
    document.documentElement.removeAttribute('data-fancy-animations');
  });

  it('should default to smooth animations with fancy effects off', () => {
    expect(useMotionStore.getState().animationsEnabled).toBe(true);
    expect(useMotionStore.getState().fancyAnimationsEnabled).toBe(false);
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

  it('should toggle fancy animations and reflect on document element', () => {
    useMotionStore.getState().setFancyAnimationsEnabled(true);
    expect(useMotionStore.getState().fancyAnimationsEnabled).toBe(true);
    expect(document.documentElement.getAttribute('data-fancy-animations')).toBe('true');

    useMotionStore.getState().setFancyAnimationsEnabled(false);
    expect(useMotionStore.getState().fancyAnimationsEnabled).toBe(false);
    expect(document.documentElement.getAttribute('data-fancy-animations')).toBe('false');
  });

  it('should apply fancy attribute via applyFancyToDOM without changing state', () => {
    useMotionStore.getState().applyFancyToDOM(true);
    expect(document.documentElement.getAttribute('data-fancy-animations')).toBe('true');
    expect(useMotionStore.getState().fancyAnimationsEnabled).toBe(false);
  });
});
