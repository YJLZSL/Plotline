import { describe, it, expect } from 'vitest';
import type { Event } from '@/types';
import {
  clampTodayLabelX,
  computeAddButtonLeft,
  computeEventDragConstraints,
  clampTimelineScroll,
  getEventCardWidth,
  getEventCardWidthForEvent,
  estimateLabelWidth,
} from './timelineLayout';

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
    expect(computeEventDragConstraints(220, 1000, 0, 12)).toEqual({ left: 12, right: 780 });
  });

  it('keeps the right boundary calculated based on total width', () => {
    expect(computeEventDragConstraints(220, 500)).toEqual({ left: 4, right: 280 });
  });

  it('adjusts constraints relative to the current card position', () => {
    expect(computeEventDragConstraints(220, 1000, 100)).toEqual({ left: -96, right: 680 });
    expect(computeEventDragConstraints(220, 1000, 900)).toEqual({ left: -896, right: -120 });
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

describe('getEventCardWidth', () => {
  it('returns the minimum width for very short titles', () => {
    expect(getEventCardWidth('')).toBe(200);
    expect(getEventCardWidth('A')).toBe(200);
  });

  it('returns the maximum width for very long titles', () => {
    expect(getEventCardWidth('a'.repeat(100))).toBe(360);
  });

  it('estimates wider cards for Chinese titles than ASCII titles', () => {
    const chinese = getEventCardWidth('这是一个比较长的中文标题');
    const ascii = getEventCardWidth('abc');
    expect(chinese).toBeGreaterThan(ascii);
  });

  it('scales width with title length', () => {
    expect(getEventCardWidth('Short')).toBeLessThan(getEventCardWidth('A much longer event title'));
  });
});

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: 'e1',
    workspaceId: 'ws-1',
    title: '事件',
    description: '',
    dateType: 'absolute',
    dateValue: '2024-01-01',
    trackId: 't1',
    status: 'draft',
    color: null,
    locationId: null,
    imageUrls: [],
    characterIds: [],
    connectedEventIds: [],
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getEventCardWidthForEvent', () => {
  it('uses a readable 232px minimum even for short content', () => {
    expect(getEventCardWidthForEvent(makeEvent({ title: 'A', dateValue: '2024-01-01' }))).toBe(232);
  });

  it('grows with a long time range beyond the title estimate', () => {
    const shortRange = getEventCardWidthForEvent(
      makeEvent({ title: 'A', dateValue: '2024-01-01' }),
    );
    const longRange = getEventCardWidthForEvent(
      makeEvent({
        title: 'A',
        dateValue: '2027-12-03 14:00',
        endDateTime: '2028-01-15 16:00',
      }),
    );
    expect(longRange).toBeGreaterThan(shortRange);
  });

  it('accounts for location name and associated characters', () => {
    const plain = getEventCardWidthForEvent(makeEvent({ title: 'A', dateValue: '2024-01-01' }));
    const rich = getEventCardWidthForEvent(
      makeEvent({
        title: 'A',
        dateValue: '2024-01-01',
        locationId: 'loc-1',
        characterIds: ['c1', 'c2'],
      }),
      {
        locations: [{ id: 'loc-1', name: '霜落城北门之外的老旧驿站' }],
        characters: [
          { id: 'c1', name: '艾莉丝' },
          { id: 'c2', name: '凯' },
        ],
      },
    );
    expect(rich).toBeGreaterThan(plain);
  });

  it('caps at the readable max width', () => {
    const wide = getEventCardWidthForEvent(
      makeEvent({
        title: '这是一个特别特别特别特别特别特别长的标题',
        dateValue: '2027-12-03 14:00',
        endDateTime: '2028-01-15 16:00',
        locationId: 'loc-1',
        characterIds: ['c1', 'c2', 'c3', 'c4'],
      }),
      {
        locations: [{ id: 'loc-1', name: '一个位于大陆尽头的非常遥远且名字长到无法一眼读完的传说之地' }],
        characters: [
          { id: 'c1', name: '艾莉丝' },
          { id: 'c2', name: '凯' },
          { id: 'c3', name: '露娜' },
          { id: 'c4', name: '奥伯伦' },
        ],
      },
    );
    expect(wide).toBe(400);
  });
});

describe('estimateLabelWidth', () => {
  it('adds padding to the raw character width', () => {
    expect(estimateLabelWidth('')).toBe(16);
  });

  it('estimates wider labels for Chinese characters', () => {
    expect(estimateLabelWidth('一月')).toBeGreaterThan(estimateLabelWidth('ab'));
  });

  it('estimates ASCII characters narrower than Chinese characters', () => {
    expect(estimateLabelWidth('Jan')).toBe(16 + 3 * 7);
  });
});
