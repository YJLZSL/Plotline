export interface TimelineGridStop {
  /** 内容坐标 x（px）。必须与 getXAtTime 使用同一坐标源。 */
  x: number;
}

export interface TimelineGridBackgroundOptions {
  /** 网格线颜色（任意合法 CSS color，建议使用主题变量）。 */
  color?: string;
  /** 网格线粗细（px）。 */
  lineWidthPx?: number;
  /** 画布总宽度（px）。 */
  totalWidth: number;
  /** 首条网格线之前的最小留白（px）。 */
  leftPadding?: number;
}

/**
 * 把时间轴网格线位置转换为 CSS `linear-gradient` 背景。
 *
 * 网格线位置由调用方通过 `getXAtTime` 从真实日历刻度边界计算（A9），
 * 因此月/周/日/时各级别下背景网格始终与 DateRuler 的刻度像素级对齐，
 * 不再使用固定 `LEFT_PADDING + n*zoom` 的近似间距。
 *
 * 行数过多时（超过约 400 条）调用方应先通过 `sampleTickTimestamps` 降采样。
 */
export function buildTimelineGridBackground(
  stops: TimelineGridStop[],
  options: TimelineGridBackgroundOptions,
): string {
  const {
    color = 'color-mix(in srgb, var(--border) 55%, transparent)',
    lineWidthPx = 1,
    totalWidth,
    leftPadding = 0,
  } = options;

  if (!Number.isFinite(totalWidth) || totalWidth <= 0) return 'none';

  const linePercent = Math.max(0.005, (lineWidthPx / totalWidth) * 100);
  const parts: string[] = [];
  let previousX = -Infinity;
  const minGap = 0.75;

  for (const stop of stops) {
    if (!Number.isFinite(stop.x) || stop.x < leftPadding) continue;
    if (stop.x - previousX < minGap) continue;
    previousX = stop.x;
    const start = (stop.x / totalWidth) * 100;
    const end = Math.min(100, start + linePercent);
    parts.push(`transparent ${start}%`);
    parts.push(`${color} ${start}%`);
    parts.push(`${color} ${end}%`);
    parts.push(`transparent ${end}%`);
  }

  if (parts.length === 0) return 'none';
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

/**
 * 从刻度时间戳批量计算网格线位置。
 *
 * @param timestamps 真实日历边界时间戳（与 DateRuler 使用同一批刻度）
 * @param xAtTime    基于 viewportState 的单一坐标源函数
 * @returns 过滤掉越界/非法位置后的网格线
 */
export function toGridStops(
  timestamps: number[],
  xAtTime: (time: number) => number,
  maxX = Number.POSITIVE_INFINITY,
): TimelineGridStop[] {
  const stops: TimelineGridStop[] = [];
  for (const time of timestamps) {
    const x = xAtTime(time);
    if (!Number.isFinite(x) || x < 0 || x > maxX) continue;
    stops.push({ x });
  }
  return stops;
}
