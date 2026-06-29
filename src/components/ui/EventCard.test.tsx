import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { forwardRef, useState, useRef, type ComponentProps } from 'react';
import type { Character, Event, Track } from '@/types';
import type { EventLayoutItem, ViewportState } from '@/features/timeline/timelineGrid';

import { EventCard, EventTooltipContent_ } from './EventCard';
import { TooltipProvider } from './Tooltip';
import { NO_DURATION } from '@/lib/time';
import { useUIStore } from '@/stores/ui';

type UIState = ReturnType<typeof useUIStore>;

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
}));

vi.mock('@/hooks/useAmbientAnimation', () => ({
  useAmbientAnimation: () => ({ transition: { duration: 0 }, animate: false, enabled: false, fancy: false }),
}));

vi.mock('@/stores/ui', () => ({
  useUIStore: vi.fn(),
}));

interface MotionDivProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  layout?: unknown;
  drag?: unknown;
  dragMomentum?: unknown;
  dragElastic?: unknown;
  dragSnapToOrigin?: unknown;
  dragConstraints?: unknown;
  whileDrag?: { scale?: number; transition?: unknown } | undefined;
  whileHover?: unknown;
  whileTap?: unknown;
  'data-testid'?: string;
  onDragStart?: (e: unknown, info: DragInfo) => void;
  onDrag?: (e: unknown, info: DragInfo) => void;
  onDragEnd?: (e: unknown, info: DragInfo) => void;
}

interface DragInfo {
  point: { x: number; y: number };
  offset: { x: number; y: number };
  delta: { x: number; y: number };
  velocity: { x: number; y: number };
}

function makeDragInfo(point: { x: number; y: number }, offset: { x: number; y: number }): DragInfo {
  return { point, offset, delta: offset, velocity: { x: 0, y: 0 } };
}

const motionValues = new Map<string, { get: () => number; set: (v: number) => void }>();

vi.mock('framer-motion', () => {
  const mockAnimate = vi.fn((target, to, options) => {
    if (target && typeof target === 'object' && 'set' in target) {
      (target as { set: (v: number) => void }).set(to as number);
    }
    if (options && typeof options === 'object' && 'onComplete' in options) {
      (options as { onComplete?: () => void }).onComplete?.();
    }
    return { stop: vi.fn() };
  });

  const MockMotionDiv = forwardRef<HTMLDivElement, MotionDivProps>(
    (
      {
        children,
        className,
        style,
        'data-testid': dataTestid,
        whileDrag,
        onDragStart,
        onDrag,
        onDragEnd,
        ...rest
      },
      ref,
    ) => {
      const [isDragging, setIsDragging] = useState(false);
      const startRef = useRef({ x: 0, y: 0 });
      const domProps = Object.fromEntries(
        Object.entries(rest).filter(
          ([k]) =>
            k.startsWith('data-') ||
            k === 'role' ||
            k.startsWith('on') ||
            ['id', 'aria-label', 'aria-hidden', 'aria-describedby', 'title'].includes(k),
        ),
      );

      const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        startRef.current = { x: e.clientX, y: e.clientY };
        setIsDragging(true);
        const info = makeDragInfo({ x: e.clientX, y: e.clientY }, { x: 0, y: 0 });
        onDragStart?.(e, info);
      };

      const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const offset = { x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y };
        const info = makeDragInfo({ x: e.clientX, y: e.clientY }, offset);
        onDrag?.(e, info);
      };

      const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        setIsDragging(false);
        const offset = { x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y };
        const info = makeDragInfo({ x: e.clientX, y: e.clientY }, offset);
        onDragEnd?.(e, info);
      };

      return (
        <div
          ref={ref}
          className={className}
          style={style}
          data-testid={dataTestid}
          data-mock-dragging={isDragging}
          data-whiledrag={whileDrag ? JSON.stringify({ scale: whileDrag.scale, transition: whileDrag.transition }) : undefined}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          {...domProps}
        >
          {children}
        </div>
      );
    },
  );
  MockMotionDiv.displayName = 'MockMotionDiv';

  return {
    useReducedMotion: () => false,
    motion: { div: MockMotionDiv },
    animate: mockAnimate,
    useMotionValue: (initial: number) => {
      const key = `mv-${Math.random()}`;
      const entry = {
        get: () => motionValues.get(key)?.get() ?? initial,
        set: (v: number) => motionValues.set(key, { get: () => v, set: (nv: number) => motionValues.set(key, { get: () => nv, set: entry.set }) }),
      };
      motionValues.set(key, entry);
      return entry;
    },
  };
});

function makeEvent(overrides: Partial<Event> & { title: string; dateValue: string; dateType: Event['dateType'] }): Event {
  return {
    id: 'e1',
    workspaceId: 'ws',
    trackId: 't1',
    title: overrides.title,
    description: overrides.description ?? '',
    dateType: overrides.dateType,
    dateValue: overrides.dateValue,
    sortOrder: overrides.sortOrder ?? 0,
    status: overrides.status ?? 'draft',
    color: overrides.color ?? null,
    locationId: overrides.locationId ?? null,
    imageUrls: [],
    characterIds: overrides.characterIds ?? [],
    connectedEventIds: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    endDateTime: overrides.endDateTime ?? null,
    relativeTo: overrides.relativeTo ?? null,
    relativeOffsetDays: overrides.relativeOffsetDays ?? null,
  };
}

const track: Track = {
  id: 't1',
  workspaceId: 'ws',
  name: '主线',
  color: '#F4B6C2',
  sortOrder: 0,
  isVisible: true,
  createdAt: '2024-01-01T00:00:00Z',
};

const layout: EventLayoutItem = { x: 100, y: 12, width: 220, row: 0, trackId: 't1' };

const viewportState: ViewportState = {
  zoom: 1,
  scrollLeft: 0,
  viewportWidth: 800,
  timeRange: { startTime: 0, endTime: 86400000 },
  leftPadding: 60,
};

const baseUiState: UIState = {
  sidebarCollapsed: false,
  detailPanelOpen: false,
  aiPanelOpen: false,
  enhancedAnimations: false,
  firstWorkspaceVisit: false,
  toggleSidebar: () => {},
  setSidebarCollapsed: () => {},
  toggleDetailPanel: () => {},
  setDetailPanelOpen: () => {},
  toggleAiPanel: () => {},
  setAiPanelOpen: () => {},
  setEnhancedAnimations: () => {},
  setFirstWorkspaceVisit: () => {},
};

function mockUiStore(enhanced: boolean) {
  (vi.mocked(useUIStore) as unknown as Mock).mockImplementation((selector?: (state: UIState) => unknown) => {
    const state = Object.assign({}, baseUiState, { enhancedAnimations: enhanced }) as UIState;
    return selector ? selector(state) : state;
  });
}

const noop = () => {};

function renderCard(props: Partial<ComponentProps<typeof EventCard>> = {}) {
  const event = makeEvent({ title: '测试事件', dateValue: '2024-03-15 09:00 – 11:30', dateType: 'absolute' });
  return render(
    <TooltipProvider delayDuration={0}>
      <EventCard
        event={event}
        track={track}
        index={0}
        layout={layout}
        totalWidth={1000}
        selected={false}
        pendingConnection={false}
        isConflict={false}
        isNew={false}
        isDragging={false}
        characters={[]}
        locations={[]}
        onSelect={noop}
        onEdit={noop}
        onDragEnd={noop}
        onStartConnection={noop}
        onDuplicate={noop}
        onAskAi={noop}
        onDelete={noop}
        onChangeStatus={noop}
        onDragStart={noop}
        onDrag={noop}
        onDragEndNotify={noop}
        {...props}
      />
    </TooltipProvider>,
  );
}

describe('EventCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    motionValues.clear();
    mockUiStore(false);
  });

  it('renders title, time range, duration and status dot', () => {
    renderCard({ event: makeEvent({ title: '决战', dateValue: '2024-03-15 09:00 – 11:30', dateType: 'absolute', status: 'done' }) });

    expect(screen.getByText('决战')).toBeInTheDocument();
    expect(screen.getByText('2024-03-15 09:00 – 11:30')).toBeInTheDocument();
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'timeline.event.statusDone' })).toBeInTheDocument();
  });

  it('renders a relative time range with index for relative events', () => {
    renderCard({ event: makeEvent({ title: '序幕', dateValue: '', dateType: 'relative', sortOrder: 0 }) });

    expect(screen.getByText('序幕')).toBeInTheDocument();
    expect(screen.getByText('相对 #1')).toBeInTheDocument();
  });

  it('renders only date for date-only absolute events', () => {
    renderCard({ event: makeEvent({ title: '生日', dateValue: '2024-05-20', dateType: 'absolute' }) });

    expect(screen.getByText('2024-05-20')).toBeInTheDocument();
    expect(screen.queryByText(/小时/)).not.toBeInTheDocument();
  });

  it('shows a conflict indicator when isConflict is true', () => {
    renderCard({ isConflict: true });
    expect(screen.getByTitle('timeline.conflictBadge')).toBeInTheDocument();
  });

  it('applies dragging className when isDragging prop is true', () => {
    renderCard({ isDragging: true });
    const card = screen.getByTestId('event-card');
    expect(card.className).toContain('z-50');
    expect(card.className).toContain('cursor-grabbing');
    expect(card).toHaveAttribute('data-dragging', 'true');
  });

  it('applies dragging className during local drag', async () => {
    const onDragStart = vi.fn();
    renderCard({ onDragStart });
    const card = screen.getByTestId('event-card');

    expect(card).toHaveAttribute('data-dragging', 'false');
    fireEvent.mouseDown(card, { clientX: 150, clientY: 40 });

    expect(onDragStart).toHaveBeenCalledWith('e1', 150, 40);
    await waitFor(() => expect(card).toHaveAttribute('data-dragging', 'true'));
    expect(card.className).toContain('z-50');
  });

  it('passes whileDrag scale 1.02 when enhanced animations are enabled', () => {
    mockUiStore(true);
    renderCard();
    const card = screen.getByTestId('event-card');
    const whileDragAttr = card.getAttribute('data-whiledrag');
    expect(whileDragAttr).not.toBeNull();
    const parsed = JSON.parse(whileDragAttr!);
    expect(parsed.scale).toBe(1.02);
    expect(parsed.transition.duration).toBe(0.12);
  });

  it('keeps scale unchanged in whileDrag when enhanced animations are disabled', () => {
    mockUiStore(false);
    renderCard();
    const card = screen.getByTestId('event-card');
    const whileDragAttr = card.getAttribute('data-whiledrag');
    expect(whileDragAttr).not.toBeNull();
    const parsed = JSON.parse(whileDragAttr!);
    expect(parsed.scale).toBe(1);
  });

  it('calls onDragEnd with snapX when snapX is provided', () => {
    const onDragEnd = vi.fn();
    const onDragEndNotify = vi.fn();
    const snapX = 320;
    renderCard({ snapX, onDragEnd, onDragEndNotify });
    const card = screen.getByTestId('event-card');

    fireEvent.mouseDown(card, { clientX: 150, clientY: 40 });
    fireEvent.mouseMove(card, { clientX: 200, clientY: 40 });
    fireEvent.mouseUp(card, { clientX: 200, clientY: 40 });

    expect(onDragEnd).toHaveBeenCalledWith('e1', snapX, 200, 40);
    expect(onDragEndNotify).toHaveBeenCalled();
  });

  it('calls onDragEnd with the raw release position when snapX is not provided', () => {
    const onDragEnd = vi.fn();
    renderCard({ onDragEnd });
    const card = screen.getByTestId('event-card');

    fireEvent.mouseDown(card, { clientX: 150, clientY: 40 });
    fireEvent.mouseMove(card, { clientX: 200, clientY: 40 });
    fireEvent.mouseUp(card, { clientX: 200, clientY: 40 });

    expect(onDragEnd).toHaveBeenCalledWith('e1', layout.x + 50, 200, 40);
  });

  it('forwards viewportState without rendering errors', () => {
    renderCard({ viewportState });
    expect(screen.getByTestId('event-card')).toBeInTheDocument();
  });

  it('renders associated location and characters in the tooltip content', () => {
    const event = makeEvent({
      title: '酒馆会面',
      dateValue: '2024-03-15 20:00',
      dateType: 'absolute',
      description: '<p>暗号对接</p>',
      locationId: 'loc-1',
      characterIds: ['c1'],
    });
    const characters: Character[] = [
      {
        id: 'c1',
        workspaceId: 'ws',
        name: '艾琳',
        aliases: [],
        avatar: null,
        description: '',
        appearance: '',
        backstory: '',
        goals: '',
        conflicts: '',
        arc: '',
        tags: [],
        color: '#B6D4F4',
        eventIds: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];
    const locationName = '梧桐酒馆';

    render(
      <TooltipProvider>
        <EventTooltipContent_
          event={event}
          timeRange={event.dateValue}
          duration={NO_DURATION}
          locationName={locationName}
          associatedCharacters={characters}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText('暗号对接')).toBeInTheDocument();
    expect(screen.getByText('梧桐酒馆')).toBeInTheDocument();
    expect(screen.getByText('艾琳')).toBeInTheDocument();
  });
});
