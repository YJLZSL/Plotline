import { describe, it, expect } from 'vitest';
import { computeTrackAnchors, sortEventsForScript } from './scriptSort';
import type { Event } from '@/types';

function makeEvent(overrides: Partial<Event> & { id: string }): Event {
  return {
    workspaceId: 'ws-1',
    trackId: 'track-a',
    title: `Event ${overrides.id}`,
    description: '',
    dateType: 'absolute',
    dateValue: '',
    sortOrder: 0,
    status: 'draft',
    color: null,
    locationId: null,
    imageUrls: [],
    characterIds: [],
    connectedEventIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('computeTrackAnchors', () => {
  it('should pick the earliest absolute date per track', () => {
    const events: Event[] = [
      makeEvent({ id: 'e1', trackId: 't1', dateValue: '2024-06-15' }),
      makeEvent({ id: 'e2', trackId: 't1', dateValue: '2024-03-01' }),
      makeEvent({ id: 'e3', trackId: 't1', dateValue: '2024-12-31' }),
      makeEvent({ id: 'e4', trackId: 't2', dateValue: '2024-08-01' }),
    ];
    const anchors = computeTrackAnchors(events);
    expect(anchors.get('t1')).toBe(new Date('2024-03-01').getTime());
    expect(anchors.get('t2')).toBe(new Date('2024-08-01').getTime());
  });

  it('should ignore relative events and invalid dates', () => {
    const events: Event[] = [
      makeEvent({ id: 'e1', trackId: 't1', dateType: 'relative', dateValue: 'three days later' }),
      makeEvent({ id: 'e2', trackId: 't1', dateValue: 'invalid' }),
      makeEvent({ id: 'e3', trackId: 't1', dateValue: '2024-05-05' }),
    ];
    const anchors = computeTrackAnchors(events);
    expect(anchors.get('t1')).toBe(new Date('2024-05-05').getTime());
  });
});

describe('sortEventsForScript', () => {
  it('should sort tracks by earliest absolute date', () => {
    const events: Event[] = [
      makeEvent({ id: 'later', trackId: 't2', dateValue: '2024-09-01' }),
      makeEvent({ id: 'earlier', trackId: 't1', dateValue: '2024-01-01' }),
    ];
    const anchors = computeTrackAnchors(events);
    const sorted = [...events].sort((a, b) => sortEventsForScript(a, b, anchors));
    expect(sorted.map((e) => e.id)).toEqual(['earlier', 'later']);
  });

  it('should keep relative tracks after tracks with absolute anchors', () => {
    const events: Event[] = [
      makeEvent({ id: 'rel', trackId: 't2', dateType: 'relative', dateValue: '', sortOrder: 0 }),
      makeEvent({ id: 'abs', trackId: 't1', dateValue: '2024-02-02' }),
    ];
    const anchors = computeTrackAnchors(events);
    const sorted = [...events].sort((a, b) => sortEventsForScript(a, b, anchors));
    expect(sorted.map((e) => e.id)).toEqual(['abs', 'rel']);
  });

  it('should sort by sortOrder within the same track', () => {
    const events: Event[] = [
      makeEvent({ id: 'second', trackId: 't1', dateType: 'relative', sortOrder: 1 }),
      makeEvent({ id: 'first', trackId: 't1', dateType: 'relative', sortOrder: 0 }),
    ];
    const anchors = computeTrackAnchors(events);
    const sorted = [...events].sort((a, b) => sortEventsForScript(a, b, anchors));
    expect(sorted.map((e) => e.id)).toEqual(['first', 'second']);
  });

  it('should place absolute events before relative events at the same sortOrder', () => {
    const events: Event[] = [
      makeEvent({ id: 'rel', trackId: 't1', dateType: 'relative', dateValue: '', sortOrder: 0 }),
      makeEvent({ id: 'abs', trackId: 't1', dateValue: '2024-02-02', sortOrder: 0 }),
    ];
    const anchors = computeTrackAnchors(events);
    const sorted = [...events].sort((a, b) => sortEventsForScript(a, b, anchors));
    expect(sorted.map((e) => e.id)).toEqual(['abs', 'rel']);
  });

  it('should sort absolute events by date within the same track and sortOrder', () => {
    const events: Event[] = [
      makeEvent({ id: 'feb', trackId: 't1', dateValue: '2024-02-01', sortOrder: 0 }),
      makeEvent({ id: 'jan', trackId: 't1', dateValue: '2024-01-01', sortOrder: 0 }),
    ];
    const anchors = computeTrackAnchors(events);
    const sorted = [...events].sort((a, b) => sortEventsForScript(a, b, anchors));
    expect(sorted.map((e) => e.id)).toEqual(['jan', 'feb']);
  });
});
