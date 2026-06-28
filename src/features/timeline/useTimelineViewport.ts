import { useCallback, useLayoutEffect, useState } from 'react';

import { adjustZoom, DEFAULT_ZOOM, LEFT_PADDING, MAX_ZOOM, MIN_ZOOM } from './timelineGrid';
import { clampTimelineScroll } from './timelineLayout';

export interface UseTimelineViewportOptions {
  /** 画布容器 ref，用于测量滚动边界与同步 scrollLeft。 */
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** 初始 zoom 值。 */
  initialZoom?: number;
}

export interface UseTimelineViewportResult {
  /** 当前连续 zoom 值（pixels-per-unit）。 */
  zoom: number;
  /** 当前水平滚动偏移。 */
  scrollLeft: number;
  /** 当前视口宽度。 */
  viewportWidth: number;
  /** 设置新的 zoom 值（会被限制在合法范围内）。 */
  setZoom: (zoom: number) => void;
  /** 直接设置 scrollLeft（会被限制在合法范围内）。 */
  setScrollLeft: (scrollLeft: number) => void;
  /** 设置视口宽度。 */
  setViewportWidth: (width: number) => void;
  /** 以鼠标/指针的视口水平位置为锚点进行缩放，保持锚点下方的时间不变。 */
  zoomAt: (anchorClientX: number, direction: 1 | -1) => void;
  /** 按给定像素增量平移（正数向右，负数向左）。 */
  panBy: (deltaX: number) => void;
}

/**
 * 管理时间轴视口的 zoom 与 scrollLeft。
 *
 * - zoom 与 scrollLeft 是受控状态，渲染完成后通过 layout effect 同步到 DOM。
 * - zoomAt 以指针位置为锚点：缩放前后，指针下方对应的时间点保持视觉位置不变。
 */
export function useTimelineViewport(
  options: UseTimelineViewportOptions,
): UseTimelineViewportResult {
  const { canvasRef, initialZoom = DEFAULT_ZOOM } = options;
  const [zoom, setZoomState] = useState(initialZoom);
  const [scrollLeft, setScrollLeftState] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

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

  return {
    zoom,
    scrollLeft,
    viewportWidth,
    setZoom,
    setScrollLeft,
    setViewportWidth,
    zoomAt,
    panBy,
  };
}
