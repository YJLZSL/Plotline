export type ZoomLevel = 'hour' | 'day' | 'month' | 'year';

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * 标尺刻度级别，按"zoom 越大刻度越细"的方向排列。
 *
 * `chooseTickLevel(zoom)` 基于连续 zoom 值（pixels-per-unit）选定最合适的级别，
 * 标尺据此决定主/次刻度的密度与格式。所有级别都基于真实日历边界（年/季/月/周/日/时），
 * 不依赖固定 30/365 天近似。
 */
export type TickLevel = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour';

export interface TimeScale {
  min: number;
  max: number;
  zoom: ZoomLevel;
  leftPadding: number;
  timeToX(time: number): number;
  xToTime(x: number): number;
  getUnitWidth(): number;
  getMsPerUnit(): number;
  getStepSize(): number;
  getTicks(): { major: number[]; minor: number[] };
}

// ===== 刻度级别选择与格式化 =====
//
// zoom 在本项目中是"pixels-per-unit"的连续值，单位随 getZoomLabel 切换：
//   - hour 模式：1 单位 = 1 小时
//   - day 模式：1 单位 = 1 天
//   - month 模式：1 单位 = 1 月
//   - year 模式：1 单位 = 1 年
// 因此 pixels-per-day 在不同模式下需要不同换算。chooseTickLevel 直接以 zoom 值为输入，
// 阈值取自 timelineGrid.ZOOM_BASES 与相邻级别的几何平均，保证刻度密度始终可读。

/** 各 TickLevel 对应的 zoom 阈值（大于等于则升级到更精细的级别）。 */
const TICK_LEVEL_THRESHOLDS: Array<{ level: TickLevel; minZoom: number }> = [
  // zoom < 73: hour 模式（1 day = 24*zoom px ≥ 24*15 = 360px），小时刻度可读
  { level: 'hour', minZoom: 0 },
  // 73 ≤ zoom < 112: day 模式（1 day = zoom px），天刻度+小时次刻度
  { level: 'day', minZoom: 73 },
  // 112 ≤ zoom < 140: week 模式（1 day = zoom/30 px ≈ 4-5px），周刻度+天次刻度
  { level: 'week', minZoom: 112 },
  // 140 ≤ zoom < 175: month 模式（1 month = zoom px），月刻度+周次刻度
  { level: 'month', minZoom: 140 },
  // 175 ≤ zoom < 220: quarter 模式，季度刻度+月次刻度
  { level: 'quarter', minZoom: 175 },
  // zoom ≥ 220: year 模式（1 year = zoom px），年刻度+季度次刻度
  { level: 'year', minZoom: 220 },
];

/**
 * 根据连续 zoom 值选择最合适的刻度级别。
 *
 * 阈值由 `timelineGrid.ZOOM_BASES` 的几何平均推导而来：
 * zoom 越大刻度越细（year → quarter → month → week → day → hour）。
 *
 * @param zoom 连续 pixels-per-unit 值
 * @returns 对应的 TickLevel
 */
export function chooseTickLevel(zoom: number): TickLevel {
  // NaN / 非正值视为非法，回落到最细级别（hour）保证标尺总有刻度
  if (Number.isNaN(zoom) || zoom <= 0) return 'hour';
  // Infinity 视为极大 zoom，对应最粗级别（year）
  if (!Number.isFinite(zoom)) return 'year';
  let level: TickLevel = 'hour';
  for (const entry of TICK_LEVEL_THRESHOLDS) {
    if (zoom >= entry.minZoom) level = entry.level;
  }
  return level;
}

/**
 * 主刻度的格式化函数。主刻度是标尺上完整显示的刻度（如年份、季度、月份等）。
 */
export function formatMajorTick(date: Date, level: TickLevel): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth(); // 0-11
  const d = date.getUTCDate();
  const h = date.getUTCHours();
  switch (level) {
    case 'year':
      return String(y);
    case 'quarter': {
      const q = Math.floor(m / 3) + 1;
      return `${y} Q${q}`;
    }
    case 'month':
      return `${y}-${String(m + 1).padStart(2, '0')}`;
    case 'week': {
      const week = getISOWeek(date);
      return `${y}-W${String(week).padStart(2, '0')}`;
    }
    case 'day':
      return `${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    case 'hour':
      return `${String(h).padStart(2, '0')}:00`;
    default:
      return '';
  }
}

/**
 * 次刻度的格式化函数。次刻度是更细粒度的辅助刻度（如季度下的月份、月份下的日期等）。
 */
export function formatMinorTick(date: Date, level: TickLevel): string {
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const h = date.getUTCHours();
  switch (level) {
    case 'year': {
      const q = Math.floor(m / 3) + 1;
      return `Q${q}`;
    }
    case 'quarter':
      return String(m + 1);
    case 'month':
      return String(d);
    case 'week':
      return String(d);
    case 'day':
      return `${String(h).padStart(2, '0')}:00`;
    case 'hour':
      return `${String(h).padStart(2, '0')}:00`;
    default:
      return '';
  }
}

/**
 * 各 TickLevel 主刻度之间的时间间隔。
 * 用于在 [min, max] 范围内按固定步长生成刻度时间戳。
 */
export function getTickInterval(level: TickLevel): { unit: 'year' | 'month' | 'day' | 'hour'; value: number } {
  switch (level) {
    case 'year':
      return { unit: 'year', value: 1 };
    case 'quarter':
      return { unit: 'month', value: 3 };
    case 'month':
      return { unit: 'month', value: 1 };
    case 'week':
      return { unit: 'day', value: 7 };
    case 'day':
      return { unit: 'day', value: 1 };
    case 'hour':
      return { unit: 'hour', value: 1 };
    default:
      return { unit: 'day', value: 1 };
  }
}

/**
 * 返回指定 TickLevel 对应的吸附时间间隔（毫秒）。
 *
 * 这里使用与 `getMsPerUnit` 一致的平均单位长度，使像素级阈值计算
 * （`gridCellWidth = intervalMs / msPerUnit * zoom`）保持连续；
 * 实际吸附点仍通过 `alignToTickBoundary` 对齐到真实日历边界。
 */
export function getSnapInterval(level: TickLevel): number {
  switch (level) {
    case 'hour':
      return HOUR_MS;
    case 'day':
      return DAY_MS;
    case 'week':
      return 7 * DAY_MS;
    case 'month':
      return DAY_MS * 30.4375;
    case 'quarter':
      return DAY_MS * 30.4375 * 3;
    case 'year':
      return DAY_MS * 365.25;
    default:
      return DAY_MS;
  }
}

/** 计算 ISO 8601 周数（1-53）。 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

/**
 * 在 `[min, max]` 时间范围内按 `level` 的主刻度间隔生成时间戳。
 *
 * 主刻度始终对齐到对应 TickLevel 的自然日历边界
 * （年刻度从 1 月 1 日开始；季度从 1/4/7/10 月 1 日开始；月从每月 1 日；
 * 周从 ISO 周一；日从 UTC 0 点；小时从整点）。
 *
 * 次刻度由 {@link getMinorTickTimestamps} 生成，密度比主刻度细一档。
 *
 * @param min  起始时间戳（ms）
 * @param max  结束时间戳（ms）
 * @param level 主刻度级别
 * @returns 主刻度时间戳数组（升序），均落在 `[min, max]` 内
 */
export function getMajorTickTimestamps(min: number, max: number, level: TickLevel): number[] {
  const ticks: number[] = [];
  const interval = getTickInterval(level);
  // 对齐到当前 level 的自然日历边界
  const start = alignToTickBoundary(min, level);
  let cur = start;
  let safety = 0;
  while (cur <= max && safety < 5000) {
    if (cur >= min) ticks.push(cur);
    cur = advanceByInterval(cur, interval);
    safety++;
  }
  return ticks;
}

/**
 * 在 `[min, max]` 时间范围内生成次刻度时间戳。
 *
 * 次刻度密度比主刻度细一档：
 * - year → quarter (3 个月)
 * - quarter → month
 * - month → week (7 天)
 * - week → day
 * - day → hour
 * - hour → hour（与主刻度相同，返回空数组）
 *
 * 与主刻度重合的时间点会被自动排除（依赖 `majorSet` 精确匹配，
 * 因为主/次刻度都通过 {@link alignToTickBoundary} 对齐到日历边界，
 * 重合时时间戳完全一致）。
 */
export function getMinorTickTimestamps(min: number, max: number, level: TickLevel): number[] {
  const minorLevel: TickLevel = (() => {
    switch (level) {
      case 'year':
        return 'quarter';
      case 'quarter':
        return 'month';
      case 'month':
        return 'week';
      case 'week':
        return 'day';
      case 'day':
        return 'hour';
      case 'hour':
        return 'hour';
      default:
        return 'day';
    }
  })();
  if (minorLevel === level) return [];
  const minorInterval = getTickInterval(minorLevel);
  const majorSet = new Set(getMajorTickTimestamps(min, max, level));
  const ticks: number[] = [];
  const start = alignToTickBoundary(min, minorLevel);
  let cur = start;
  let safety = 0;
  while (cur <= max && safety < 10000) {
    if (cur >= min && !majorSet.has(cur)) {
      ticks.push(cur);
    }
    cur = advanceByInterval(cur, minorInterval);
    safety++;
  }
  return ticks;
}

/** 把时间戳对齐到指定 TickLevel 的自然日历边界（向下取整）。 */
export function alignToTickBoundary(ts: number, level: TickLevel): number {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const d0 = d.getUTCDate();
  const h = d.getUTCHours();
  switch (level) {
    case 'year':
      return Date.UTC(y, 0, 1);
    case 'quarter': {
      const qStart = Math.floor(m / 3) * 3;
      return Date.UTC(y, qStart, 1);
    }
    case 'month':
      return Date.UTC(y, m, 1);
    case 'week': {
      // ISO 周以周一为起点
      const date = new Date(Date.UTC(y, m, d0));
      const day = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() - (day - 1));
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }
    case 'day':
      return Date.UTC(y, m, d0);
    case 'hour':
      return Date.UTC(y, m, d0, h);
    default:
      return ts;
  }
}

/** 按给定间隔推进时间戳。 */
export function advanceByInterval(ts: number, interval: { unit: 'year' | 'month' | 'day' | 'hour'; value: number }): number {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const d0 = d.getUTCDate();
  const h = d.getUTCHours();
  switch (interval.unit) {
    case 'year':
      return Date.UTC(y + interval.value, m, d0, h);
    case 'month': {
      const totalMonths = (y * 12 + m) + interval.value;
      const newY = Math.floor(totalMonths / 12);
      const newM = ((totalMonths % 12) + 12) % 12;
      return Date.UTC(newY, newM, d0, h);
    }
    case 'day':
      return ts + interval.value * DAY_MS;
    case 'hour':
      return ts + interval.value * HOUR_MS;
    default:
      return ts;
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

function utcYear(ts: number): number {
  return new Date(ts).getUTCFullYear();
}

function utcMonth(ts: number): number {
  return new Date(ts).getUTCMonth();
}

function utcHours(ts: number): number {
  return new Date(ts).getUTCHours();
}

function utcMinutes(ts: number): number {
  return new Date(ts).getUTCMinutes();
}

function utcSeconds(ts: number): number {
  return new Date(ts).getUTCSeconds();
}

function utcMilliseconds(ts: number): number {
  return new Date(ts).getUTCMilliseconds();
}

function utcStartOfDay(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function utcAddMonths(ts: number, months: number): number {
  const d = new Date(ts);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const candidate = new Date(Date.UTC(year, month + months, day));
  // Handle month-end overflow (e.g., Jan 31 + 1 month -> Feb 28/29)
  if (candidate.getUTCDate() !== day) {
    return new Date(Date.UTC(year, month + months + 1, 0)).getTime();
  }
  return candidate.getTime();
}

function utcAddYears(ts: number, years: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear() + years, d.getUTCMonth(), d.getUTCDate());
}

function utcAddDays(ts: number, days: number): number {
  return ts + days * DAY_MS;
}

function differenceInCalendarMonths(a: number, b: number): number {
  return (utcYear(a) - utcYear(b)) * 12 + (utcMonth(a) - utcMonth(b));
}

function differenceInCalendarYears(a: number, b: number): number {
  return utcYear(a) - utcYear(b);
}

function differenceInCalendarDays(a: number, b: number): number {
  return Math.floor((utcStartOfDay(a) - utcStartOfDay(b)) / DAY_MS);
}

export function createTimeScale(
  min: number,
  max: number,
  zoom: ZoomLevel,
  leftPadding: number,
  unitWidth: number,
): TimeScale {
  const timeToX = (time: number): number => {
    const units = timeToUnits(time, min, zoom);
    return leftPadding + units * unitWidth;
  };

  const xToTime = (x: number): number => {
    const units = (x - leftPadding) / unitWidth;
    return unitsToTime(units, min, zoom);
  };

  return {
    min,
    max,
    zoom,
    leftPadding,
    timeToX,
    xToTime,
    getUnitWidth: () => unitWidth,
    getMsPerUnit: () => getMsPerUnit(zoom),
    getStepSize: () => getStepSize(zoom),
    getTicks: () => getTicks(min, max, zoom),
  };
}

function getMsPerUnit(zoom: ZoomLevel): number {
  switch (zoom) {
    case 'hour':
      return HOUR_MS;
    case 'day':
      return DAY_MS;
    case 'month':
      return DAY_MS * 30.4375;
    case 'year':
      return DAY_MS * 365.25;
    default:
      return DAY_MS;
  }
}

function getStepSize(zoom: ZoomLevel): number {
  switch (zoom) {
    case 'hour':
      return HOUR_MS * 6;
    case 'day':
      return DAY_MS * 7;
    case 'month':
      return 3;
    case 'year':
      return 1;
    default:
      return DAY_MS;
  }
}

function timeToUnits(time: number, min: number, zoom: ZoomLevel): number {
  switch (zoom) {
    case 'hour': {
      return (time - min) / HOUR_MS;
    }
    case 'day': {
      const startOfMinDay = utcStartOfDay(min);
      const startOfTimeDay = utcStartOfDay(time);
      const wholeDays = (startOfTimeDay - startOfMinDay) / DAY_MS;
      const fraction =
        (utcHours(time) * 3600 + utcMinutes(time) * 60 + utcSeconds(time) + utcMilliseconds(time) / 1000) /
        (24 * 3600);
      return wholeDays + fraction;
    }
    case 'month': {
      const wholeMonths = differenceInCalendarMonths(time, min);
      const anchor = utcAddMonths(min, wholeMonths);
      const remainingDays = differenceInCalendarDays(time, anchor);
      const totalDays = daysInMonth(utcYear(anchor), utcMonth(anchor));
      const fraction = remainingDays / totalDays;
      return wholeMonths + fraction;
    }
    case 'year': {
      const wholeYears = differenceInCalendarYears(time, min);
      const anchor = utcAddYears(min, wholeYears);
      const remainingDays = differenceInCalendarDays(time, anchor);
      const totalDays = daysInYear(utcYear(anchor));
      const fraction = remainingDays / totalDays;
      return wholeYears + fraction;
    }
    default:
      return 0;
  }
}

function unitsToTime(units: number, min: number, zoom: ZoomLevel): number {
  switch (zoom) {
    case 'hour':
      return min + units * HOUR_MS;
    case 'day': {
      const wholeDays = Math.floor(units);
      const fraction = units - wholeDays;
      return utcStartOfDay(min) + wholeDays * DAY_MS + fraction * DAY_MS;
    }
    case 'month': {
      const wholeMonths = Math.floor(units);
      const fraction = units - wholeMonths;
      const anchor = utcAddMonths(min, wholeMonths);
      const days = daysInMonth(utcYear(anchor), utcMonth(anchor));
      return utcAddDays(anchor, Math.round(fraction * days));
    }
    case 'year': {
      const wholeYears = Math.floor(units);
      const fraction = units - wholeYears;
      const anchor = utcAddYears(min, wholeYears);
      const days = daysInYear(utcYear(anchor));
      return utcAddDays(anchor, Math.round(fraction * days));
    }
    default:
      return min;
  }
}


function getTicks(min: number, max: number, zoom: ZoomLevel): { major: number[]; minor: number[] } {
  const majors: number[] = [];
  const minors: number[] = [];
  const minDate = new Date(min);

  if (zoom === 'hour') {
    let cur = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate(), minDate.getUTCHours(), 0, 0, 0)).getTime();
    while (cur <= max) {
      if (cur >= min) majors.push(cur);
      for (let i = 1; i < 6; i++) {
        const m = cur + i * HOUR_MS;
        if (m >= min && m <= max) minors.push(m);
      }
      cur += 6 * HOUR_MS;
    }
  } else if (zoom === 'day') {
    let cur = utcStartOfDay(min);
    while (cur <= max) {
      if (cur >= min) majors.push(cur);
      for (let i = 1; i < 7; i++) {
        const m = cur + i * DAY_MS;
        if (m >= min && m <= max) minors.push(m);
      }
      cur += 7 * DAY_MS;
    }
  } else if (zoom === 'month') {
    const year = minDate.getUTCFullYear();
    const month = minDate.getUTCMonth();
    let cur = new Date(Date.UTC(year, month, 1)).getTime();
    let count = 0;
    while (cur <= max) {
      if (cur >= min) majors.push(cur);
      const nextMinor1 = utcAddMonths(cur, 1);
      const nextMinor2 = utcAddMonths(cur, 2);
      if (nextMinor1 >= min && nextMinor1 <= max) minors.push(nextMinor1);
      if (nextMinor2 >= min && nextMinor2 <= max) minors.push(nextMinor2);
      cur = utcAddMonths(cur, 3);
      count++;
      if (count > 1000) break; // safety guard
    }
  } else {
    // year
    const year = minDate.getUTCFullYear();
    let cur = new Date(Date.UTC(year, 0, 1)).getTime();
    let count = 0;
    while (cur <= max) {
      if (cur >= min) majors.push(cur);
      const midYear = new Date(Date.UTC(new Date(cur).getUTCFullYear(), 6, 1)).getTime();
      if (midYear >= min && midYear <= max) minors.push(midYear);
      cur = utcAddYears(cur, 1);
      count++;
      if (count > 1000) break;
    }
  }

  return { major: majors, minor: minors };
}
