import type { Event } from '@/types';

const EVENT_CARD_MIN_WIDTH = 200;
const EVENT_CARD_MAX_WIDTH = 360;
const EVENT_CARD_READABLE_MIN_WIDTH = 232;
const EVENT_CARD_READABLE_MAX_WIDTH = 400;

/**
 * 根据标题长度估算事件卡片宽度，限制在 200px~360px。
 */
export function getEventCardWidth(title: string, minWidth = EVENT_CARD_MIN_WIDTH, maxWidth = EVENT_CARD_MAX_WIDTH): number {
  const charWidth = /[\u4e00-\u9fa5]/.test(title) ? 14 : 8;
  return Math.min(maxWidth, Math.max(minWidth, 80 + title.length * charWidth));
}

function textWidth(text: string, charWidth: number, base: number): number {
  return base + text.length * charWidth;
}

interface CardWidthEntity {
  id: string;
  name: string;
}

export interface EventCardWidthOptions {
  minWidth?: number;
  maxWidth?: number;
  characters?: CardWidthEntity[];
  locations?: CardWidthEntity[];
}

/**
 * 复合估算事件卡片宽度（A2）：
 * 标题 / 时间范围 / 地点与角色头像共同决定宽度，避免只按标题估算导致截断或浪费。
 *
 * - 标题：中文字符 14px，其他 8px（与旧公式一致）。
 * - 时间：`dateValue` + `endDateTime` 的字宽，保证"2027-12-03 14:00 – 16:00"可读。
 * - 地点与角色：地点文本宽度 + 角色头像堆叠宽度。
 * - 下限提高到 232px，保证 header/body/footer 三行信息可读；上限 400px 防过长。
 */
export function getEventCardWidthForEvent(
  event: Event,
  options: EventCardWidthOptions = {},
): number {
  const {
    minWidth = EVENT_CARD_READABLE_MIN_WIDTH,
    maxWidth = EVENT_CARD_READABLE_MAX_WIDTH,
    characters = [],
    locations = [],
  } = options;

  const titleWidth = textWidth(event.title, /[\u4e00-\u9fa5]/.test(event.title) ? 14 : 8, 96);
  const dateLength = Math.max(10, event.dateValue.length + (event.endDateTime?.length ?? 0));
  const timeWidth = textWidth(event.dateValue || '2024-01-01', 7, 96) + Math.max(0, dateLength - 10) * 7;

  const location = locations.find((l) => l.id === event.locationId);
  const locationWidth = location ? textWidth(location.name, /[\u4e00-\u9fa5]/.test(location.name) ? 12 : 7, 72) : 0;

  const associatedCount = characters.filter((c) => event.characterIds.includes(c.id)).length;
  const charactersWidth = associatedCount > 0 ? 20 + associatedCount * 22 : 0;
  const footerWidth = locationWidth > 0 && charactersWidth > 0
    ? locationWidth + charactersWidth + 12
    : locationWidth + charactersWidth;

  const width = Math.max(titleWidth, timeWidth, footerWidth);
  return Math.min(maxWidth, Math.max(minWidth, width));
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
