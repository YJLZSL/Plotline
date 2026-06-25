import { describe, it, expect, beforeEach } from 'vitest';

import { isSoundEnabled, playSound, playSoundIfEnabled, setSoundEnabled } from './sound';

describe('sound', () => {
  beforeEach(() => {
    setSoundEnabled(true);
  });

  it('should toggle enabled state', () => {
    expect(isSoundEnabled()).toBe(true);
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
  });

  it('should not throw when playing sounds without AudioContext', () => {
    // jsdom 没有 AudioContext，playSound 应静默失败
    expect(() => playSound('click')).not.toThrow();
    expect(() => playSound('switch')).not.toThrow();
    expect(() => playSound('complete')).not.toThrow();
    expect(() => playSound('explosion')).not.toThrow();
    expect(() => playSound('mine')).not.toThrow();
    expect(() => playSound('place')).not.toThrow();
    expect(() => playSound('levelup')).not.toThrow();
  });

  it('should respect enabled flag', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(() => playSoundIfEnabled('click')).not.toThrow();
  });
});
