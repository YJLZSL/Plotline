import type { Event, Track } from '@/types';
import type { TimeScale } from './timeScale';

const EVENT_CARD_MIN_WIDTH = 200;
const EVENT_CARD_MAX_WIDTH = 360;

/**
 * 根据标题长度估算事件卡片宽度，限制在 200px~360px。
 */
export function getEventCardWidth(title: string, minWidth = EVENT_CARD_MIN_WIDTH, maxWidth = EVENT_CARD_MAX_WIDTH): number {
  const charWidth = /[\u4e00-\u9fa5]/.test(title) ? 14 : 8;
  return Math.min(maxWidth, Math.max(minWidth, 80 + title.length * charWidth));
}

export interface ComputeEventLayoutOptions {
  eventHeight: number;
  rowGap: number;
  baseTop: number;
  trackHeight: number;
  minCardWidth?: number;
  maxCardWidth?: number;
  /** 相对事件每个 sortOrder 占用的时间单位数，默认 2 */
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

function getEventTimePosition(ev: Event, timeScale: TimeScale, relativeDurationUnits: number): number {
  if (ev.dateType === 'absolute' && ev.dateValue) {
    const t = new Date(ev.dateValue).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const unitMs = timeScale.getMsPerUnit();
  return timeScale.min + ev.sortOrder * unitMs * relativeDurationUnits;
}

function eventsOverlap(aX: number, aWidth: number, bX: number, bWidth: number): boolean {
  return aX < bX + bWidth && aX + aWidth > bX;
}

/**
 * 计算时间轴事件卡片的瀑布布局。
 *
 * 按轨道分组，对绝对事件使用真实时间戳，对相对事件使用 sortOrder 估算时间戳；
 * 当事件在水平方向重叠时，将其放到下一个子行（row），直到无重叠为止。
 * 返回每个事件的 x/y/width/row 以及每个轨道应展开的高度。
 */
export function computeEventLayout(
  events: Event[],
  tracks: Track[],
  timeScale: TimeScale,
  options: ComputeEventLayoutOptions,
): EventLayoutResult {
  const {
    eventHeight,
    rowGap,
    baseTop,
    trackHeight,
    minCardWidth = EVENT_CARD_MIN_WIDTH,
    maxCardWidth = EVENT_CARD_MAX_WIDTH,
    relativeDurationUnits = 2,
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
      const time = getEventTimePosition(ev, timeScale, relativeDurationUnits);
      const x = timeScale.timeToX(time);
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

/**
 * 估算标尺标签宽度，用于主刻度防重叠采样。
 */
export function estimateLabelWidth(label: string): number {
  let width = 0;
  for (const char of label) {
    width += /[\u4e00-\u9fa5]/.test(char) ? 13 : 7;
  }
  return width + 16;
}

/**
 * 将 Today 标签的横坐标限制在画布安全区域内，防止靠近左右边缘时被裁切。
 */
export function clampTodayLabelX(
  todayX: number,
  totalWidth: number,
  labelWidth = 40,
  minPadding = 20,
): number {
  return Math.max(minPadding, Math.min(todayX, totalWidth - labelWidth));
}

/**
 * 计算轨道内 "+" 添加按钮的 left 位置：
 * - 无事件时放在最左侧留白处；
 * - 有事件时放在最后一个事件卡片右侧，但不超出画布右边界。
 */
export function computeAddButtonLeft(
  eventXs: number[],
  totalWidth: number,
  buttonWidth: number,
  cardWidth: number,
  gap: number,
): number {
  if (eventXs.length === 0) return 8;
  const maxX = Math.max(...eventXs);
  const rightBound = Math.max(8, totalWidth - buttonWidth - 8);
  return Math.min(rightBound, Math.max(8, maxX + cardWidth + gap));
}

export interface EventDragConstraints {
  left: number;
  right?: number;
}

/**
 * 计算事件卡片在 Framer Motion `dragConstraints` 中的边界。
 * 由于卡片已经绝对定位在 `left: x`，Framer Motion 的数值约束作用于 drag 偏移量，
 * 因此约束应基于卡片的最终目标位置：
 * - 最左可拖到 `lanePadding`
 * - 最右可拖到 `totalWidth - cardWidth`
 * 返回的 `left`/`right` 是允许 drag 偏移量的最小/最大值。
 */
export function computeEventDragConstraints(
  cardWidth: number,
  totalWidth?: number,
  x = 0,
  lanePadding = 4,
): EventDragConstraints {
  const constraints: EventDragConstraints = { left: lanePadding - x };
  if (totalWidth !== undefined) {
    constraints.right = totalWidth - cardWidth - x;
  }
  return constraints;
}

/**
 * 将时间轴画布的 scrollLeft 限制在合法范围 [0, maxScroll] 内。
 * 当内容比视口窄时（maxScroll <= 0），统一返回 0。
 */
export function clampTimelineScroll(scrollLeft: number, maxScroll: number): number {
  if (scrollLeft < 0) return 0;
  if (maxScroll <= 0) return 0;
  if (scrollLeft > maxScroll) return maxScroll;
  return scrollLeft;
}
