import { describe, it, expect } from 'vitest';

import {
  parseAbsoluteRange,
  formatEventTime,
  formatDurationLocalized,
  formatEventDuration,
  formatEventTimeRange,
  formatRelativeOffset,
  getEventAbsoluteRange,
  NO_DURATION,
} from './time';
import type { Event } from '@/types';

function makeEvent(overrides: Partial<Event> & { dateValue: string; dateType: Event['dateType'] }): Event {
  return {
    id: 'e1',
    workspaceId: 'ws',
    trackId: 't1',
    title: '事件',
    description: '',
    dateType: overrides.dateType,
    dateValue: overrides.dateValue,
    sortOrder: overrides.sortOrder ?? 0,
    status: 'draft',
    color: null,
    locationId: null,
    imageUrls: [],
    characterIds: [],
    connectedEventIds: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    endDateTime: overrides.endDateTime ?? null,
    relativeTo: overrides.relativeTo ?? null,
    relativeOffsetDays: overrides.relativeOffsetDays ?? null,
  };
}

describe('parseAbsoluteRange', () => {
  it('parses a single date string', () => {
    const range = parseAbsoluteRange('2024-03-15');
    expect(range).not.toBeNull();
    expect(range!.start).toBeInstanceOf(Date);
    expect(range!.end).toBeUndefined();
  });

  it('parses a same-day datetime range', () => {
    const range = parseAbsoluteRange('2024-03-15 09:00 – 11:00');
    expect(range).not.toBeNull();
    expect(range!.start.getTime()).toBeLessThan(range!.end!.getTime());
    expect(range!.start.getDate()).toBe(range!.end!.getDate());
  });

  it('parses a cross-day datetime range', () => {
    const range = parseAbsoluteRange('2024-03-15 09:00 - 2024-03-16 18:00');
    expect(range).not.toBeNull();
    expect(range!.end!.getDate()).toBe(16);
  });

  it('returns null for an empty string', () => {
    expect(parseAbsoluteRange('')).toBeNull();
  });

  it('returns null for an invalid date string', () => {
    expect(parseAbsoluteRange('not a date')).toBeNull();
  });
});

describe('formatEventTime', () => {
  it('shows relative index for relative events', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '', sortOrder: 2 });
    expect(formatEventTime(event)).toBe('相对 #3');
  });

  it('shows only date for date-only absolute events', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15' });
    expect(formatEventTime(event)).toBe('2024-03-15');
  });

  it('shows date and time for absolute events with a time component', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00' });
    expect(formatEventTime(event)).toBe('2024-03-15 09:00');
  });

  it('shows a same-day time range', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00 – 11:00' });
    expect(formatEventTime(event)).toBe('2024-03-15 09:00 – 11:00');
  });

  it('falls back to the raw value when parsing fails', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: 'unknown' });
    expect(formatEventTime(event)).toBe('unknown');
  });
});

describe('formatDurationLocalized', () => {
  it('formats hours and minutes', () => {
    const ms = 2 * 60 * 60 * 1000 + 30 * 60 * 1000;
    expect(formatDurationLocalized(ms)).toBe('2 小时 30 分钟');
  });

  it('formats days', () => {
    const ms = 3 * 24 * 60 * 60 * 1000;
    expect(formatDurationLocalized(ms)).toBe('3 天');
  });
});

describe('formatEventDuration', () => {
  it('should return NO_DURATION when event is relative', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '' });
    expect(formatEventDuration(event)).toBe(NO_DURATION);
    expect(formatEventDuration(event)).toBe('——');
  });

  it('should return NO_DURATION when absolute event has no end time', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15' });
    expect(formatEventDuration(event)).toBe('——');
  });

  it('should compute short duration for a same-day range with hours and minutes', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00 – 11:30' });
    expect(formatEventDuration(event)).toBe('2h 30m');
  });

  it('should compute short duration for a pure hours range', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00 – 11:00' });
    expect(formatEventDuration(event)).toBe('2h');
  });

  it('should compute short duration for a minutes-only range', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00 – 09:30' });
    expect(formatEventDuration(event)).toBe('30m');
  });

  it('should compute short duration for a multi-day range', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00 – 2024-03-17 11:00' });
    expect(formatEventDuration(event)).toBe('2d 2h');
  });

  it('should use endDateTime field when provided', () => {
    const event = makeEvent({
      dateType: 'absolute',
      dateValue: '2024-03-15 09:00',
      endDateTime: '2024-03-15 11:00',
    });
    expect(formatEventDuration(event)).toBe('2h');
  });
});

describe('formatRelativeOffset', () => {
  it('should return empty string for absolute events', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15' });
    expect(formatRelativeOffset(event)).toBe('');
  });

  it('should return empty string when relativeOffsetDays is null', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '', relativeOffsetDays: null });
    expect(formatRelativeOffset(event)).toBe('');
  });

  it('should return empty string when relativeOffsetDays is undefined', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '' });
    event.relativeOffsetDays = undefined;
    expect(formatRelativeOffset(event)).toBe('');
  });

  it('should return synced label when offset is 0', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '', relativeOffsetDays: 0 });
    expect(formatRelativeOffset(event)).toBe('同步');
    expect(formatRelativeOffset(event, 'en')).toBe('Synced');
  });

  it('should return positive offset with plus sign', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '', relativeOffsetDays: 2 });
    expect(formatRelativeOffset(event)).toBe('+2d');
  });

  it('should return negative offset with minus sign', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '', relativeOffsetDays: -1 });
    expect(formatRelativeOffset(event)).toBe('−1d');
  });
});

describe('formatEventTimeRange', () => {
  it('should show relative index when no relativeTo and no offset', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '', sortOrder: 2 });
    expect(formatEventTimeRange(event)).toBe('相对 #3');
  });

  it('should show relative label in English locale', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '', sortOrder: 2 });
    expect(formatEventTimeRange(event, 'en')).toBe('Relative #3');
  });

  it('should show anchor id and offset when relativeTo and relativeOffsetDays are set', () => {
    const event = makeEvent({
      dateType: 'relative',
      dateValue: '',
      relativeTo: 'evt-42',
      relativeOffsetDays: 2,
    });
    expect(formatEventTimeRange(event)).toBe('相对 #evt-42 · +2d');
  });

  it('should show synced label when offset is 0', () => {
    const event = makeEvent({
      dateType: 'relative',
      dateValue: '',
      relativeTo: 'evt-42',
      relativeOffsetDays: 0,
    });
    expect(formatEventTimeRange(event)).toBe('相对 #evt-42 · 同步');
  });

  it('should show only date for date-only absolute events', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15' });
    expect(formatEventTimeRange(event)).toBe('2024-03-15');
  });

  it('should show date and time for absolute events with a time component', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00' });
    expect(formatEventTimeRange(event)).toBe('2024-03-15 09:00');
  });

  it('should show a same-day time range', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00 – 11:00' });
    expect(formatEventTimeRange(event)).toBe('2024-03-15 09:00 – 11:00');
  });

  it('should omit year on end for same-year cross-day range', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00 – 2024-03-16 18:00' });
    expect(formatEventTimeRange(event)).toBe('2024-03-15 09:00 – 03-16 18:00');
  });

  it('should show full dates for cross-year range', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-12-30 09:00 – 2025-01-02 18:00' });
    expect(formatEventTimeRange(event)).toBe('2024-12-30 09:00 – 2025-01-02 18:00');
  });

  it('should use endDateTime field when provided', () => {
    const event = makeEvent({
      dateType: 'absolute',
      dateValue: '2024-03-15 14:00',
      endDateTime: '2024-03-15 16:00',
    });
    expect(formatEventTimeRange(event)).toBe('2024-03-15 14:00 – 16:00');
  });

  it('should fall back to raw value when parsing fails', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: 'unknown' });
    expect(formatEventTimeRange(event)).toBe('unknown');
  });
});

describe('getEventAbsoluteRange', () => {
  it('should return null for relative events', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '' });
    expect(getEventAbsoluteRange(event)).toBeNull();
  });

  it('should parse range from dateValue when endDateTime is absent', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00 – 11:00' });
    const range = getEventAbsoluteRange(event);
    expect(range).not.toBeNull();
    expect(range!.end).toBeDefined();
  });

  it('should use endDateTime when provided', () => {
    const event = makeEvent({
      dateType: 'absolute',
      dateValue: '2024-03-15 09:00',
      endDateTime: '2024-03-15 11:00',
    });
    const range = getEventAbsoluteRange(event);
    expect(range).not.toBeNull();
    expect(range!.start.getHours()).toBe(9);
    expect(range!.end!.getHours()).toBe(11);
  });
});
