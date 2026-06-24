import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<'button'> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:brightness-110 active:brightness-95 shadow-sm',
  secondary:
    'bg-bg-elevated text-text-primary hover:bg-border border border-border',
  ghost: 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  outline:
    'border border-border text-text-primary hover:bg-bg-elevated',
  danger:
    'bg-red-500/90 text-white hover:bg-red-500 shadow-sm',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
  icon: 'h-9 w-9 p-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(
      'inline-flex items-center justify-center font-medium rounded-[6px] transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      'disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]',
      variants[variant],
      sizes[size],
      className,
    );
    if (asChild) {
      return (
        <Slot ref={ref} className={classes}>
          {children as React.ReactElement}
        </Slot>
      );
    }
    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span
            className="inline-flex gap-0.5 items-center"
            aria-hidden="true"
          >
            <span className="h-1 w-1 rounded-full bg-current opacity-70 animate-pulse-dot [animation-delay:-0.32s]" />
            <span className="h-1 w-1 rounded-full bg-current opacity-70 animate-pulse-dot [animation-delay:-0.16s]" />
            <span className="h-1 w-1 rounded-full bg-current opacity-70 animate-pulse-dot" />
          </span>
        )}
        {children as React.ReactNode}
      </button>
    );
  },
);
Button.displayName = 'Button';
