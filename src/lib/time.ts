import { format, intervalToDuration, formatDuration, isSameDay, isValid } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import type { Event } from '@/types';

export interface AbsoluteRange {
  start: Date;
  end?: Date;
}

const RANGE_SEPARATORS = /\s*[–—~]\s*|\s+-\s+/;

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

export function formatEventDuration(event: Event, locale = 'zh-CN'): string | null {
  if (event.dateType !== 'absolute') return null;
  const range = parseAbsoluteRange(event.dateValue);
  if (!range?.end) return null;
  const ms = range.end.getTime() - range.start.getTime();
  if (ms <= 0) return null;
  return formatDurationLocalized(ms, locale);
}
