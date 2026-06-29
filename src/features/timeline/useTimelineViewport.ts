import { useCallback, useLayoutEffect, useMemo, useState } from 'react';

import {
  adjustZoom,
  DEFAULT_ZOOM,
  LEFT_PADDING,
  MAX_ZOOM,
  MIN_ZOOM,
  getXAtTime,
  getTimeAtX,
  type ViewportState,
  type ViewportTimeRange,
} from './timelineGrid';
import { clampTimelineScroll } from './timelineLayout';

export interface UseTimelineViewportOptions {
  /** 画布容器 ref，用于测量滚动边界与同步 scrollLeft。 */
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** 初始 zoom 值。 */
  initialZoom?: number;
  /** 时间范围（受控值，用于 getXAtTime/getTimeAtX 的坐标换算）。传入时直接生效，无需 setTimeRange。 */
  timeRange?: ViewportTimeRange;
}

export interface UseTimelineViewportResult {
  /** 当前连续 zoom 值（pixels-per-unit）。 */
  zoom: number;
  /** 当前水平滚动偏移。 */
  scrollLeft: number;
  /** 当前视口宽度。 */
  viewportWidth: number;
  /** 当前时间范围。 */
  timeRange: ViewportTimeRange;
  /** 当前视口状态（zoom/scrollLeft/viewportWidth/timeRange/leftPadding 的聚合，作为唯一坐标源）。 */
  viewportState: ViewportState;
  /** 设置新的 zoom 值（会被限制在合法范围内）。 */
  setZoom: (zoom: number) => void;
  /** 直接设置 scrollLeft（会被限制在合法范围内）。 */
  setScrollLeft: (scrollLeft: number) => void;
  /** 设置视口宽度。 */
  setViewportWidth: (width: number) => void;
  /** 设置时间范围（事件增删导致 baseTime/maxTime 变化时调用）。 */
  setTimeRange: (range: ViewportTimeRange) => void;
  /** 以鼠标/指针的视口水平位置为锚点进行缩放，保持锚点下方的时间不变。 */
  zoomAt: (anchorClientX: number, direction: 1 | -1) => void;
  /** 按给定像素增量平移（正数向右，负数向左）。 */
  panBy: (deltaX: number) => void;
  /** 基于当前视口状态把时间映射为内容坐标 x（px）。单一坐标源入口。 */
  getXAtTime: (time: number | string | Date) => number;
  /** 基于当前视口状态把内容坐标 x（px）映射回时间。单一坐标源入口。 */
  getTimeAtX: (x: number) => Date | null;
}

const DEFAULT_TIME_RANGE: ViewportTimeRange = {
  startTime: 0,
  endTime: 365 * 24 * 3600 * 1000,
};

/**
 * 管理时间轴视口的 zoom 与 scrollLeft。
 *
 * - zoom 与 scrollLeft 是受控状态，渲染完成后通过 layout effect 同步到 DOM。
 * - zoomAt 以指针位置为锚点：缩放前后，指针下方对应的时间点保持视觉位置不变。
 * - 暴露 `getXAtTime` / `getTimeAtX` 作为时间↔像素换算的唯一入口，
 *   内部基于当前 zoom/scrollLeft/viewportWidth/timeRange 构造 `ViewportState`
 *   后调用 `timelineGrid.ts` 中的纯函数，保证标尺、事件卡片、连接线、Today 线
 *   全部使用同一坐标源。
 */
export function useTimelineViewport(
  options: UseTimelineViewportOptions,
): UseTimelineViewportResult {
  const { canvasRef, initialZoom = DEFAULT_ZOOM, timeRange: controlledTimeRange } = options;
  const [zoom, setZoomState] = useState(initialZoom);
  const [scrollLeft, setScrollLeftState] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [timeRangeState, setTimeRangeState] = useState<ViewportTimeRange>(DEFAULT_TIME_RANGE);
  // 受控 timeRange 优先于内部 state，保证视口坐标源与组件计算的时间范围在同一帧内一致，
  // 避免 grid 布局（使用新范围）与 getXAtTime（使用旧 state）之间出现一帧错位。
  const timeRange = controlledTimeRange ?? timeRangeState;

  const setZoom = useCallback((next: number) => {
    setZoomState(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next)));
  }, []);

  const setScrollLeft = useCallback((next: number) => {
    const el = canvasRef.current;
    if (!el) {
      setScrollLeftState(next);
      return;
    }
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setScrollLeftState(clampTimelineScroll(next, maxScroll));
  }, [canvasRef]);

  const setTimeRange = useCallback((range: ViewportTimeRange) => {
    setTimeRangeState(range);
  }, []);

  // 将受控 scrollLeft 同步到 DOM，并在 zoom/内容宽度变化后重新钳制到合法范围。
  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const clamped = clampTimelineScroll(scrollLeft, maxScroll);
    if (el.scrollLeft !== clamped) {
      el.scrollLeft = clamped;
    }
    if (clamped !== scrollLeft) {
      setScrollLeftState(clamped);
    }
  }, [canvasRef, scrollLeft]);

  const zoomAt = useCallback(
    (anchorClientX: number, direction: 1 | -1) => {
      const el = canvasRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const currentScrollLeft = el.scrollLeft;
      const anchorX = anchorClientX - rect.left + currentScrollLeft;
      const nextZoom = adjustZoom(zoom, direction);
      if (nextZoom === zoom) return;

      // 保持锚点对应的时间位置不变：
      // timeUnits = (anchorX - LEFT_PADDING) / zoom
      // newAnchorX = LEFT_PADDING + timeUnits * nextZoom
      const newAnchorX = LEFT_PADDING + ((anchorX - LEFT_PADDING) * nextZoom) / zoom;
      const targetScrollLeft = currentScrollLeft + newAnchorX - anchorX;

      setZoomState(nextZoom);
      setScrollLeftState(targetScrollLeft);
    },
    [canvasRef, zoom],
  );

  const panBy = useCallback(
    (deltaX: number) => {
      const el = canvasRef.current;
      if (!el) return;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      setScrollLeftState(clampTimelineScroll(el.scrollLeft + deltaX, maxScroll));
    },
    [canvasRef],
  );

  // 聚合当前 zoom/scrollLeft/viewportWidth/timeRange/leftPadding 为唯一坐标源。
  // 用 useMemo 保证仅在任一输入变化时才生成新对象，避免下游 memoized 组件无谓重渲染。
  const viewportState = useMemo<ViewportState>(
    () => ({
      zoom,
      scrollLeft,
      viewportWidth,
      timeRange,
      leftPadding: LEFT_PADDING,
    }),
    [zoom, scrollLeft, viewportWidth, timeRange],
  );

  const getXAtTimeCallback = useCallback(
    (time: number | string | Date) => getXAtTime(viewportState, time),
    [viewportState],
  );
  const getTimeAtXCallback = useCallback(
    (x: number) => getTimeAtX(viewportState, x),
    [viewportState],
  );

  return {
    zoom,
    scrollLeft,
    viewportWidth,
    timeRange,
    viewportState,
    setZoom,
    setScrollLeft,
    setViewportWidth,
    setTimeRange,
    zoomAt,
    panBy,
    getXAtTime: getXAtTimeCallback,
    getTimeAtX: getTimeAtXCallback,
  };
}
