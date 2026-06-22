import * as React from 'react';

import { cn } from '@/lib/utils';

export interface BrandMarkProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'children'> {
  size?: number;
  title?: string;
}

/**
 * Plotline 品牌标记：羽毛笔与书脊融合的手绘风 SVG。
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
        {/* 书脊底色 */}
        <path
          d="M10 8 Q9 7 10 6 L18 6 Q19 6 19 7 L19 41 Q19 42 18 42 L11 42 Q10 42 10 41 Z"
          fill="currentColor"
          fillOpacity="0.12"
        />
        {/* 书脊勾线 */}
        <path
          d="M10 8 Q9 7 10 6 L18 6 Q19 6 19 7 L19 41 Q19 42 18 42 L11 42 Q10 42 10 41 Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* 书脊纹理 */}
        <path
          d="M13 10 L16 10 M13 14 L16 14"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.55"
        />
        {/* 羽毛笔笔杆 */}
        <path
          d="M40 7 Q42 9 40 12 L25 27 Q23 29 22 32 L21 36 L25 35 Q28 34 30 32 L41 21"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 羽毛叶脉 */}
        <path
          d="M33 14 L37 18 M30 17 L34 21 M27 20 L31 24"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        {/* 墨点 */}
        <circle cx="22" cy="36" r="1.4" fill="currentColor" />
      </svg>
    );
  },
);
BrandMark.displayName = 'BrandMark';
