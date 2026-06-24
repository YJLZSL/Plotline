import type { Event, Track } from '@/types';
import type { TimeScale } from './timeScale';

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

export function computeGanttLayout(tracks: Track[], events: Event[], timeScale: TimeScale): GanttLayout {
  const visibleTracks = tracks.filter((t) => t.isVisible);
  const rowLabels: GanttRowLabel[] = visibleTracks.map((t) => ({
    trackId: t.id,
    name: t.name,
    color: t.color,
  }));
  const trackIndex = new Map(visibleTracks.map((t, i) => [t.id, i]));

  const colWidth = GANTT_MIN_BAR_WIDTH + GANTT_COL_GAP;
  const bars: GanttBar[] = [];
  const relativeCounters = new Map<string, number>();

  const absoluteEvents = events.filter((e) => e.dateType === 'absolute' && e.dateValue);
  const relativeEvents = events.filter((e) => e.dateType !== 'absolute' || !e.dateValue);
  relativeEvents.sort((a, b) => a.sortOrder - b.sortOrder);

  for (const ev of [...absoluteEvents, ...relativeEvents]) {
    const row = trackIndex.get(ev.trackId);
    if (row === undefined) continue;
    const color = ev.color ?? visibleTracks[row]?.color ?? '#F4B6C2';

    let x: number;
    if (ev.dateType === 'absolute' && ev.dateValue) {
      const t = new Date(ev.dateValue).getTime();
      x = GANTT_LABEL_WIDTH + (timeScale.timeToX(t) - timeScale.leftPadding);
    } else {
      const idx = relativeCounters.get(ev.trackId) ?? 0;
      relativeCounters.set(ev.trackId, idx + 1);
      x = GANTT_LABEL_WIDTH + idx * colWidth;
    }

    bars.push({
      eventId: ev.id,
      trackId: ev.trackId,
      title: ev.title,
      dateValue: ev.dateValue,
      status: ev.status,
      color,
      x,
      width: GANTT_MIN_BAR_WIDTH,
      row,
    });
  }

  bars.sort((a, b) => a.x - b.x);

  const { major } = timeScale.getTicks();
  const fmt = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const tickLabels: GanttTick[] = major.map((t) => ({
    x: GANTT_LABEL_WIDTH + (timeScale.timeToX(t) - timeScale.leftPadding),
    label: fmt.format(new Date(t)),
  }));

  const maxBarEnd = bars.length > 0 ? Math.max(...bars.map((b) => b.x + b.width)) : 0;
  const maxTickX = tickLabels.length > 0 ? Math.max(...tickLabels.map((t) => t.x)) : 0;
  const timeAxisWidth = Math.max(
    0,
    timeScale.timeToX(timeScale.max) - timeScale.leftPadding,
  );
  const totalWidth = Math.max(
    640,
    GANTT_LABEL_WIDTH + Math.max(maxBarEnd, maxTickX, timeAxisWidth) + GANTT_COL_GAP,
  );
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
