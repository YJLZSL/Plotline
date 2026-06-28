import { describe, it, expect } from 'vitest';

import {
  parseAbsoluteRange,
  formatEventTime,
  formatDurationLocalized,
  formatEventDuration,
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
  it('returns null for relative events', () => {
    const event = makeEvent({ dateType: 'relative', dateValue: '' });
    expect(formatEventDuration(event)).toBeNull();
  });

  it('returns null when no end time is present', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15' });
    expect(formatEventDuration(event)).toBeNull();
  });

  it('computes duration for a same-day range', () => {
    const event = makeEvent({ dateType: 'absolute', dateValue: '2024-03-15 09:00 – 11:30' });
    expect(formatEventDuration(event)).toBe('2 小时 30 分钟');
  });
});
