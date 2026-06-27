export const FONT_STACKS = {
  sans: '"Inter", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "WenQuanYi Micro Hei", "Noto Sans CJK SC", "Source Han Sans SC", "Noto Sans SC", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, "SFMono-Regular", "Noto Sans Mono CJK SC", "Microsoft YaHei", "Noto Sans Mono SC", monospace',
  pixel: '"Fusion Pixel 10px", "Zpix", "站酷快乐体", "Noto Sans CJK SC", "Microsoft YaHei", "Noto Sans SC", monospace',
  smiley: '"Smiley Sans", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans SC", "Noto Sans SC", system-ui, -apple-system, sans-serif',
} as const;

export type FontStackKey = keyof typeof FONT_STACKS;
