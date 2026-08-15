import { describe, expect, it } from 'vitest';

import { bezierPath, buildCharacterFootprints } from './footprints';
import type { Character, Event, Location } from '@/types';

function makeLocation(overrides: Partial<Location> & { id: string }): Location {
  return {
    workspaceId: 'ws',
    name: `Location ${overrides.id}`,
    description: '',
    posX: 0,
    posY: 0,
    color: '#F4B6C2',
    icon: '📍',
    linkedEventId: null,
    characterIds: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<Event> & { id: string }): Event {
  return {
    workspaceId: 'ws',
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
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCharacter(overrides: Partial<Character> & { id: string }): Character {
  return {
    workspaceId: 'ws',
    name: `Character ${overrides.id}`,
    aliases: [],
    avatar: null,
    description: '',
    appearance: '',
    backstory: '',
    goals: '',
    conflicts: '',
    arc: '',
    tags: [],
    color: '#F4B6C2',
    eventIds: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('buildCharacterFootprints', () => {
  it('should associate locations directly through event.locationId', () => {
    const character = makeCharacter({ id: 'c1' });
    const locA = makeLocation({ id: 'loc-a', posX: 10, posY: 20 });
    const locB = makeLocation({ id: 'loc-b', posX: 30, posY: 40 });
    const events: Event[] = [
      makeEvent({
        id: 'e-a',
        characterIds: ['c1'],
        locationId: 'loc-a',
        dateType: 'absolute',
        dateValue: '2024-05-01',
      }),
      makeEvent({
        id: 'e-b',
        characterIds: ['c1'],
        locationId: 'loc-b',
        dateType: 'absolute',
        dateValue: '2024-05-02',
      }),
    ];

    const result = buildCharacterFootprints([locA, locB], events, [character]);

    expect(result).toHaveLength(1);
    const fp = result[0];
    if (!fp) throw new Error('expected a footprint');
    expect(fp.points.map((p) => p.locationId)).toEqual(['loc-a', 'loc-b']);
    expect(fp.points[0]?.sortAt).toBe('2024-05-01');
  });

  it('should fallback to location.linkedEventId when event.locationId does not resolve', () => {
    const character = makeCharacter({ id: 'c1' });
    const locA = makeLocation({ id: 'loc-a', linkedEventId: 'e-a' });
    const locB = makeLocation({ id: 'loc-b', linkedEventId: 'e-b' });
    const events: Event[] = [
      makeEvent({
        id: 'e-a',
        characterIds: ['c1'],
        locationId: null,
        dateType: 'absolute',
        dateValue: '2024-06-01',
      }),
      makeEvent({
        id: 'e-b',
        characterIds: ['c1'],
        locationId: 'missing-location',
        dateType: 'absolute',
        dateValue: '2024-06-02',
      }),
    ];

    const result = buildCharacterFootprints([locA, locB], events, [character]);

    expect(result).toHaveLength(1);
    const fp = result[0];
    if (!fp) throw new Error('expected a footprint');
    expect(fp.points.map((p) => p.locationId)).toEqual(['loc-a', 'loc-b']);
    expect(fp.points[1]?.sortAt).toBe('2024-06-02');
  });

  it('should sort points by absolute dateValue and then by padded sortOrder for relative events', () => {
    const character = makeCharacter({ id: 'c1' });
    const locA = makeLocation({ id: 'loc-a' });
    const locB = makeLocation({ id: 'loc-b' });
    const locC = makeLocation({ id: 'loc-c' });
    const locD = makeLocation({ id: 'loc-d' });
    const events: Event[] = [
      makeEvent({
        id: 'e-late',
        characterIds: ['c1'],
        locationId: 'loc-a',
        dateType: 'absolute',
        dateValue: '2024-03-10',
      }),
      makeEvent({
        id: 'e-early',
        characterIds: ['c1'],
        locationId: 'loc-b',
        dateType: 'absolute',
        dateValue: '2024-01-15',
      }),
      makeEvent({
        id: 'e-rel-3',
        characterIds: ['c1'],
        locationId: 'loc-c',
        dateType: 'relative',
        dateValue: '',
        sortOrder: 3,
      }),
      makeEvent({
        id: 'e-rel-1',
        characterIds: ['c1'],
        locationId: 'loc-d',
        dateType: 'relative',
        dateValue: '',
        sortOrder: 1,
      }),
    ];

    const result = buildCharacterFootprints(
      [locA, locB, locC, locD],
      events,
      [character],
    );

    expect(result).toHaveLength(1);
    const fp = result[0];
    if (!fp) throw new Error('expected a footprint');
    expect(fp.points.map((p) => p.locationId)).toEqual([
      'loc-b',
      'loc-a',
      'loc-d',
      'loc-c',
    ]);
    expect(fp.points[2]?.sortAt).toBe('order:0000000001');
    expect(fp.points[3]?.sortAt).toBe('order:0000000003');
  });

  it('should keep the earlier sortAt when the same location is reached from multiple sources', () => {
    const character = makeCharacter({ id: 'c1' });
    const locA = makeLocation({
      id: 'loc-a',
      characterIds: ['c1'],
      createdAt: '2024-01-01T00:00:00Z',
    });
    const locB = makeLocation({ id: 'loc-b' });
    const events: Event[] = [
      makeEvent({
        id: 'e-a',
        characterIds: ['c1'],
        locationId: 'loc-a',
        dateType: 'absolute',
        dateValue: '2023-12-31',
      }),
      makeEvent({
        id: 'e-b',
        characterIds: ['c1'],
        locationId: 'loc-b',
        dateType: 'absolute',
        dateValue: '2024-06-01',
      }),
    ];

    const result = buildCharacterFootprints([locA, locB], events, [character]);

    expect(result).toHaveLength(1);
    const fp = result[0];
    if (!fp) throw new Error('expected a footprint');
    const pointA = fp.points.find((p) => p.locationId === 'loc-a');
    expect(pointA?.sortAt).toBe('2023-12-31');
    expect(fp.points).toHaveLength(2);
  });

  it('should keep location.characterIds direct associations and filter footprints with fewer than 2 points', () => {
    const character = makeCharacter({ id: 'c1' });
    const locA = makeLocation({ id: 'loc-a', characterIds: ['c1'] });

    const result = buildCharacterFootprints([locA], [], [character]);

    expect(result).toEqual([]);
  });
});

describe('bezierPath', () => {
  it('should render a straight line for exactly two points', () => {
    const path = bezierPath([
      { posX: 0, posY: 0 },
      { posX: 10, posY: 10 },
    ]);

    expect(path).toBe('M 0 0 L 10 10');
  });

  it('should render cubic bezier segments for three or more points', () => {
    const path = bezierPath([
      { posX: 0, posY: 0 },
      { posX: 10, posY: 0 },
      { posX: 20, posY: 10 },
    ]);

    expect(path.startsWith('M 0 0')).toBe(true);
    expect(path).toContain(' C ');
  });
});
