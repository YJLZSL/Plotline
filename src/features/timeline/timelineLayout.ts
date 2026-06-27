const EVENT_CARD_MIN_WIDTH = 200;
const EVENT_CARD_MAX_WIDTH = 360;

/**
 * 根据标题长度估算事件卡片宽度，限制在 200px~360px。
 */
export function getEventCardWidth(title: string, minWidth = EVENT_CARD_MIN_WIDTH, maxWidth = EVENT_CARD_MAX_WIDTH): number {
  const charWidth = /[\u4e00-\u9fa5]/.test(title) ? 14 : 8;
  return Math.min(maxWidth, Math.max(minWidth, 80 + title.length * charWidth));
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
