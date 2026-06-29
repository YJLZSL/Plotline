import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, useMotionValue, animate } from 'framer-motion';
import { Copy, Link2, MapPin, Pencil, Sparkles, Trash2 } from 'lucide-react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSection,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import { useAmbientAnimation } from '@/hooks/useAmbientAnimation';
import { useI18n } from '@/hooks/useI18n';
import { cn, stripHtml } from '@/lib/utils';
import { MOTION_LAYOUT } from '@/lib/motion';
import { useUIStore } from '@/stores/ui';
import { getScenePreset } from '@/lib/motionOrchestrator';
import { computeEventDragConstraints } from '@/features/timeline/timelineLayout';
import type { EventLayoutItem, ViewportState } from '@/features/timeline/timelineGrid';
import { formatEventDuration, formatEventTimeRange, NO_DURATION } from '@/lib/time';
import type { Character, Event, EventStatus, Track } from '@/types';

const EVENT_STATUS_STYLES: Record<
  EventStatus,
  { dot: string; border: string; labelKey: string }
> = {
  draft: { dot: 'bg-text-secondary/60', border: 'border-status-draft', labelKey: 'timeline.event.statusDraft' },
  done: { dot: 'bg-status-done', border: 'border-status-done', labelKey: 'timeline.event.statusDone' },
  revise: { dot: 'bg-status-revise', border: 'border-status-revise', labelKey: 'timeline.event.statusRevise' },
};

export interface EventCardProps {
  event: Event;
  track: Track;
  index: number;
  layout: EventLayoutItem;
  totalWidth: number;
  selected: boolean;
  pendingConnection: boolean;
  isConflict: boolean;
  isNew: boolean;
  isDragging: boolean;
  snapX?: number;
  viewportState?: ViewportState;
  characters?: Character[];
  locations?: { id: string; name: string; color?: string }[];
  height?: number;
  onSelect: (id: string) => void;
  onEdit: (ev: Event) => void;
  onDragEnd: (id: string, finalX: number, clientX: number, clientY: number) => void;
  onStartConnection: (id: string) => void;
  onDuplicate: (ev: Event) => void;
  onAskAi: (ev: Event) => void;
  onDelete: (id: string) => void;
  onChangeStatus: (id: string, status: EventStatus) => void;
  onDragStart: (id: string, clientX: number, clientY: number) => void;
  onDrag: (id: string, offsetX: number, clientX: number, clientY: number) => void;
  onDragEndNotify: () => void;
}

export const EventCard = memo(function EventCard({
  event,
  track,
  index,
  layout,
  totalWidth,
  selected,
  pendingConnection,
  isConflict,
  isNew,
  isDragging,
  snapX,
  viewportState: _viewportState,
  characters = [],
  locations = [],
  height = 64,
  onSelect,
  onEdit,
  onDragEnd,
  onStartConnection,
  onDuplicate,
  onAskAi,
  onDelete,
  onChangeStatus,
  onDragStart,
  onDrag,
  onDragEndNotify,
}: EventCardProps) {
  const { t, i18n } = useI18n();
  const ambient = useAmbientAnimation();
  const enhancedAnimations = useUIStore((s) => s.enhancedAnimations);
  const reducedMotion = useReducedMotion();
  const color = event.color ?? track.color;
  const status = EVENT_STATUS_STYLES[event.status];
  const isRelative = event.dateType !== 'absolute';
  const { x, y, width: cardWidth } = layout;

  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const [isSnapAnimating, setIsSnapAnimating] = useState(false);
  const [committedSnapX, setCommittedSnapX] = useState<number | null>(null);
  const dragX = useMotionValue(0);
  const dragStartLayoutXRef = useRef(x);

  // 当父级根据吸附后的时间重新计算 layout.x 时，复位 dragX，
  // 避免 transform 叠加导致卡片最终位置偏离吸附目标。
  const prevXRef = useRef(x);
  useLayoutEffect(() => {
    if (prevXRef.current !== x) {
      dragX.set(0);
      setCommittedSnapX(null);
      prevXRef.current = x;
    }
  }, [x, dragX]);

  const timeRange = useMemo(() => formatEventTimeRange(event, i18n.language), [event, i18n.language]);
  const duration = useMemo(() => formatEventDuration(event, i18n.language), [event, i18n.language]);
  const hasDuration = duration !== NO_DURATION;

  const associatedCharacters = useMemo(() => {
    const set = new Set(event.characterIds);
    return characters.filter((c) => set.has(c.id));
  }, [characters, event.characterIds]);

  const locationName = useMemo(() => {
    if (!event.locationId) return null;
    return locations.find((l) => l.id === event.locationId)?.name ?? null;
  }, [locations, event.locationId]);

  const dragConstraints = useMemo(
    () => computeEventDragConstraints(cardWidth, totalWidth, x),
    [cardWidth, totalWidth, x],
  );

  const preset = useMemo(
    () => getScenePreset('dragSnap', { enhanced: enhancedAnimations }),
    [enhancedAnimations],
  );
  const dragSnap = preset.dragSnap;

  const initial = isNew
    ? { opacity: 1, scale: 1.05, y: 0 }
    : { opacity: 0, scale: 0.9, y: 8 };
  const animateTo = { opacity: 1, scale: 1, y: 0 };
  const shouldAnimate = reducedMotion === false;
  const effectiveIsDragging = isDragging || isDraggingLocal || isSnapAnimating;
  const whileHover = ambient.animate && !effectiveIsDragging ? { scale: 1.02, y: -2 } : { y: -2 };
  const whileTap = enhancedAnimations ? { scale: 0.96 } : { scale: 0.98 };
  const whileDrag = shouldAnimate
    ? {
        scale: dragSnap?.lift.scale ?? 1.02,
        transition: {
          duration: dragSnap?.lift.duration ?? 0.12,
          ease: dragSnap?.lift.ease,
        },
      }
    : undefined;
  const transition = useMemo(
    () => ({ ...ambient.transition, delay: Math.min(index * 0.015, 0.1), layout: MOTION_LAYOUT }),
    [ambient.transition, index],
  );
  const shouldLayout = enhancedAnimations && !effectiveIsDragging && shouldAnimate;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          data-event-id={event.id}
          data-row={layout.row}
          data-layout-y={layout.y}
          data-layout-x={layout.x}
          data-dragging={effectiveIsDragging}
          data-selected={selected}
          data-testid="event-card"
          initial={initial}
          animate={animateTo}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={transition}
          layout={shouldLayout}
          drag="x"
          dragMomentum={false}
          dragElastic={0}
          dragConstraints={dragConstraints}
          whileDrag={whileDrag}
          onDragStart={(_, info) => {
            dragStartLayoutXRef.current = x;
            setIsDraggingLocal(true);
            onDragStart(event.id, info.point.x, info.point.y);
          }}
          onDrag={(_, info) => {
            onDrag(event.id, info.offset.x, info.point.x, info.point.y);
          }}
          onDragEnd={(e, info) => {
            const clientX = 'clientX' in e ? e.clientX : info.point.x;
            const clientY = 'clientY' in e ? e.clientY : info.point.y;

            if (snapX != null && dragSnap != null) {
              setIsSnapAnimating(true);
              animate(dragX, snapX - x, {
                duration: dragSnap.land.duration,
                ease: dragSnap.land.ease,
                onComplete: () => {
                  dragX.set(0);
                  setCommittedSnapX(snapX);
                  setIsSnapAnimating(false);
                  setIsDraggingLocal(false);
                  onDragEnd(event.id, snapX, clientX, clientY);
                  onDragEndNotify();
                },
              });
            } else {
              setIsDraggingLocal(false);
              onDragEnd(event.id, x + info.offset.x, clientX, clientY);
              onDragEndNotify();
            }
          }}
          onClick={() => onSelect(event.id)}
          onDoubleClick={() => onEdit(event)}
          whileHover={whileHover}
          whileTap={whileTap}
          className={cn(
            'absolute cursor-grab active:cursor-grabbing select-none active:scale-[0.98]',
            'rounded-[8px] overflow-hidden',
            'shadow-[var(--shadow-card)] transition-shadow',
            'border-2 backdrop-blur-sm bg-bg-surface',
            enhancedAnimations && 'ambient-scale',
            selected
              ? 'border-accent ring-2 ring-accent/30 shadow-[var(--shadow-elevated)]'
              : cn('border-border/60 hover:shadow-[var(--shadow-elevated)]', status.border),
            pendingConnection && 'border-accent animate-pulse',
            isConflict && 'ring-2 ring-red-500/50 border-red-400',
            effectiveIsDragging && 'z-50 cursor-grabbing shadow-[var(--shadow-elevated)]',
          )}
          style={{
            left: committedSnapX ?? x,
            top: y,
            width: cardWidth,
            height,
            x: dragX,
          }}
        >
          {/* 左侧轨道色条 */}
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />

          {isConflict && (
            <div
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 shadow-sm"
              title={t('timeline.conflictBadge')}
            />
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative z-10 px-3 py-2 flex flex-col justify-between h-full min-w-0 gap-1">
                {/* Zone 1: Header — 标题 + 状态点 + 连线手柄 */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    role="img"
                    className={cn('h-2 w-2 rounded-full flex-shrink-0', status.dot)}
                    aria-label={isRelative ? t('timeline.relativeBadge') : t(status.labelKey)}
                  />
                  <span className="text-sm font-medium text-text-primary truncate flex-1 min-w-0 leading-tight">
                    {event.title}
                  </span>
                  {/* 连线手柄 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartConnection(event.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-accent p-0.5 rounded transition-colors flex-shrink-0"
                    title={t('timeline.startConnection')}
                  >
                    <Link2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Zone 2: Body — 时间范围 + 持续时间 */}
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 min-w-0">
                  <span className="text-xs text-text-secondary tabular-nums leading-tight whitespace-normal break-words">
                    {timeRange}
                  </span>
                  {hasDuration && (
                    <span className="text-[10px] text-text-secondary/70 tabular-nums leading-tight">
                      {duration}
                    </span>
                  )}
                </div>

                {/* Zone 3: Footer — 地点 + 角色头像 */}
                {(locationName || associatedCharacters.length > 0) && (
                  <div className="flex items-center gap-2 min-w-0">
                    {locationName && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-text-secondary/70 min-w-0">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{locationName}</span>
                      </span>
                    )}
                    {associatedCharacters.length > 0 && (
                      <div
                        className="flex items-center -space-x-1 ml-auto"
                        aria-label={t('timeline.event.characters')}
                      >
                        {associatedCharacters.slice(0, 3).map((c) => (
                          <span
                            key={c.id}
                            className="h-4 w-4 rounded-full border border-bg-surface flex items-center justify-center text-[8px] font-medium text-white"
                            style={{ backgroundColor: c.color }}
                            title={c.name}
                          >
                            {c.name.charAt(0)}
                          </span>
                        ))}
                        {associatedCharacters.length > 3 && (
                          <span className="h-4 w-4 rounded-full border border-bg-surface bg-bg-elevated flex items-center justify-center text-[8px] font-medium text-text-secondary">
                            {t('timeline.event.moreCharacters', { count: associatedCharacters.length - 3 })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" sideOffset={6}>
              <EventTooltipContent_
                event={event}
                timeRange={timeRange}
                duration={duration}
                locationName={locationName}
                associatedCharacters={associatedCharacters}
              />
            </TooltipContent>
          </Tooltip>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onEdit(event)} className="gap-2">
          <Pencil className="h-3.5 w-3.5" />
          {t('contextMenu.edit')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicate(event)} className="gap-2">
          <Copy className="h-3.5 w-3.5" />
          {t('contextMenu.duplicate')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDelete(event.id)} className="gap-2 text-red-500 hover:text-red-500 hover:bg-red-500/10 focus-visible:ring-red-500/40">
          <Trash2 className="h-3.5 w-3.5" />
          {t('contextMenu.delete')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSection label={t('contextMenu.changeStatus')}>
          {(['draft', 'done', 'revise'] as const).map((s) => (
            <ContextMenuItem key={s} onClick={() => onChangeStatus(event.id, s)} className="gap-2">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', EVENT_STATUS_STYLES[s].dot)} />
              {t(EVENT_STATUS_STYLES[s].labelKey)}
            </ContextMenuItem>
          ))}
        </ContextMenuSection>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onStartConnection(event.id)} className="gap-2">
          <Link2 className="h-3.5 w-3.5" />
          {t('contextMenu.startConnection')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAskAi(event)} className="gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          {t('contextMenu.askAi')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

export function EventTooltipContent_({
  event,
  timeRange,
  duration,
  locationName,
  associatedCharacters,
}: {
  event: Event;
  timeRange: string;
  duration: string;
  locationName: string | null;
  associatedCharacters: Character[];
}) {
  const { t } = useI18n();
  const status = EVENT_STATUS_STYLES[event.status];
  const hasDuration = duration !== NO_DURATION;

  return (
    <div className="space-y-1.5 max-w-xs">
      <div className="font-medium text-text-primary">{event.title}</div>
      <div className="text-xs text-text-secondary tabular-nums">{timeRange}</div>
      {hasDuration && (
        <div className="text-xs text-text-secondary">
          {t('timeline.event.duration')}: {duration}
        </div>
      )}
      {event.description && (
        <div className="text-xs text-text-secondary line-clamp-4">
          {stripHtml(event.description)}
        </div>
      )}
      {locationName && (
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{locationName}</span>
        </div>
      )}
      {associatedCharacters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[10px] text-text-secondary/80">{t('timeline.event.characters')}:</span>
          {associatedCharacters.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-border bg-bg-elevated"
            >
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="truncate max-w-[80px]">{c.name}</span>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5 pt-0.5">
        <span className={cn('h-2 w-2 rounded-full', status.dot)} />
        <span className="text-xs text-text-secondary">{t(status.labelKey)}</span>
      </div>
    </div>
  );
}
