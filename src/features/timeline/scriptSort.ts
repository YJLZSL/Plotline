import type { Event } from '@/types';

export function computeTrackAnchors(events: Event[]): Map<string, number> {
  const anchors = new Map<string, number>();
  for (const ev of events) {
    if (ev.dateType !== 'absolute' || !ev.dateValue) continue;
    const t = new Date(ev.dateValue).getTime();
    if (Number.isNaN(t)) continue;
    const current = anchors.get(ev.trackId);
    if (current === undefined || t < current) {
      anchors.set(ev.trackId, t);
    }
  }
  return anchors;
}

export function sortEventsForScript(
  a: Event,
  b: Event,
  trackAnchor: Map<string, number>,
): number {
  const anchorA = trackAnchor.get(a.trackId) ?? Number.POSITIVE_INFINITY;
  const anchorB = trackAnchor.get(b.trackId) ?? Number.POSITIVE_INFINITY;
  if (anchorA !== anchorB) return anchorA - anchorB;

  if (a.trackId !== b.trackId) return a.trackId.localeCompare(b.trackId);
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;

  if (a.dateType === 'absolute' && a.dateValue && b.dateType !== 'absolute') return -1;
  if (a.dateType !== 'absolute' && b.dateType === 'absolute' && b.dateValue) return 1;

  if (a.dateType === 'absolute' && a.dateValue && b.dateType === 'absolute' && b.dateValue) {
    const ta = new Date(a.dateValue).getTime();
    const tb = new Date(b.dateValue).getTime();
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
  }

  return 0;
}
