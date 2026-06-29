import { format, intervalToDuration, formatDuration, isSameDay, isValid } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import type { Event } from '@/types';

export interface AbsoluteRange {
  start: Date;
  end?: Date;
}

const RANGE_SEPARATORS = /\s*[–—~]\s*|\s+-\s+/;

/** 无持续时间占位符（相对事件或无结束时间的绝对事件）。 */
export const NO_DURATION = '——';

function detectLocale(locale: string) {
  return locale === 'zh-CN' ? zhCN : enUS;
}

function parseDatePart(part: string, anchor?: Date): Date | null {
  const trimmed = part.trim();
  if (!trimmed) return null;

  let candidate = new Date(trimmed);
  if (isValid(candidate)) return candidate;

  // Support end part written as "HH:mm" only, by combining with the start date.
  if (anchor && /^\d{1,2}:\d{2}([\s\S]*)$/.test(trimmed)) {
    const base = format(anchor, 'yyyy-MM-dd');
    candidate = new Date(`${base}T${trimmed}`);
    if (isValid(candidate)) return candidate;
  }

  return null;
}

export function parseAbsoluteRange(value: string): AbsoluteRange | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(RANGE_SEPARATORS).filter(Boolean);
  if (parts.length >= 2) {
    const start = parseDatePart(parts[0]!);
    if (!start) return null;
    const end = parseDatePart(parts[1]!, start);
    if (end && end.getTime() >= start.getTime()) {
      return { start, end };
    }
    return { start };
  }

  const single = parseDatePart(trimmed);
  return single ? { start: single } : null;
}

function hasTimeComponent(value: string): boolean {
  return /\d{1,2}:\d{2}/.test(value);
}

/**
 * 获取绝对事件的时间范围。
 *
 * 优先使用 `event.endDateTime`（显式结束时间）；
 * 若未提供，则从 `dateValue` 中的范围语法解析。
 * 相对事件返回 `null`。
 */
export function getEventAbsoluteRange(event: Event): AbsoluteRange | null {
  if (event.dateType !== 'absolute') return null;

  if (event.endDateTime) {
    const start = parseDatePart(event.dateValue);
    const end = parseDatePart(event.endDateTime);
    if (start && end && end.getTime() >= start.getTime()) {
      return { start, end };
    }
    if (start) return { start };
  }

  return parseAbsoluteRange(event.dateValue);
}

export function formatEventTime(event: Event, locale = 'zh-CN'): string {
  if (event.dateType !== 'absolute') {
    return `相对 #${event.sortOrder + 1}`;
  }

  const range = parseAbsoluteRange(event.dateValue);
  if (!range) return event.dateValue || '';

  const loc = detectLocale(locale);

  if (range.end) {
    if (isSameDay(range.start, range.end)) {
      return `${format(range.start, 'yyyy-MM-dd HH:mm', { locale: loc })} – ${format(range.end, 'HH:mm', { locale: loc })}`;
    }
    return `${format(range.start, 'yyyy-MM-dd HH:mm', { locale: loc })} – ${format(range.end, 'yyyy-MM-dd HH:mm', { locale: loc })}`;
  }

  if (hasTimeComponent(event.dateValue)) {
    return format(range.start, 'yyyy-MM-dd HH:mm', { locale: loc });
  }

  return format(range.start, 'yyyy-MM-dd', { locale: loc });
}

export function formatDurationLocalized(ms: number, locale = 'zh-CN'): string {
  const loc = detectLocale(locale);
  const duration = intervalToDuration({ start: 0, end: Math.max(0, ms) });
  return formatDuration(duration, {
    format: ['years', 'months', 'days', 'hours', 'minutes'],
    locale: loc,
  }) || '0 分钟';
}

/**
 * 输出相对事件的天数偏移标签。
 *
 * - 正数偏移：`"+2d"`
 * - 负数偏移：`"−1d"`（使用 U+2212 减号）
 * - 零偏移：`"同步"` / `"Synced"`
 * - 无偏移信息（`relativeOffsetDays` 为 `null`/`undefined`）：返回空字符串
 * - 绝对事件：返回空字符串
 */
export function formatRelativeOffset(event: Event, locale = 'zh-CN'): string {
  if (event.dateType === 'absolute') return '';
  const offset = event.relativeOffsetDays;
  if (offset === null || offset === undefined) return '';
  if (offset === 0) {
    return locale === 'zh-CN' ? '同步' : 'Synced';
  }
  const sign = offset > 0 ? '+' : '−';
  return `${sign}${Math.abs(offset)}d`;
}

/**
 * 输出事件的场景化时间范围文本。
 *
 * - 绝对事件有起止时间：
 *   - 同日：`"2027-12-03 14:00 – 16:00"`
 *   - 同年异日：`"2027-12-03 14:00 – 12-04 16:00"`（结束省略年份）
 *   - 跨年：`"2027-12-03 14:00 – 2028-01-15 16:00"`
 * - 绝对事件仅起始时间：`"2027-12-03 14:00"`（或 `"2027-12-03"` 无时间分量时）
 * - 相对事件：
 *   - 有锚点 + 偏移：`"相对 #3 · +2d"`
 *   - 有锚点无偏移：`"相对 #3"`
 *   - 偏移为 0：`"相对 #3 · 同步"`
 */
export function formatEventTimeRange(event: Event, locale = 'zh-CN'): string {
  if (event.dateType !== 'absolute') {
    const anchorId = event.relativeTo ?? String(event.sortOrder + 1);
    const offset = formatRelativeOffset(event, locale);
    const relativeLabel = locale === 'zh-CN' ? '相对' : 'Relative';
    if (offset) {
      return `${relativeLabel} #${anchorId} · ${offset}`;
    }
    return `${relativeLabel} #${anchorId}`;
  }

  const range = getEventAbsoluteRange(event);
  if (!range) return event.dateValue || '';

  const loc = detectLocale(locale);

  if (range.end) {
    const sameYear = range.start.getFullYear() === range.end.getFullYear();
    const sameDay = isSameDay(range.start, range.end);

    if (sameDay) {
      return `${format(range.start, 'yyyy-MM-dd HH:mm', { locale: loc })} – ${format(range.end, 'HH:mm', { locale: loc })}`;
    }

    if (sameYear) {
      return `${format(range.start, 'yyyy-MM-dd HH:mm', { locale: loc })} – ${format(range.end, 'MM-dd HH:mm', { locale: loc })}`;
    }

    return `${format(range.start, 'yyyy-MM-dd HH:mm', { locale: loc })} – ${format(range.end, 'yyyy-MM-dd HH:mm', { locale: loc })}`;
  }

  if (hasTimeComponent(event.dateValue)) {
    return format(range.start, 'yyyy-MM-dd HH:mm', { locale: loc });
  }

  return format(range.start, 'yyyy-MM-dd', { locale: loc });
}

/**
 * 输出事件的持续时间（短格式）。
 *
 * - `"<1d" 以内`：`"2h"` / `"30m"` / `"2h 30m"`
 * - `">=1d"`：`"2d"` / `"2d 4h"`
 * - 相对事件或无结束时间：返回 `"——"`
 *
 * 始终返回非空字符串；调用方可通过比较 `NO_DURATION` 常量判断是否为无持续时间占位。
 */
export function formatEventDuration(event: Event, locale = 'zh-CN'): string {
  if (event.dateType !== 'absolute') return NO_DURATION;
  const range = getEventAbsoluteRange(event);
  if (!range?.end) return NO_DURATION;
  const ms = range.end.getTime() - range.start.getTime();
  if (ms <= 0) return NO_DURATION;

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);

  if (parts.length === 0) return NO_DURATION;
  void locale; // 短格式无本地化需求，保留参数以兼容调用约定
  return parts.join(' ');
}
