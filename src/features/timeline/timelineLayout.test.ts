import { describe, it, expect } from 'vitest';
import { clampTodayLabelX, computeAddButtonLeft, computeEventDragConstraints, clampTimelineScroll } from './timelineLayout';

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

describe('computeEventDragConstraints', () => {
  it('stops an event from being dragged past the lane left edge padding', () => {
    expect(computeEventDragConstraints(220, 1000)).toEqual({ left: 4, right: 780 });
  });

  it('prevents any leftward movement beyond the lane padding when totalWidth is omitted', () => {
    expect(computeEventDragConstraints(220)).toEqual({ left: 4 });
  });

  it('allows custom lane padding to be configured', () => {
    expect(computeEventDragConstraints(220, 1000, 12)).toEqual({ left: 12, right: 780 });
  });

  it('keeps the right boundary calculated based on total width', () => {
    expect(computeEventDragConstraints(220, 500)).toEqual({ left: 4, right: 280 });
  });
});

describe('clampTimelineScroll', () => {
  it('clamps negative scrollLeft back to 0', () => {
    expect(clampTimelineScroll(-10, 500)).toBe(0);
  });

  it('clamps scrollLeft that exceeds the maximum scroll back to max', () => {
    expect(clampTimelineScroll(600, 500)).toBe(500);
  });

  it('leaves scrollLeft unchanged when it is within bounds', () => {
    expect(clampTimelineScroll(250, 500)).toBe(250);
  });

  it('returns 0 when the canvas is narrower than the viewport', () => {
    expect(clampTimelineScroll(0, -20)).toBe(0);
    expect(clampTimelineScroll(10, -20)).toBe(0);
  });

  it('clamps positive scrollLeft back to 0 when there is no overflow', () => {
    expect(clampTimelineScroll(50, 0)).toBe(0);
  });
});
