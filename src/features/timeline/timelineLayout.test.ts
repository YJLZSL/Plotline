import { describe, it, expect } from 'vitest';
import { clampTodayLabelX, computeAddButtonLeft } from './timelineLayout';

describe('clampTodayLabelX', () => {
  it('keeps the center position when far from edges', () => {
    expect(clampTodayLabelX(200, 1000)).toBe(200);
  });

  it('clamps to the minimum left padding near the left edge', () => {
    expect(clampTodayLabelX(5, 1000)).toBe(20);
    expect(clampTodayLabelX(20, 1000)).toBe(20);
  });

  it('clamps to totalWidth - labelWidth near the right edge', () => {
    expect(clampTodayLabelX(980, 1000)).toBe(960);
    expect(clampTodayLabelX(960, 1000)).toBe(960);
  });

  it('prefers the minimum padding when the canvas is very narrow', () => {
    expect(clampTodayLabelX(10, 50)).toBe(20);
  });
});

describe('computeAddButtonLeft', () => {
  it('returns the default left offset when there are no events', () => {
    expect(computeAddButtonLeft([], 1000, 64, 220, 12)).toBe(8);
  });

  it('places the button after the last event card', () => {
    expect(computeAddButtonLeft([100, 300], 1000, 64, 220, 12)).toBe(532);
  });

  it('does not exceed the right edge of the canvas', () => {
    expect(computeAddButtonLeft([800], 1000, 64, 220, 12)).toBe(928);
    expect(computeAddButtonLeft([900, 950], 1000, 64, 220, 12)).toBe(928);
  });

  it('places the button at the default offset when events are at negative positions', () => {
    expect(computeAddButtonLeft([-100, -50], 1000, 64, 220, 12)).toBe(182);
  });
});
