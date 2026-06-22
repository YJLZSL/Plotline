import * as React from 'react';

import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'outline' | 'status' | 'track';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  color?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-elevated text-text-secondary',
  outline: 'border border-border text-text-secondary',
  status: 'border border-border bg-bg-surface text-text-secondary',
  track: 'text-text-primary',
};

export function Badge({ className, variant = 'default', color, style, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full',
        variantClasses[variant],
        className,
      )}
      style={color ? { backgroundColor: color + '40', color, ...style } : style}
      {...props}
    />
  );
}

/** 状态圆点：根据事件/大纲状态显示颜色。 */
export function StatusDot({ status }: { status: 'draft' | 'done' | 'revise' }) {
  const colorClass =
    status === 'done'
      ? 'bg-status-done'
      : status === 'revise'
        ? 'bg-status-revise'
        : 'bg-text-secondary/60';
  return <span className={cn('inline-block h-2 w-2 rounded-full', colorClass)} />;
}
