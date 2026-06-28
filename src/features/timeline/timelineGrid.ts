import type { Event, Track } from '@/types';
import { createTimeScale, type TimeScale, type ZoomLevel } from './timeScale';
import { getEventCardWidth } from './timelineLayout';

export type { TimeScale, ZoomLevel };

export const DEFAULT_ZOOM = 140;
export const MIN_ZOOM = 15;
export const MAX_ZOOM = 800;
export const ZOOM_FACTOR = 1.2;
export const LEFT_PADDING = 24;

const ZOOM_BASES: Record<ZoomLevel, number> = {
  hour: 60,
  day: 90,
  month: 140,
  year: 220,
};

const HOUR_DAY_THRESHOLD = Math.sqrt(ZOOM_BASES.hour * ZOOM_BASES.day);
const DAY_MONTH_THRESHOLD = Math.sqrt(ZOOM_BASES.day * ZOOM_BASES.month);
const MONTH_YEAR_THRESHOLD = Math.sqrt(ZOOM_BASES.month * ZOOM_BASES.year);

/** 根据连续 zoom 值（pixels-per-unit）返回最接近的离散级别标签。 */
export function getZoomLabel(zoom: number): ZoomLevel {
  if (zoom >= MONTH_YEAR_THRESHOLD) return 'year';
  if (zoom >= DAY_MONTH_THRESHOLD) return 'month';
  if (zoom >= HOUR_DAY_THRESHOLD) return 'day';
  return 'hour';
}

/** 按固定 factor 调整连续 zoom 值并限制在合法范围内。 */
export function adjustZoom(zoom: number, direction: 1 | -1): number {
  const factor = direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
}

export interface TimelineGrid {
  /** 相对事件的时间基准：最小绝对事件时间，无绝对事件时为 0。 */
  baseTime: number;
  /** 绝对时间轴右边界。 */
  maxTime: number;
  /** 连续 zoom 值，单位：pixels-per-unit。 */
  zoom: number;
  /** 用于标尺与连线的近似级别标签。 */
  zoomLabel: ZoomLevel;
  leftPadding: number;
  timeToX(time: number): number;
  xToTime(x: number): number;
  getMsPerUnit(): number;
  getRelativeDurationUnits(minCardWidth?: number, gap?: number): number;
  /** 返回内部 TimeScale，供 DateRuler / 连线层使用。 */
  getTimeScale(): TimeScale;
}

export function createTimelineGrid(
  baseTime: number,
  maxTime: number,
  zoom: number,
  leftPadding: number,
): TimelineGrid {
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  const zoomLabel = getZoomLabel(clampedZoom);
  const timeScale = createTimeScale(baseTime, maxTime, zoomLabel, leftPadding, clampedZoom);

  return {
    baseTime,
    maxTime,
    zoom: clampedZoom,
    zoomLabel,
    leftPadding,
    timeToX: (time) => timeScale.timeToX(time),
    xToTime: (x) => timeScale.xToTime(x),
    getMsPerUnit: () => timeScale.getMsPerUnit(),
    getRelativeDurationUnits(minCardWidth = 200, gap = 16) {
      return computeRelativeDurationUnits(this, minCardWidth, gap);
    },
    getTimeScale: () => timeScale,
  };
}

const EVENT_CARD_MIN_WIDTH = 200;
const RELATIVE_EVENT_CARD_GAP = 16;
const EVENT_OVERLAP_GAP = 1;

/**
 * 根据当前 zoom 值（pixels-per-unit），计算相邻相对事件之间应占用的时间单位数，
 * 使它们的水平间距至少能容纳一张最窄卡片 + 间隙。
 */
export function computeRelativeDurationUnits(
  grid: TimelineGrid,
  minCardWidth = EVENT_CARD_MIN_WIDTH,
  gap = RELATIVE_EVENT_CARD_GAP,
): number {
  if (grid.zoom <= 0) return 2;
  return Math.max(2, Math.ceil((minCardWidth + gap) / grid.zoom));
}

export interface ComputeTimelineLayoutOptions {
  eventHeight: number;
  rowGap: number;
  baseTop: number;
  trackHeight: number;
  minCardWidth?: number;
  maxCardWidth?: number;
  /** 相对事件每个 sortOrder 占用的时间单位数；未提供时按当前 zoom 自动计算。 */
  relativeDurationUnits?: number;
}

export interface EventLayoutItem {
  x: number;
  y: number;
  width: number;
  row: number;
  trackId: string;
}

export interface EventLayoutResult {
  /** 每个事件 id 对应的布局信息 */
  layouts: Map<string, EventLayoutItem>;
  /** 每个轨道 id 对应的渲染高度 */
  trackHeights: Map<string, number>;
}

function getEventTimePosition(ev: Event, grid: TimelineGrid, relativeDurationUnits: number): number {
  if (ev.dateType === 'absolute' && ev.dateValue) {
    const t = new Date(ev.dateValue).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const unitMs = grid.getMsPerUnit();
  return grid.baseTime + ev.sortOrder * unitMs * relativeDurationUnits;
}

function eventsOverlap(
  aX: number,
  aWidth: number,
  bX: number,
  bWidth: number,
  gap = EVENT_OVERLAP_GAP,
): boolean {
  return aX + gap < bX + bWidth && aX + aWidth > bX + gap;
}

/**
 * 计算时间轴事件卡片的瀑布布局。
 *
 * 按轨道分组，对绝对事件使用真实时间戳，对相对事件以 baseTime 为基准按 sortOrder 估算时间戳；
 * 当事件在水平方向重叠时，将其放到下一个子行（row），直到无重叠为止。
 * 返回每个事件的 x/y/width/row 以及每个轨道应展开的高度。
 */
export function computeTimelineLayout(
  events: Event[],
  tracks: Track[],
  grid: TimelineGrid,
  options: ComputeTimelineLayoutOptions,
): EventLayoutResult {
  const {
    eventHeight,
    rowGap,
    baseTop,
    trackHeight,
    minCardWidth = EVENT_CARD_MIN_WIDTH,
    maxCardWidth = 360,
    relativeDurationUnits = computeRelativeDurationUnits(grid, minCardWidth, RELATIVE_EVENT_CARD_GAP),
  } = options;

  const layouts = new Map<string, EventLayoutItem>();
  const trackHeights = new Map<string, number>();

  for (const tr of tracks) {
    trackHeights.set(tr.id, trackHeight);
  }

  const byTrack = new Map<string, Event[]>();
  for (const ev of events) {
    const arr = byTrack.get(ev.trackId) ?? [];
    arr.push(ev);
    byTrack.set(ev.trackId, arr);
  }

  for (const [trackId, trackEvents] of byTrack.entries()) {
    const items = trackEvents.map((ev) => {
      const time = getEventTimePosition(ev, grid, relativeDurationUnits);
      const x = grid.timeToX(time);
      const width = getEventCardWidth(ev.title, minCardWidth, maxCardWidth);
      return { ev, x, width };
    });

    items.sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.ev.sortOrder - b.ev.sortOrder;
    });

    const rows: Array<Array<{ x: number; width: number; id: string }>> = [];

    for (const item of items) {
      let placed = false;
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex]!;
        const hasOverlap = row.some((placedItem) =>
          eventsOverlap(item.x, item.width, placedItem.x, placedItem.width),
        );
        if (!hasOverlap) {
          row.push({ x: item.x, width: item.width, id: item.ev.id });
          layouts.set(item.ev.id, {
            x: item.x,
            y: baseTop + rowIndex * (eventHeight + rowGap),
            width: item.width,
            row: rowIndex,
            trackId,
          });
          placed = true;
          break;
        }
      }
      if (!placed) {
        const rowIndex = rows.length;
        rows.push([{ x: item.x, width: item.width, id: item.ev.id }]);
        layouts.set(item.ev.id, {
          x: item.x,
          y: baseTop + rowIndex * (eventHeight + rowGap),
          width: item.width,
          row: rowIndex,
          trackId,
        });
      }
    }

    const maxRow = rows.length - 1;
    const neededHeight = baseTop * 2 + (maxRow + 1) * eventHeight + maxRow * rowGap;
    trackHeights.set(trackId, Math.max(trackHeight, neededHeight));
  }

  return { layouts, trackHeights };
}
