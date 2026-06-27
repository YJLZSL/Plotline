const CROSS_LINE_MARKERS = ['**', '*', '``', '`'];

/**
 * 判断 Markdown 标记是否成对闭合，用于流式输出时避免渲染半截标记。
 * 该检查是启发式的，先对文本做 normalize，再统计常见内联标记数量。
 * 单星号会排除列表标记（行首 + 空格）与两侧均为空白的情况，避免把普通列表误判为未闭合斜体。
 */
export function isBalancedMarkdown(text: string): boolean {
  const normalized = normalizeMarkdown(text);
  const boldMarkers = (normalized.match(/\*\*/g) ?? []).length;
  const italicMarkers = countItalicMarkers(normalized);
  const strikeMarkers = (normalized.match(/~~/g) ?? []).length;
  const backticks = (normalized.match(/`/g) ?? []).length;
  return (
    boldMarkers % 2 === 0 &&
    italicMarkers % 2 === 0 &&
    strikeMarkers % 2 === 0 &&
    backticks % 2 === 0
  );
}

function countItalicMarkers(text: string): number {
  let count = 0;
  const regex = /(?<!\*)\*(?!\*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const idx = match.index;
    const prev = text[idx - 1] ?? '\n';
    const next = text[idx + 1] ?? '\n';
    // 列表标记：行首紧跟空白
    if ((prev === '\n' || prev === '\r') && /\s/.test(next)) continue;
    // 两侧都是空白，不是有效的强调 delimiter run
    if (/\s/.test(prev) && /\s/.test(next)) continue;
    count += 1;
  }
  return count;
}

function decodeHtmlEntities(source: string): string {
  return (
    source
      .replace(/&ast;/g, '*')
      .replace(/&num;/g, '#')
      .replace(/&dash;/g, '-')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, '\u00A0')
      // &amp; 必须最后处理，避免重复解码
      .replace(/&amp;/g, '&')
  );
}

function normalizeFullWidth(source: string): string {
  return source.replace(/＊/g, '*').replace(/｀/g, '`');
}

function unescapeMarkdown(source: string): string {
  // 双重转义：先还原为单层转义，再由下一步统一处理
  const doubleEscape = new RegExp('\\\\\\\\([*#>~_`\\-])', 'g');
  const singleEscape = new RegExp('\\\\([*#>~_`\\-])', 'g');
  return source.replace(doubleEscape, '\\$1').replace(singleEscape, '$1');
}

function extractTrailingMarker(line: string): string | null {
  const trimmed = line.trimEnd();
  for (const marker of CROSS_LINE_MARKERS) {
    if (trimmed.endsWith(marker)) return marker;
  }
  return null;
}

function extractLeadingMarker(line: string): string | null {
  const trimmed = line.trimStart();
  for (const marker of CROSS_LINE_MARKERS) {
    if (trimmed.startsWith(marker)) return marker;
  }
  return null;
}

function joinCrossLineMarkers(source: string): string {
  const lines = source.split('\n');
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const nextLine = lines[i + 1];
    const trailing = extractTrailingMarker(line);
    const leading = nextLine !== undefined ? extractLeadingMarker(nextLine) : null;
    if (trailing !== null && leading !== null && trailing === leading && nextLine !== undefined) {
      result.push(`${line.trimEnd()} ${nextLine.trimStart()}`);
      i += 1;
    } else {
      result.push(line);
    }
  }
  return result.join('\n');
}

export function normalizeMarkdown(source: string): string {
  let result = source;
  result = decodeHtmlEntities(result);
  result = normalizeFullWidth(result);
  result = unescapeMarkdown(result);
  result = joinCrossLineMarkers(result);
  return result;
}
