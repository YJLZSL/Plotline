import * as React from 'react';

import { cn } from '@/lib/utils';

type AppIconSize = 'sm' | 'md' | 'lg';
type AppIconTone = 'neutral' | 'accent' | 'muted' | 'inherit';

export interface AppIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: AppIconSize;
  tone?: AppIconTone;
  children: React.ReactNode;
}

const sizeClasses: Record<AppIconSize, string> = {
  sm: 'h-6 w-6 rounded-[6px] [&>svg]:h-3.5 [&>svg]:w-3.5',
  md: 'h-8 w-8 rounded-[8px] [&>svg]:h-4 [&>svg]:w-4',
  lg: 'h-12 w-12 rounded-[10px] [&>svg]:h-6 [&>svg]:w-6',
};

const toneClasses: Record<AppIconTone, string> = {
  neutral: 'bg-bg-elevated text-text-primary',
  accent: 'bg-accent/15 text-accent',
  muted: 'bg-bg-elevated/60 text-text-secondary',
  inherit: 'bg-transparent text-current',
};

/**
 * 统一的图标视觉容器：在 lucide-react 等线性图标外层叠加柔和背景与圆角，
 * 让侧边栏、空状态、工具栏、按钮内图标保持同一种视觉语言。
 */
export const AppIcon = React.forwardRef<HTMLSpanElement, AppIconProps>(
  ({ className, size = 'md', tone = 'neutral', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-grid place-items-center flex-shrink-0 transition-colors',
          sizeClasses[size],
          toneClasses[tone],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);
AppIcon.displayName = 'AppIcon';
