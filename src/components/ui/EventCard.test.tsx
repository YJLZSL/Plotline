import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { forwardRef, type ComponentProps } from 'react';
import type { Character, Event, Track } from '@/types';
import type { EventLayoutItem } from '@/features/timeline/timelineGrid';

import { EventCard, EventTooltipContent_ } from './EventCard';
import { TooltipProvider } from './Tooltip';



vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
}));

vi.mock('@/hooks/useAmbientAnimation', () => ({
  useAmbientAnimation: () => ({ transition: { duration: 0 }, animate: false, enabled: false, fancy: false }),
}));

vi.mock('@/stores/ui', () => ({
  useUIStore: vi.fn((selector?: (state: { enhancedAnimations: boolean }) => unknown) =>
    selector ? selector({ enhancedAnimations: false }) : { enhancedAnimations: false }),
}));

interface MotionDivProps extends React.HTMLAttributes<HTMLDivElement> {
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
  whileDrag?: unknown;
  whileHover?: unknown;
  whileTap?: unknown;
  'data-testid'?: string;
}

vi.mock('framer-motion', () => {
  const MockMotionDiv = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, style, 'data-testid': dataTestid, ...rest }, ref) => {
    const domProps = Object.fromEntries(
      Object.entries(rest).filter(
        ([k]) =>
          k.startsWith('data-') ||
          k === 'role' ||
          k.startsWith('on') ||
          ['id', 'aria-label', 'aria-hidden', 'aria-describedby', 'title'].includes(k),
      ),
    );
    return (
      <div
        ref={ref}
        className={className}
        style={style}
        data-testid={dataTestid}
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
    vi.restoreAllMocks();
  });

  it('renders title, time range, duration and status pill', () => {
    renderCard({ event: makeEvent({ title: '决战', dateValue: '2024-03-15 09:00 – 11:30', dateType: 'absolute', status: 'done' }) });

    expect(screen.getByText('决战')).toBeInTheDocument();
    expect(screen.getByText('2024-03-15 09:00 – 11:30')).toBeInTheDocument();
    expect(screen.getByText('(2 小时 30 分钟)')).toBeInTheDocument();
    expect(screen.getByText('timeline.event.statusDone')).toBeInTheDocument();
  });

  it('renders a relative badge with index for relative events', () => {
    renderCard({ event: makeEvent({ title: '序幕', dateValue: '', dateType: 'relative', sortOrder: 0 }) });

    expect(screen.getByText('序幕')).toBeInTheDocument();
    expect(screen.getByText('timeline.relativeBadge')).toBeInTheDocument();
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
          displayTime={event.dateValue}
          duration={null}
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
