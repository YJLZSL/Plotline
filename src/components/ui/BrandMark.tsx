import * as React from 'react';

import { cn } from '@/lib/utils';

export interface BrandMarkProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'children'> {
  size?: number;
  title?: string;
}

/**
 * Plotline 品牌标记：羽毛笔沿时间线书写的简约线性图标。
 * 与应用图标（src-tauri/icons/icon.svg）使用同一构图，保证内外一致。
 * 默认颜色继承父级文字色（currentColor），可通过外部 `text-accent` 等类切换。
 */
export const BrandMark = React.forwardRef<SVGSVGElement, BrandMarkProps>(
  ({ size = 32, title = 'Plotline', className, ...props }, ref) => {
    const titleId = React.useId();
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="img"
        aria-labelledby={titleId}
        fill="none"
        className={cn('text-accent', className)}
        {...props}
      >
        <title id={titleId}>{title}</title>
        {/* 时间线主轴 */}
        <line x1="8" y1="36" x2="40" y2="36" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
        {/* 时间线节点 */}
        <circle cx="14" cy="36" r="2.2" fill="currentColor" opacity="0.75" />
        <circle cx="24" cy="36" r="2.6" fill="currentColor" />
        <circle cx="34" cy="36" r="2.2" fill="currentColor" opacity="0.75" />
        {/* 羽毛笔笔身 */}
        <path
          d="M37 6 Q38.5 6.5 38.5 8.5 Q38 10.5 36 12 L25 23 Q23 25 22.5 27.5 L22.5 36 L21.8 36 Q21.5 27 21.2 25.5 Q21 24 22.5 22.5 L34.5 10.5 Q36.5 8.5 37 6 Z"
          fill="currentColor"
          fillOpacity="0.95"
        />
        {/* 羽毛叶脉 */}
        <path
          d="M34.5 11 Q36 10 36.5 8.8 M32.5 13 Q34 12 34.5 10.8 M30.5 15 Q32 14 32.5 12.8 M28.5 17 Q30 16 30.5 14.8 M26.5 19 Q28 18 28.5 16.8"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.55"
          fill="none"
        />
        {/* 墨点光晕 */}
        <circle cx="24" cy="36" r="3.2" fill="currentColor" opacity="0.18" />
      </svg>
    );
  },
);
BrandMark.displayName = 'BrandMark';
