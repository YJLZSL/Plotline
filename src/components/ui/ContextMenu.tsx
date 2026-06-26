import {
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
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

interface MenuItemEntry {
  ref: React.RefObject<HTMLButtonElement | null>;
  disabled: boolean;
}

interface ContextMenuContextValue {
  open: boolean;
  positioned: boolean;
  pos: { x: number; y: number };
  adjustedPos: { x: number; y: number } | null;
  activeIndex: number;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  registerItem: (ref: React.MutableRefObject<HTMLButtonElement | null>, disabled: boolean) => number;
  unregisterItem: (index: number) => void;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<MenuItemEntry[]>([]);

  const close = useCallback(() => {
    setOpen(false);
    setPositioned(false);
    setAdjustedPos(null);
    setActiveIndex(-1);
    itemsRef.current = [];
  }, []);

  const openAt = useCallback((point: { x: number; y: number }) => {
    setPos(point);
    setAdjustedPos(null);
    setPositioned(false);
    setActiveIndex(-1);
    itemsRef.current = [];
    setOpen(true);
  }, []);

  const registerItem = useCallback(
    (itemRef: React.RefObject<HTMLButtonElement | null>, disabled: boolean) => {
      itemsRef.current.push({ ref: itemRef, disabled });
      return itemsRef.current.length - 1;
    },
    [],
  );

  const unregisterItem = useCallback((index: number) => {
    itemsRef.current.splice(index, 1);
    setActiveIndex((prev) => {
      if (prev >= itemsRef.current.length) {
        return Math.max(0, itemsRef.current.length - 1);
      }
      return prev;
    });
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

    const firstEnabled = itemsRef.current.findIndex((item) => !item.disabled);
    if (firstEnabled >= 0) {
      setActiveIndex(firstEnabled);
    }
  }, [open, pos]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const item = itemsRef.current[activeIndex];
    if (item?.ref.current) {
      item.ref.current.focus({ preventScroll: true });
    }
  }, [open, activeIndex]);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!open) return;

      const items = itemsRef.current;
      const total = items.length;
      if (total === 0) return;

      const findNextEnabled = (start: number, direction: 1 | -1) => {
        let i = start;
        for (let step = 0; step < total; step += 1) {
          i = (i + direction + total) % total;
          if (!items[i]?.disabled) return i;
        }
        return -1;
      };

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = findNextEnabled(activeIndex, 1);
        if (next >= 0) setActiveIndex(next);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = findNextEnabled(activeIndex, -1);
        if (next >= 0) setActiveIndex(next);
      } else if (e.key === 'Home') {
        e.preventDefault();
        const next = items.findIndex((item) => !item.disabled);
        if (next >= 0) setActiveIndex(next);
      } else if (e.key === 'End') {
        e.preventDefault();
        let next = -1;
        for (let i = items.length - 1; i >= 0; i -= 1) {
          if (!items[i]?.disabled) {
            next = i;
            break;
          }
        }
        if (next >= 0) setActiveIndex(next);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const item = items[activeIndex];
        if (item?.ref.current && !item.disabled) {
          item.ref.current.click();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [open, activeIndex, close],
  );

  const value: ContextMenuContextValue = {
    open,
    positioned,
    pos,
    adjustedPos,
    activeIndex,
    contentRef,
    registerItem,
    unregisterItem,
    setActiveIndex,
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
    return <Slot onContextMenu={handleContextMenu}>{children}</Slot>;
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
  ...props
}: ContextMenuItemProps) {
  const ctx = useMenuContext();
  const ref = useRef<HTMLButtonElement>(null);
  const indexRef = useRef<number>(-1);

  useEffect(() => {
    indexRef.current = ctx.registerItem(ref, disabled ?? false);
    return () => {
      ctx.unregisterItem(indexRef.current);
    };
  }, [ctx, disabled]);

  const isActive = ctx.activeIndex === indexRef.current;

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      data-active={isActive}
      onMouseEnter={() => setActiveIndexSafe(ctx, indexRef.current)}
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

function setActiveIndexSafe(ctx: ContextMenuContextValue, index: number) {
  if (index >= 0) {
    ctx.setActiveIndex(index);
  }
}

interface ContextMenuSeparatorProps {
  className?: string;
}

export function ContextMenuSeparator({ className }: ContextMenuSeparatorProps) {
  return <div className={cn('h-px bg-border my-1', className)} role="separator" aria-orientation="horizontal" />;
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
