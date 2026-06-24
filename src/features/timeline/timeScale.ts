export type ZoomLevel = 'hour' | 'day' | 'month' | 'year';

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

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

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
