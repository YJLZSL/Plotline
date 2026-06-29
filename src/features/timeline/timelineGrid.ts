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

// ===== 单一坐标源：ViewportState =====

/**
 * 时间轴可视范围。
 * `startTime`/`endTime` 既可以是 ms 时间戳（number），也可以是 ISO 字符串或 Date。
 * 内部统一转换为 ms 时间戳参与计算。
 */
export interface ViewportTimeRange {
  startTime: number | string | Date;
  endTime: number | string | Date;
}

/**
 * 时间轴视口的唯一坐标源。
 *
 * 所有"时间 ↔ 像素"换算 SHALL 通过 `getXAtTime` / `getTimeAtX` 进行，
 * 不允许组件各自独立计算 time→x。
 *
 * - `zoom`：连续 pixels-per-unit（与 {@link adjustZoom} 配合使用）。
 * - `scrollLeft`：当前水平滚动偏移（px）。注意：scrollLeft 是视口偏移，
 *   不影响 time→content-x 的映射；它仅在需要把 content-x 换算为 viewport-x 时使用。
 * - `viewportWidth`：可见区域宽度（px）。用于检测退化状态。
 * - `timeRange`：时间轴起止时间，决定 `TimeScale` 的 min/max。
 * - `leftPadding`：时间轴左侧留白（默认 {@link LEFT_PADDING}）。
 */
export interface ViewportState {
  zoom: number;
  scrollLeft: number;
  viewportWidth: number;
  timeRange: ViewportTimeRange;
  leftPadding: number;
}

function toMs(time: number | string | Date): number {
  if (time instanceof Date) return time.getTime();
  if (typeof time === 'number') return time;
  return new Date(time).getTime();
}

/**
 * 判断 ViewportState 是否处于退化状态（无法进行有效坐标换算）。
 * 退化条件：zoom 非正、viewportWidth 非正、时间范围非正、或起止时间为 NaN。
 */
function isDegenerate(state: ViewportState): boolean {
  if (!Number.isFinite(state.zoom) || state.zoom <= 0) return true;
  if (!Number.isFinite(state.viewportWidth) || state.viewportWidth <= 0) return true;
  const start = toMs(state.timeRange.startTime);
  const end = toMs(state.timeRange.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return true;
  if (end <= start) return true;
  return false;
}

/**
 * 基于 ViewportState 内部构造一个 TimeScale。
 * 复用 {@link createTimeScale} 的实现以保证向后兼容。
 */
function buildTimeScale(state: ViewportState): TimeScale {
  const start = toMs(state.timeRange.startTime);
  const end = toMs(state.timeRange.endTime);
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom));
  const zoomLabel = getZoomLabel(clampedZoom);
  return createTimeScale(start, end, zoomLabel, state.leftPadding, clampedZoom);
}

/**
 * 把时间映射为时间轴内容坐标 x（px）。
 *
 * 这是时间轴唯一的 time→x 换算入口。所有标尺刻度、事件卡片左边距、
 * 连接线端点、Today 参考线 SHALL 通过此函数计算水平坐标。
 *
 * @param state 视口状态（唯一坐标源）
 * @param time  时间，可为 Date / ms 时间戳 / ISO 字符串
 * @returns 内容坐标 x（px）；若 state 退化则返回 leftPadding
 */
export function getXAtTime(state: ViewportState, time: number | string | Date): number {
  if (isDegenerate(state)) return state.leftPadding;
  const t = toMs(time);
  if (!Number.isFinite(t)) return state.leftPadding;
  const scale = buildTimeScale(state);
  return scale.timeToX(t);
}

/**
 * 把时间轴内容坐标 x（px）映射回时间。
 *
 * @param state 视口状态（唯一坐标源）
 * @param x     内容坐标 x（px）
 * @returns 对应的 Date；若 state 退化或 x 非法则返回 null
 */
export function getTimeAtX(state: ViewportState, x: number): Date | null {
  if (isDegenerate(state)) return null;
  if (!Number.isFinite(x)) return null;
  const scale = buildTimeScale(state);
  return new Date(scale.xToTime(x));
}

/**
 * 基于 ViewportState 构造一个 TimeScale，供需要 `getTicks()` 等方法的组件使用。
 *
 * 这是 `getXAtTime` / `getTimeAtX` 的配套入口：组件 SHALL 通过此函数获取
 * TimeScale，而不是自行调用 `createTimeScale`，以保证坐标源唯一。
 * 返回的 TimeScale 与 `getXAtTime`/`getTimeAtX` 内部使用的 TimeScale 完全一致。
 */
export function getViewportTimeScale(state: ViewportState): TimeScale {
  return buildTimeScale(state);
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
