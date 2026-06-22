import type { Event, Track } from '@/types';

export interface GanttBar {
  eventId: string;
  trackId: string;
  title: string;
  dateValue: string;
  status: Event['status'];
  color: string;
  x: number;
  width: number;
  row: number;
}

export interface GanttRowLabel {
  trackId: string;
  name: string;
  color: string;
}

export interface GanttTick {
  x: number;
  label: string;
}

export interface GanttLayout {
  bars: GanttBar[];
  rowLabels: GanttRowLabel[];
  tickLabels: GanttTick[];
  rowCount: number;
  rowHeight: number;
  barHeight: number;
  labelWidth: number;
  totalWidth: number;
  totalHeight: number;
}

export const GANTT_ROW_HEIGHT = 56;
export const GANTT_BAR_HEIGHT = 36;
export const GANTT_LABEL_WIDTH = 168;
export const GANTT_MIN_BAR_WIDTH = 128;
export const GANTT_COL_GAP = 10;
const HEADER_HEIGHT = 36;

export function computeGanttLayout(tracks: Track[], events: Event[]): GanttLayout {
  const visibleTracks = tracks.filter((t) => t.isVisible);
  const rowLabels: GanttRowLabel[] = visibleTracks.map((t) => ({
    trackId: t.id,
    name: t.name,
    color: t.color,
  }));
  const trackIndex = new Map(visibleTracks.map((t, i) => [t.id, i]));

  const sorted = [...events]
    .filter((e) => trackIndex.has(e.trackId))
    .sort((a, b) => {
      const da = a.dateValue || '';
      const db = b.dateValue || '';
      if (da && db) return da.localeCompare(db);
      if (da) return -1;
      if (db) return 1;
      return a.sortOrder - b.sortOrder;
    });

  const colWidth = GANTT_MIN_BAR_WIDTH + GANTT_COL_GAP;
  const bars: GanttBar[] = sorted.map((ev, i) => {
    const row = trackIndex.get(ev.trackId) ?? 0;
    return {
      eventId: ev.id,
      trackId: ev.trackId,
      title: ev.title,
      dateValue: ev.dateValue,
      status: ev.status,
      color: ev.color ?? visibleTracks[row]?.color ?? '#F4B6C2',
      x: GANTT_LABEL_WIDTH + i * colWidth,
      width: GANTT_MIN_BAR_WIDTH,
      row,
    };
  });

  const tickLabels: GanttTick[] = sorted.map((ev, i) => ({
    x: GANTT_LABEL_WIDTH + i * colWidth,
    label: ev.dateValue || `#${i + 1}`,
  }));

  const totalWidth =
    GANTT_LABEL_WIDTH + Math.max(sorted.length * colWidth, colWidth) + GANTT_COL_GAP;
  const totalHeight = visibleTracks.length * GANTT_ROW_HEIGHT + HEADER_HEIGHT;

  return {
    bars,
    rowLabels,
    tickLabels,
    rowCount: visibleTracks.length,
    rowHeight: GANTT_ROW_HEIGHT,
    barHeight: GANTT_BAR_HEIGHT,
    labelWidth: GANTT_LABEL_WIDTH,
    totalWidth,
    totalHeight,
  };
}
