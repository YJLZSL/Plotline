import type { Character, Event } from '@/types';

export interface PlotDensityBucket {
  label: string;
  count: number;
  startIndex: number;
  endIndex: number;
}

export interface PlotDensity {
  buckets: PlotDensityBucket[];
  totalEvents: number;
  peakCount: number;
  avgCount: number;
}

export function computePlotDensity(events: Event[], bucketCount = 8): PlotDensity {
  const ordered = orderBySequence(events);
  if (ordered.length === 0) {
    return { buckets: [], totalEvents: 0, peakCount: 0, avgCount: 0 };
  }
  const per = Math.max(1, Math.ceil(ordered.length / bucketCount));
  const buckets: PlotDensityBucket[] = [];
  for (let i = 0; i < ordered.length; i += per) {
    const slice = ordered.slice(i, i + per);
    const idx = buckets.length + 1;
    buckets.push({
      label: `${idx}`,
      count: slice.length,
      startIndex: i,
      endIndex: Math.min(i + per - 1, ordered.length - 1),
    });
    if (buckets.length >= bucketCount) break;
  }
  const counts = buckets.map((b) => b.count);
  const peakCount = counts.reduce((a, b) => Math.max(a, b), 0);
  const avgCount = ordered.length / buckets.length;
  return { buckets, totalEvents: ordered.length, peakCount, avgCount };
}

export interface CharacterArcPoint {
  eventIndex: number;
  eventId: string;
  eventTitle: string;
  dateValue: string;
  status: Event['status'];
}

export interface CharacterArc {
  characterId: string;
  characterName: string;
  color: string;
  arc: string;
  appearances: CharacterArcPoint[];
}

export function computeCharacterArcs(
  events: Event[],
  characters: Character[],
): CharacterArc[] {
  const ordered = orderBySequence(events);
  const indexById = new Map(ordered.map((e, i) => [e.id, i]));
  return characters.map((c) => {
    const appearances: CharacterArcPoint[] = c.eventIds
      .map((eid) => ordered.find((e) => e.id === eid))
      .filter((e): e is Event => e !== undefined)
      .map((e) => ({
        eventIndex: indexById.get(e.id) ?? 0,
        eventId: e.id,
        eventTitle: e.title,
        dateValue: e.dateValue,
        status: e.status,
      }))
      .sort((a, b) => a.eventIndex - b.eventIndex);
    return {
      characterId: c.id,
      characterName: c.name,
      color: c.color,
      arc: c.arc,
      appearances,
    };
  });
}

function orderBySequence(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const da = a.dateValue || '';
    const db = b.dateValue || '';
    if (da && db) return da.localeCompare(db);
    if (da) return -1;
    if (db) return 1;
    return a.sortOrder - b.sortOrder;
  });
}
