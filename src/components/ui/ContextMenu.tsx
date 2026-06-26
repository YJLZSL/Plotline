import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

interface ContextMenuContextValue {
  open: boolean;
  positioned: boolean;
  pos: { x: number; y: number };
  adjustedPos: { x: number; y: number } | null;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  openAt: (point: { x: number; y: number }) => void;
  close: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

function useMenuContext() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error('ContextMenu subcomponents must be used inside <ContextMenu>');
  }
  return ctx;
}

interface ContextMenuProps {
  children: React.ReactNode;
}

export function ContextMenu({ children }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number } | null>(null);
  const [positioned, setPositioned] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPositioned(false);
    setAdjustedPos(null);
  }, []);

  const openAt = useCallback((point: { x: number; y: number }) => {
    setPos(point);
    setAdjustedPos(null);
    setPositioned(false);
    setOpen(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const el = contentRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let nextX = pos.x;
    let nextY = pos.y;

    if (nextX + rect.width > viewportWidth - 8) {
      nextX = Math.max(8, viewportWidth - rect.width - 8);
    }
    if (nextY + rect.height > viewportHeight - 8) {
      nextY = Math.max(8, viewportHeight - rect.height - 8);
    }

    setAdjustedPos({ x: nextX, y: nextY });
    setPositioned(true);

    const firstEnabled = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find(
      (b) => !b.disabled,
    );
    if (firstEnabled) {
      firstEnabled.focus({ preventScroll: true });
    }
  }, [open, pos]);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!contentRef.current?.contains(target)) {
        close();
      }
    };

    const onResize = () => close();

    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  const focusItem = useCallback((delta: number) => {
    const buttons = Array.from(contentRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    const enabled = buttons.filter((b) => !b.disabled);
    if (enabled.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    let current = enabled.findIndex((b) => b === active);
    if (current < 0) current = 0;

    const next = (current + delta + enabled.length) % enabled.length;
    enabled[next]?.focus({ preventScroll: true });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusItem(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusItem(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        const enabled = Array.from(
          contentRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
        ).filter((b) => !b.disabled);
        enabled[0]?.focus({ preventScroll: true });
      } else if (e.key === 'End') {
        e.preventDefault();
        const enabled = Array.from(
          contentRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
        ).filter((b) => !b.disabled);
        enabled[enabled.length - 1]?.focus({ preventScroll: true });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const active = document.activeElement as HTMLButtonElement | null;
        if (active?.role === 'menuitem' && !active.disabled) {
          active.click();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [open, close, focusItem],
  );

  const value: ContextMenuContextValue = {
    open,
    positioned,
    pos,
    adjustedPos,
    contentRef,
    openAt,
    close,
    handleKeyDown,
  };

  return <ContextMenuContext.Provider value={value}>{children}</ContextMenuContext.Provider>;
}

interface ContextMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function ContextMenuTrigger({ children, asChild }: ContextMenuTriggerProps) {
  const ctx = useMenuContext();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ctx.openAt({ x: e.clientX, y: e.clientY });
  };

  if (asChild && isValidElement(children)) {
    const child = children as React.ReactElement<{ onContextMenu?: (e: React.MouseEvent) => void }>;
    const originalOnContextMenu = child.props.onContextMenu;
    return cloneElement(child, {
      onContextMenu: (e: React.MouseEvent) => {
        originalOnContextMenu?.(e);
        handleContextMenu(e);
      },
    });
  }

  return (
    <div onContextMenu={handleContextMenu} className="contents">
      {children}
    </div>
  );
}

interface ContextMenuContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ContextMenuContent({ children, className }: ContextMenuContentProps) {
  const ctx = useMenuContext();
  if (!ctx.open) return null;

  const left = ctx.adjustedPos?.x ?? ctx.pos.x;
  const top = ctx.adjustedPos?.y ?? ctx.pos.y;

  return createPortal(
    <div
      ref={ctx.contentRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        'fixed z-[100] min-w-[160px] rounded-[8px] border border-border',
        'bg-bg-surface shadow-[var(--shadow-elevated)] p-1 outline-none',
        className,
      )}
      style={{
        left,
        top,
        visibility: ctx.positioned ? 'visible' : 'hidden',
      }}
      onKeyDown={ctx.handleKeyDown}
    >
      {children}
    </div>,
    document.body,
  );
}

interface ContextMenuItemProps extends React.ComponentPropsWithoutRef<'button'> {
  disabled?: boolean;
}

export function ContextMenuItem({
  children,
  disabled,
  className,
  onClick,
  onMouseEnter,
  ...props
}: ContextMenuItemProps) {
  const ctx = useMenuContext();
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      disabled={disabled}
      tabIndex={-1}
      onMouseEnter={(e) => {
        if (!disabled) {
          ref.current?.focus({ preventScroll: true });
        }
        onMouseEnter?.(e);
      }}
      onClick={(e) => {
        if (disabled) return;
        ctx.close();
        onClick?.(e);
      }}
      className={cn(
        'w-full text-left px-3 py-1.5 text-sm rounded-[6px]',
        'text-text-primary hover:bg-bg-elevated focus:bg-bg-elevated',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        'transition-colors flex items-center gap-2',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface ContextMenuSeparatorProps {
  className?: string;
}

export function ContextMenuSeparator({ className }: ContextMenuSeparatorProps) {
  return (
    <div
      className={cn('h-px bg-border my-1', className)}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}

interface ContextMenuSectionProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export function ContextMenuSection({ children, label, className }: ContextMenuSectionProps) {
  return (
    <div className={cn('py-1', className)}>
      {label && (
        <div className="px-3 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}
