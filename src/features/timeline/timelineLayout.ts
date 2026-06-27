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
 * Framer Motion 将数值约束解释为元素相对于父容器的可拖动位置范围，
 * 因此 `left` 直接限制卡片 `left` 的最小值（防止越过轨道左边缘），
 * `right` 限制 `left` 的最大值（防止右侧超出轨道右边缘）。
 * `lanePadding` 用于保留轨道左侧色标空间，默认 4px。
 */
export function computeEventDragConstraints(
  cardWidth: number,
  totalWidth?: number,
  lanePadding = 4,
): EventDragConstraints {
  const constraints: EventDragConstraints = { left: lanePadding };
  if (totalWidth !== undefined) {
    constraints.right = totalWidth - cardWidth;
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
