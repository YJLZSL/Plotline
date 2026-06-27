import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import {
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  ZoomIn,
  ZoomOut,
  Link2,
  ShieldCheck,
  GanttChart as GanttIcon,
  CalendarRange,
  CalendarDays,
  Bookmark,
  Network,
  List,
  Image as ImageIcon,
  X,
  Copy,
  ClipboardPaste,
  Sparkles,
  Filter,
  Search,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import { GanttChart } from './GanttChart';
import { TreeTimeline } from './TreeTimeline';
import { TextTimeline } from './TextTimeline';
import { createTimeScale, type ZoomLevel, type TimeScale } from '@/features/timeline/timeScale';

import {
  Button,
  EmptyState,
  Input,
  Textarea,
  Label,
  ConfirmDialog,
  Dialog,
  DialogContent,
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSection,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { useAmbientAnimation } from '@/hooks/useAmbientAnimation';
import { cn } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import type { Character, Event, EventConnection, EventStatus, Track } from '@/types';
import {
  useCreateEvent,
  useCreateTrack,
  useDeleteEvent,
  useDeleteTrack,
  useEventsQuery,
  useTracksQuery,
  useUpdateEvent,
  useUpdateTrack,
  useConnectEvents,
  useDisconnectEvents,
  useEventConnectionsQuery,
} from '@/features/timeline/hooks';
import { useCharactersQuery } from '@/features/characters/hooks';
import { useLocationsQuery } from '@/features/map/hooks';
import { checkConsistency, uploadEventImage } from '@/features/timeline/eventApi';
import { useTimelineFilters, filterEvents } from '@/features/timeline/useTimelineFilters';
import { clampTodayLabelX, computeAddButtonLeft, computeEventDragConstraints, clampTimelineScroll } from '@/features/timeline/timelineLayout';
import { TimelineEmptyIllustration } from '@/features/timeline/TimelineEmptyIllustration';
import { AiToolbarButton } from '@/features/ai/components/AiToolbarButton';
import { useAiContextStore } from '@/stores/aiContext';
import { useUIStore } from '@/stores/ui';
import { toastError, toastInfo, toastWarning } from '@/stores/toast';
import { isTauri } from '@/lib/ipc';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import * as Popover from '@radix-ui/react-popover';

// ===== 常量 =====
const TRACK_HEIGHT = 92;
const TRACK_COLLAPSED_HEIGHT = 24;
const TRACK_GAP = 6;
const EVENT_MIN_WIDTH = 220;
const ADD_EVENT_BUTTON_WIDTH = 64;
const EVENT_HEIGHT = 64;
const RULER_HEIGHT = 44;
const LEFT_PADDING = 24;
const DAY_MS = 24 * 3600 * 1000;
const ZOOM_LEVELS = ['hour', 'day', 'month', 'year'] as const;
const EVENT_COLOR_PALETTE = ['#F4B6C2', '#B6D4F4', '#B6F4C8', '#F4E4B6', '#D8B6F4', '#F4CBB6'];

// 每个缩放级别下，单位宽度（像素 / 单位）
const ZOOM_UNIT_WIDTH: Record<ZoomLevel, number> = {
  hour: 60,
  day: 90,
  month: 140,
  year: 220,
};

// 每个缩放级别的主刻度单位（用于标尺）
const ZOOM_RULER_FORMAT: Record<ZoomLevel, Intl.DateTimeFormatOptions> = {
  hour: { hour: '2-digit', minute: '2-digit' },
  day: { month: 'short', day: 'numeric' },
  month: { year: 'numeric', month: 'short' },
  year: { year: 'numeric' },
};

interface TimelineViewProps {
  workspaceId: string;
  workspaceName?: string;
}

export function TimelineView({ workspaceId, workspaceName }: TimelineViewProps) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const { data: tracks = [] } = useTracksQuery(workspaceId);
  const { data: events = [] } = useEventsQuery(workspaceId);
  const { data: characters = [] } = useCharactersQuery(workspaceId);
  const { data: locations = [] } = useLocationsQuery(workspaceId);
  const createTrack = useCreateTrack(workspaceId);
  const updateTrack = useUpdateTrack(workspaceId);
  const deleteTrack = useDeleteTrack(workspaceId);
  const createEvent = useCreateEvent(workspaceId);
  const updateEvent = useUpdateEvent(workspaceId);
  const deleteEvent = useDeleteEvent(workspaceId);

  const {
    filters,
    hasActiveFilters,
    toggleCharacter,
    toggleLocation,
    toggleStatus,
    setSearchQuery,
    toggleTrackCollapse,
    collapseAllTracks,
    expandAllTracks,
    clearFilters,
    isCollapsed,
  } = useTimelineFilters(workspaceId);

  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [deleteTrackTarget, setDeleteTrackTarget] = useState<Track | null>(null);
  const [newTrackName, setNewTrackName] = useState('');
  const [showConnections, setShowConnections] = useState(true);
  const [checkingConsistency, setCheckingConsistency] = useState(false);
  const [conflictEventIds, setConflictEventIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'gantt' | 'tree' | 'text'>('timeline');
  const [connectionType, setConnectionType] = useState<'causal' | 'foreshadow'>('causal');
  const [copiedEvent, setCopiedEvent] = useState<Event | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const eventElementRegistry = useRef(new Map<string, HTMLElement>());
  const [draggingEvent, setDraggingEvent] = useState<{ id: string; offsetX: number } | null>(null);
  const connectEvents = useConnectEvents(workspaceId);
  const disconnectEvents = useDisconnectEvents(workspaceId);
  const { data: eventConnections = [] } = useEventConnectionsQuery(workspaceId);
  const setAiContext = useAiContextStore((s) => s.setContext);
  const setAiPanelOpen = useUIStore((s) => s.setAiPanelOpen);

  useEffect(() => {
    const el = canvasRef.current;
    if (el) {
      setViewportWidth(el.clientWidth);
      setScrollLeft(el.scrollLeft);
    }
    const onResize = () => {
      if (el) setViewportWidth(el.clientWidth);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
    setAiContext({
      view: 'timeline',
      viewLabel: t('timeline.title'),
      selection: selectedEvent
        ? {
            type: 'event',
            id: selectedEvent.id,
            label: selectedEvent.title,
            content: selectedEvent.description ?? '',
          }
        : null,
      suggestions: [
        { label: t('ai.suggestTimelinePacing'), prompt: t('ai.promptTimelinePacing') },
        { label: t('ai.suggestTimelineGaps'), prompt: t('ai.promptTimelineGaps') },
        { label: t('ai.suggestNextEvent'), prompt: t('ai.promptNextEvent') },
      ],
    });
  }, [t, events, selectedEventId, setAiContext]);

  const handleConsistencyCheck = async () => {
    setCheckingConsistency(true);
    try {
      const conflicts = await checkConsistency(workspaceId);
      const ids = new Set<string>();
      for (const c of conflicts) {
        for (const id of c.eventIds) {
          ids.add(id);
        }
      }
      setConflictEventIds(ids);
      if (conflicts.length === 0) {
        toastInfo(t('timeline.consistencyClean'));
      } else {
        toastWarning(t('timeline.consistencyConflicts', { count: conflicts.length }));
      }
    } catch (err) {
      toastError(err);
    } finally {
      setCheckingConsistency(false);
    }
  };
  const [pendingConnection, setPendingConnection] = useState<string | null>(null);

  const visibleTracks = tracks.filter((tr) => tr.isVisible);

  const filteredEvents = useMemo(
    () => filterEvents(events, filters),
    [events, filters],
  );

  // 计算时间轴范围：找出所有绝对日期事件的最早/最晚时间
  const timeScale = useMemo(() => {
    const absoluteEvents = filteredEvents.filter((e) => e.dateType === 'absolute' && e.dateValue);
    let minTime = Date.now();
    let maxTime = Date.now() + 365 * DAY_MS;
    if (absoluteEvents.length > 0) {
      const times = absoluteEvents.map((e) => new Date(e.dateValue).getTime()).filter((n) => !Number.isNaN(n));
      if (times.length > 0) {
        minTime = Math.min(...times);
        maxTime = Math.max(...times);
        // 留一些边距
        const span = maxTime - minTime || 365 * DAY_MS;
        minTime -= span * 0.1;
        maxTime += span * 0.15;
      }
    }
    return createTimeScale(minTime, maxTime, zoom, LEFT_PADDING, ZOOM_UNIT_WIDTH[zoom]);
  }, [filteredEvents, zoom]);

  const totalWidth = useMemo(
    () => Math.max(800, timeScale.timeToX(timeScale.max) + LEFT_PADDING + EVENT_MIN_WIDTH),
    [timeScale],
  );

  const timelineMinHeight = useMemo(
    () => visibleTracks.reduce((sum, tr) => sum + (isCollapsed(tr.id) ? TRACK_COLLAPSED_HEIGHT : TRACK_HEIGHT) + TRACK_GAP, RULER_HEIGHT),
    [visibleTracks, isCollapsed],
  );

  // 事件内部时间位置：绝对事件用真实时间戳，相对事件用基于 min 的伪时间戳
  const eventPositions = useMemo(() => {
    const positions = new Map<string, number>();
    filteredEvents.forEach((ev) => {
      if (ev.dateType === 'absolute' && ev.dateValue) {
        const t = new Date(ev.dateValue).getTime();
        if (!Number.isNaN(t)) {
          positions.set(ev.id, t);
        }
      }
    });
    const relativeEvents = filteredEvents
      .filter((e) => e.dateType !== 'absolute' || !positions.has(e.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const unitMs = timeScale.getMsPerUnit();
    const fallbackStart = timeScale.min;
    relativeEvents.forEach((ev, i) => {
      positions.set(ev.id, fallbackStart + i * unitMs * 2);
    });
    return positions;
  }, [filteredEvents, timeScale]);

  const eventsByTrack = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const tr of tracks) map.set(tr.id, []);
    for (const ev of filteredEvents) {
      const arr = map.get(ev.trackId);
      if (arr) arr.push(ev);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    return map;
  }, [tracks, filteredEvents]);

  const handleAddTrack = async () => {
    if (!newTrackName.trim()) return;
    await createTrack.mutateAsync({ workspaceId, name: newTrackName.trim() });
    setNewTrackName('');
  };

  const handleAddEvent = async (trackId: string) => {
    const ev = await createEvent.mutateAsync({
      workspaceId,
      trackId,
      title: '新事件',
      dateType: 'relative',
      dateValue: '',
      sortOrder: (eventsByTrack.get(trackId)?.length ?? 0),
    });
    setEditingEvent(ev);
    setEventDialogOpen(true);
    setSelectedEventId(ev.id);
  };

  const handleCanvasDoubleClick = async (trackId: string, x: number) => {
    const time = timeScale.xToTime(x);
    const ev = await createEvent.mutateAsync({
      workspaceId,
      trackId,
      title: '新事件',
      dateType: 'absolute',
      dateValue: new Date(time).toISOString().slice(0, 10),
      sortOrder: (eventsByTrack.get(trackId)?.length ?? 0),
    });
    setEditingEvent(ev);
    setEventDialogOpen(true);
    setSelectedEventId(ev.id);
  };

  const handleEventDragEnd = async (ev: Event, track: Track, _info: PanInfo, finalX: number) => {
    if (ev.dateType === 'absolute') {
      const newTime = timeScale.xToTime(finalX);
      await updateEvent.mutateAsync({
        id: ev.id,
        dateType: 'absolute',
        dateValue: new Date(newTime).toISOString().slice(0, 10),
        trackId: track.id,
      });
    } else {
      const trackEvents = eventsByTrack.get(track.id) ?? [];
      const newSort = computeNewSortOrder(ev, finalX, trackEvents, eventPositions, timeScale);
      if (newSort !== ev.sortOrder) {
        await updateEvent.mutateAsync({
          id: ev.id,
          sortOrder: newSort,
          trackId: track.id,
        });
      }
    }
  };

  const handleSaveEvent = async (data: Partial<Event> & { title: string; characterIds: string[]; imageUrls: string[] }) => {
    if (!editingEvent) return;
    await updateEvent.mutateAsync({
      id: editingEvent.id,
      title: data.title,
      description: data.description,
      dateType: data.dateType,
      dateValue: data.dateValue,
      status: data.status,
      color: data.color,
      trackId: data.trackId,
      characterIds: data.characterIds,
      imageUrls: data.imageUrls,
    });
    setEventDialogOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = useCallback(
    async (id: string) => {
      await deleteEvent.mutateAsync(id);
      if (selectedEventId === id) setSelectedEventId(null);
      setEventDialogOpen(false);
      setEditingEvent(null);
    },
    [deleteEvent, selectedEventId],
  );

  const duplicateEvent = useCallback(
    async (ev: Event, targetTrackId?: string) => {
      const trackId = targetTrackId ?? ev.trackId;
      const newEv = await createEvent.mutateAsync({
        workspaceId,
        trackId,
        title: ev.title,
        description: ev.description,
        dateType: ev.dateType,
        dateValue: ev.dateValue,
        status: ev.status,
        color: ev.color,
        sortOrder: eventsByTrack.get(trackId)?.length ?? 0,
      });
      setCopiedEvent(ev);
      setSelectedEventId(newEv.id);
    },
    [createEvent, eventsByTrack, workspaceId],
  );

  const pasteEvent = useCallback(
    async (trackId: string) => {
      if (!copiedEvent) return;
      await duplicateEvent(copiedEvent, trackId);
    },
    [copiedEvent, duplicateEvent],
  );

  const openAiForEvent = useCallback(
    (ev: Event) => {
      setSelectedEventId(ev.id);
      setEditingEvent(ev);
      setAiContext({
        view: 'timeline',
        viewLabel: t('timeline.title'),
        selection: {
          type: 'event',
          id: ev.id,
          label: ev.title,
          content: ev.description ?? '',
        },
        suggestions: [
          { label: t('ai.suggestTimelinePacing'), prompt: t('ai.promptTimelinePacing') },
          { label: t('ai.suggestTimelineGaps'), prompt: t('ai.promptTimelineGaps') },
          { label: t('ai.suggestNextEvent'), prompt: t('ai.promptNextEvent') },
        ],
      });
      setAiPanelOpen(true);
    },
    [setAiContext, setAiPanelOpen, t],
  );

  const cycleZoom = (dir: 1 | -1) => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    const next = ZOOM_LEVELS[(idx + dir + ZOOM_LEVELS.length) % ZOOM_LEVELS.length];
    if (next) setZoom(next);
  };

  // 键盘删除选中事件
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEventId && !eventDialogOpen) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        void handleDeleteEvent(selectedEventId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedEventId, eventDialogOpen, handleDeleteEvent]);

  return (
    <>
      <Toolbar
        title={t('timeline.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <div className="flex items-center gap-1">
            <div className="flex bg-bg-elevated rounded-[6px] p-0.5 mr-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
                  viewMode === 'timeline'
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={t('timeline.title')}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('timeline.title')}</span>
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
                  viewMode === 'gantt'
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={t('gantt.title')}
              >
                <GanttIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('gantt.title')}</span>
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
                  viewMode === 'tree'
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={t('timeline.treeMode')}
              >
                <Network className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('timeline.treeMode')}</span>
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
                  viewMode === 'text'
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={t('timeline.textMode')}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('timeline.textMode')}</span>
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => cycleZoom(-1)} title={t('timeline.zoom')}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-text-secondary min-w-[40px] text-center">
              {t(`timeline.${zoom}`)}
            </span>
            <Button variant="ghost" size="sm" onClick={() => cycleZoom(1)} title={t('timeline.zoom')}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant={showConnections ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowConnections((v) => !v)}
              className="gap-1.5"
              title="切换连线显示"
            >
              <Link2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConnectionType((t) => (t === 'causal' ? 'foreshadow' : 'causal'))}
              className="gap-1.5 text-[11px]"
              title={`${t('timeline.connectionType')}: ${connectionType === 'causal' ? t('timeline.connectionTypeCausal') : t('timeline.connectionTypeForeshadow')}`}
            >
              {connectionType === 'causal' ? t('timeline.connectionTypeCausal') : t('timeline.connectionTypeForeshadow')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={checkingConsistency}
              onClick={handleConsistencyCheck}
              className="gap-1.5"
              title={t('timeline.consistencyCheck')}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <AiToolbarButton
              view="timeline"
              viewLabel={t('timeline.title')}
              selection={
                selectedEventId
                  ? (() => {
                      const ev = events.find((e) => e.id === selectedEventId);
                      return ev
                        ? { type: 'event', id: ev.id, label: ev.title, content: ev.description ?? '' }
                        : null;
                    })()
                  : null
              }
              suggestions={[
                { label: t('ai.suggestTimelinePacing'), prompt: t('ai.promptTimelinePacing') },
                { label: t('ai.suggestTimelineGaps'), prompt: t('ai.promptTimelineGaps') },
                { label: t('ai.suggestNextEvent'), prompt: t('ai.promptNextEvent') },
              ]}
            />
          </div>
        }
      />

      {viewMode === 'timeline' && (
        <FilterBar
          characters={characters}
          locations={locations}
          selectedCharacterIds={filters.selectedCharacterIds}
          selectedLocationIds={filters.selectedLocationIds}
          selectedStatuses={filters.selectedStatuses}
          searchQuery={filters.searchQuery}
          hasActiveFilters={hasActiveFilters}
          allCollapsed={visibleTracks.length > 0 && visibleTracks.every((t) => isCollapsed(t.id))}
          onToggleCharacter={toggleCharacter}
          onToggleLocation={toggleLocation}
          onToggleStatus={toggleStatus}
          onSearchChange={setSearchQuery}
          onClearFilters={clearFilters}
          onCollapseAll={() => collapseAllTracks(visibleTracks.map((t) => t.id))}
          onExpandAll={expandAllTracks}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
          transition={reducedMotion ? { duration: 0 } : MOTION_BASE}
          className="flex flex-1 min-h-0 overflow-hidden will-change-transform"
        >
          {viewMode === 'gantt' ? (
        <GanttChart
          tracks={tracks}
          events={events}
          timeScale={timeScale}
          selectedEventId={selectedEventId}
          onSelectEvent={(id) => {
            setSelectedEventId(id);
            const ev = events.find((e) => e.id === id) ?? null;
            setEditingEvent(ev);
          }}
          onEditEvent={(ev) => {
            setEditingEvent(ev);
            setEventDialogOpen(true);
          }}
          onAddEvent={(trackId) => void handleAddEvent(trackId)}
        />
      ) : viewMode === 'tree' ? (
        <TreeTimeline
          tracks={tracks}
          events={events}
          eventConnections={eventConnections}
          selectedEventId={selectedEventId}
          onSelectEvent={(id) => {
            setSelectedEventId(id);
            const ev = events.find((e) => e.id === id) ?? null;
            setEditingEvent(ev);
          }}
          onEditEvent={(ev) => {
            setEditingEvent(ev);
            setEventDialogOpen(true);
          }}
        />
      ) : viewMode === 'text' ? (
        <TextTimeline
          tracks={tracks}
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={(id) => {
            setSelectedEventId(id);
            const ev = events.find((e) => e.id === id) ?? null;
            setEditingEvent(ev);
          }}
          onEditEvent={(ev) => {
            setEditingEvent(ev);
            setEventDialogOpen(true);
          }}
          onAddEvent={(trackId) => void handleAddEvent(trackId)}
          onUpdateEvent={(id, patch) => void updateEvent.mutateAsync({ id, ...patch })}
        />
      ) : (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 轨道面板 */}
        <aside className="w-56 flex-shrink-0 border-r border-border bg-bg-surface flex flex-col">
          <div className="h-11 px-3 flex items-center justify-between border-b border-border">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t('timeline.tracks')}
            </span>
            <button
              onClick={() => {
                setEditingTrack(null);
                setTrackDialogOpen(true);
              }}
              className="text-text-secondary hover:text-accent p-1 rounded transition-colors"
              title={t('timeline.addTrack')}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {tracks.map((tr) => (
              <TrackRow
                key={tr.id}
                track={tr}
                eventCount={eventsByTrack.get(tr.id)?.length ?? 0}
                collapsed={isCollapsed(tr.id)}
                onToggleVisible={() => updateTrack.mutateAsync({ id: tr.id, isVisible: !tr.isVisible })}
                onRename={() => {
                  setEditingTrack(tr);
                  setTrackDialogOpen(true);
                }}
                onDelete={() => setDeleteTrackTarget(tr)}
                onChangeColor={(color) => updateTrack.mutateAsync({ id: tr.id, color })}
                onAddEvent={() => void handleAddEvent(tr.id)}
                onToggleCollapse={() => toggleTrackCollapse(tr.id)}
              />
            ))}
            <div className="px-3 mt-2">
              <Input
                value={newTrackName}
                onChange={(e) => setNewTrackName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleAddTrack();
                }}
                placeholder={t('timeline.addTrack')}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </aside>

        {/* 画布区域 */}
        <div
          ref={canvasRef}
          data-testid="timeline-canvas"
          className="flex-1 overflow-auto bg-bg-base relative"
          onWheel={(e) => {
            const el = e.currentTarget;
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              cycleZoom(e.deltaY > 0 ? 1 : -1);
            } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.preventDefault();
              el.scrollLeft += e.deltaY * 0.8;
              el.scrollLeft = clampTimelineScroll(el.scrollLeft, el.scrollWidth - el.clientWidth);
            }
          }}
          onScroll={(e) => {
            const el = e.currentTarget;
            const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
            const clamped = clampTimelineScroll(el.scrollLeft, maxScroll);
            if (clamped !== el.scrollLeft) {
              el.scrollLeft = clamped;
            }
            setScrollLeft(clamped);
            setViewportWidth(el.clientWidth);
          }}
        >
          {visibleTracks.length === 0 ? (
            <EmptyState
              icon={<TimelineEmptyIllustration className="h-20 w-auto text-text-secondary" />}
              title={t('timeline.title')}
              description={t('timeline.emptyTrack')}
              action={
                <Button
                  onClick={() => {
                    setEditingTrack(null);
                    setTrackDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {t('timeline.addTrack')}
                </Button>
              }
            />
          ) : (
            <div style={{ minWidth: totalWidth, minHeight: timelineMinHeight }}>
              {hasActiveFilters && filteredEvents.length === 0 ? (
                <div className="flex items-center justify-center" style={{ minWidth: totalWidth, minHeight: timelineMinHeight }}>
                  <EmptyState
                    icon={<Search className="h-10 w-10" />}
                    title={t('timeline.noMatchingEventsTitle')}
                    description={t('timeline.noMatchingEventsDescription')}
                    action={
                      <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5">
                        <X className="h-3.5 w-3.5" />
                        {t('timeline.clearFilters')}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <>
                  {/* 日期标尺 */}
                  <DateRuler
                    timeScale={timeScale}
                    totalWidth={totalWidth}
                  />

                  {/* 连线层（SVG，覆盖在轨道上） */}
                  {showConnections && filteredEvents.length > 1 && (
                  <ConnectionLayer
                    events={filteredEvents}
                    tracks={visibleTracks}
                    collapsedTrackIds={filters.collapsedTrackIds}
                    eventPositions={eventPositions}
                    timeScale={timeScale}
                    scrollLeft={scrollLeft}
                    viewportWidth={viewportWidth}
                    pendingConnection={pendingConnection}
                    selectedEventId={selectedEventId}
                    eventConnections={eventConnections}
                    eventElements={eventElementRegistry.current}
                    draggingEvent={draggingEvent}
                    onDisconnect={(sourceId, targetId) => void disconnectEvents.mutateAsync({ sourceId, targetId })}
                  />
                  )}

                  {/* 轨道 */}
                  {visibleTracks.map((tr, idx) => (
                <TrackLane
                  key={tr.id}
                  index={idx}
                  track={tr}
                  tracks={tracks}
                  collapsed={isCollapsed(tr.id)}
                  events={eventsByTrack.get(tr.id) ?? []}
                  eventPositions={eventPositions}
                  timeScale={timeScale}
                  totalWidth={totalWidth}
                  zoom={zoom}
                  scrollLeft={scrollLeft}
                  viewportWidth={viewportWidth}
                  selectedEventId={selectedEventId}
                  pendingConnection={pendingConnection}
                  conflictEventIds={conflictEventIds}
                  eventElementRegistry={eventElementRegistry}
                  copiedEvent={copiedEvent}
                  onSelectEvent={(id) => {
                    if (pendingConnection && pendingConnection !== id) {
                      void connectEvents.mutateAsync({
                        sourceId: pendingConnection,
                        targetId: id,
                        connectionType: connectionType,
                      });
                      setPendingConnection(null);
                    } else {
                      setSelectedEventId(id);
                      const ev = events.find((e) => e.id === id) ?? null;
                      setEditingEvent(ev);
                    }
                  }}
                  onEditEvent={(ev) => {
                    setEditingEvent(ev);
                    setEventDialogOpen(true);
                  }}
                  onAddEvent={() => void handleAddEvent(tr.id)}
                  onAddEventToTrack={(trackId) => void handleAddEvent(trackId)}
                  onPasteEvent={() => void pasteEvent(tr.id)}
                  onCanvasDoubleClick={(x) => void handleCanvasDoubleClick(tr.id, x)}
                  onEventDragEnd={handleEventDragEnd}
                  onDuplicateEvent={(ev) => void duplicateEvent(ev)}
                  onAskAiEvent={(ev) => openAiForEvent(ev)}
                  onZoomIn={() => cycleZoom(1)}
                  onZoomOut={() => cycleZoom(-1)}
                  onCheckConsistency={() => void handleConsistencyCheck()}
                  onDeleteEvent={(id) => void handleDeleteEvent(id)}
                  onUpdateEventStatus={(id, status) => void updateEvent.mutateAsync({ id, status })}
                  onStartConnection={(id) => setPendingConnection(id)}
                  onDragStart={(id) => setDraggingEvent({ id, offsetX: 0 })}
                  onDrag={(id, offsetX) => setDraggingEvent({ id, offsetX })}
                  onDragEndNotify={() => setDraggingEvent(null)}
                  onToggleCollapse={() => toggleTrackCollapse(tr.id)}
                />
              ))}
                </>
              )}
            </div>
          )}

          {/* 连线模式提示 */}
          {pendingConnection && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-accent text-white px-4 py-2 rounded-[8px] shadow-[var(--shadow-elevated)] text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              <span>{t('timeline.connectionHint', { type: connectionType === 'causal' ? t('timeline.connectionTypeCausal') : t('timeline.connectionTypeForeshadow') })}</span>
              <button
                onClick={() => setPendingConnection(null)}
                className="underline hover:no-underline"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
      )}
        </motion.div>
      </AnimatePresence>

      <EventEditDialog
        open={eventDialogOpen}
        onOpenChange={(v) => {
          setEventDialogOpen(v);
          if (!v) setEditingEvent(null);
        }}
        event={editingEvent}
        isConflict={!!editingEvent && conflictEventIds.has(editingEvent.id)}
        tracks={tracks}
        characters={characters}
        locations={locations}
        workspaceId={workspaceId}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      <TrackEditDialog
        open={trackDialogOpen}
        onOpenChange={setTrackDialogOpen}
        track={editingTrack}
        onSave={async (data) => {
          if (editingTrack) {
            await updateTrack.mutateAsync({ id: editingTrack.id, ...data });
          } else if (data.name?.trim()) {
            await createTrack.mutateAsync({ workspaceId, name: data.name.trim(), color: data.color });
          }
          setTrackDialogOpen(false);
          setEditingTrack(null);
          setNewTrackName('');
        }}
      />

      <ConfirmDialog
        open={deleteTrackTarget !== null}
        onOpenChange={(v) => !v && setDeleteTrackTarget(null)}
        title={t('timeline.deleteTrack')}
        description={t('timeline.deleteTrackConfirm', { name: deleteTrackTarget?.name ?? '' })}
        destructive
        confirmText={t('common.delete')}
        onConfirm={() => {
          if (deleteTrackTarget) void deleteTrack.mutateAsync(deleteTrackTarget.id);
        }}
      />
    </>
  );
}

// ===== 日期标尺 =====
function DateRuler({
  timeScale,
  totalWidth,
}: {
  timeScale: TimeScale;
  totalWidth: number;
}) {
  const { min, max, zoom } = timeScale;
  const { t, i18n } = useI18n();
  const [hovered, setHovered] = useState<{ x: number; label: string } | null>(null);

  const { majorTicks, minorTicks, todayX } = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US', {
      ...ZOOM_RULER_FORMAT[zoom],
    });
    const { major, minor } = timeScale.getTicks();
    const majors = major.map((time) => ({ time, label: fmt.format(new Date(time)) }));
    const minors = minor.map((time) => ({ time }));

    const now = Date.now();
    const today = now >= min && now <= max ? timeScale.timeToX(now) : null;
    return { majorTicks: majors, minorTicks: minors, todayX: today };
  }, [min, max, zoom, timeScale, i18n.language]);

  return (
    <div
      className="sticky top-0 z-10 bg-bg-surface border-b border-border"
      style={{ height: RULER_HEIGHT, minWidth: totalWidth }}
      onMouseLeave={() => setHovered(null)}
    >
      <div className="relative h-full">
        {/* 次刻度 */}
        {minorTicks.map((tick, i) => {
          const x = timeScale.timeToX(tick.time);
          if (x < 0 || x > totalWidth) return null;
          return (
            <div
              key={`m-${i}`}
              className="absolute top-0 bottom-0 border-l border-border/20 pointer-events-none"
              style={{ left: x }}
            />
          );
        })}

        {/* 主刻度 */}
        {majorTicks.map((tick, i) => {
          const x = timeScale.timeToX(tick.time);
          if (x < 0 || x > totalWidth) return null;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-border/50 cursor-crosshair"
              style={{ left: x }}
              onMouseEnter={() =>
                setHovered({
                  x,
                  label: new Intl.DateTimeFormat(
                    i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
                  ).format(new Date(tick.time)),
                })
              }
            >
              <span className="absolute top-2 left-1.5 text-[10px] text-text-secondary font-semibold whitespace-nowrap">
                {tick.label}
              </span>
              <span className="absolute bottom-0 left-0 h-2.5 w-px bg-accent/60" />
            </div>
          );
        })}

        {/* 今天参考线 */}
        {todayX !== null && todayX >= 0 && todayX <= totalWidth && (
          <div
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{ left: todayX }}
          >
            <div className="h-full w-px bg-red-500/60" />
            <span
              className="absolute top-1 left-0 text-[9px] font-bold text-red-500 bg-bg-surface px-1 rounded whitespace-nowrap"
              style={{ left: clampTodayLabelX(todayX, totalWidth) - todayX }}
              data-testid="today-marker-label"
            >
              {t('timeline.today')}
            </span>
          </div>
        )}

        {/* hover tooltip */}
        {hovered && (
          <div
            className="absolute top-7 z-30 px-2 py-1 rounded-[5px] bg-bg-elevated border border-border shadow-[var(--shadow-card)] text-[10px] text-text-primary pointer-events-none whitespace-nowrap"
            style={{ left: hovered.x }}
          >
            {hovered.label}
          </div>
        )}
      </div>
    </div>
  );
}

interface MeasuredRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  midY: number;
}

function measureEventRect(el: HTMLElement, container: HTMLElement): MeasuredRect | null {
  const rect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const left = rect.left - containerRect.left;
  const top = rect.top - containerRect.top;
  return {
    left,
    right: left + rect.width,
    top,
    bottom: top + rect.height,
    midY: top + rect.height / 2,
  };
}

// ===== 连线层（SVG，基于 DOM 测量） =====
function ConnectionLayer({
  events,
  tracks,
  collapsedTrackIds,
  eventPositions,
  timeScale,
  scrollLeft,
  viewportWidth,
  pendingConnection,
  selectedEventId,
  eventConnections,
  eventElements,
  draggingEvent,
  onDisconnect,
}: {
  events: Event[];
  tracks: Track[];
  collapsedTrackIds: string[];
  eventPositions: Map<string, number>;
  timeScale: TimeScale;
  scrollLeft: number;
  viewportWidth: number;
  pendingConnection: string | null;
  selectedEventId: string | null;
  eventConnections: EventConnection[];
  eventElements: Map<string, HTMLElement>;
  draggingEvent: { id: string; offsetX: number } | null;
  onDisconnect: (sourceId: string, targetId: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [measuredRects, setMeasuredRects] = useState<Map<string, MeasuredRect>>(new Map());

  // Find the scrolling canvas container from the SVG root parent
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svgRef.current) {
      canvasRef.current = svgRef.current.closest('.overflow-auto') as HTMLDivElement | null;
    }
  }, []);

  // Re-measure on scroll, resize, data or dragging changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const measure = () => {
      const next = new Map<string, MeasuredRect>();
      for (const [id, el] of eventElements.entries()) {
        const rect = measureEventRect(el, canvas);
        if (rect) next.set(id, rect);
      }
      setMeasuredRects(next);
    };

    measure();
    const rafId = requestAnimationFrame(measure);

    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    canvas.addEventListener('scroll', measure, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('scroll', measure);
    };
  }, [eventElements, events, tracks, scrollLeft, viewportWidth, draggingEvent]);

  const buffer = EVENT_MIN_WIDTH * 2;
  const visibleMin = scrollLeft - buffer;
  const visibleMax = scrollLeft + viewportWidth + buffer;

  const trackTopByIndex = useMemo(() => {
    const map = new Map<number, number>();
    let top = RULER_HEIGHT;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (!track) continue;
      map.set(i, top);
      const height = collapsedTrackIds.includes(track.id) ? TRACK_COLLAPSED_HEIGHT : TRACK_HEIGHT;
      top += height + TRACK_GAP;
    }
    return map;
  }, [tracks, collapsedTrackIds]);

  const eventPoints = useMemo(() => {
    const map = new Map<string, { source: { x: number; y: number }; target: { x: number; y: number } }>();
    for (const ev of events) {
      const rect = measuredRects.get(ev.id);
      const trackIndex = tracks.findIndex((t) => t.id === ev.trackId);
      const trackTop = trackTopByIndex.get(trackIndex) ?? RULER_HEIGHT;
      let sourceX: number;
      let targetX: number;
      let y: number;

      if (rect) {
        sourceX = rect.right;
        targetX = rect.left;
        y = rect.midY;
        if (draggingEvent?.id === ev.id) {
          sourceX += draggingEvent.offsetX;
          targetX += draggingEvent.offsetX;
        }
      } else {
        // Fallback to timeScale-based approximation while measuring
        const cx = timeScale.timeToX(eventPositions.get(ev.id) ?? 0);
        sourceX = cx + EVENT_MIN_WIDTH / 2;
        targetX = cx - EVENT_MIN_WIDTH / 2;
        const height = collapsedTrackIds.includes(ev.trackId) ? TRACK_COLLAPSED_HEIGHT : TRACK_HEIGHT;
        y = trackTop + height / 2;
      }
      map.set(ev.id, { source: { x: sourceX, y }, target: { x: targetX, y } });
    }
    return map;
  }, [events, measuredRects, draggingEvent, tracks, collapsedTrackIds, timeScale, eventPositions, trackTopByIndex]);

  const visibleConnections = useMemo(() => {
    return eventConnections.filter((conn) => {
      const sp = eventPoints.get(conn.sourceId)?.source;
      const tp = eventPoints.get(conn.targetId)?.target;
      if (!sp || !tp) return false;
      return sp.x >= visibleMin && sp.x <= visibleMax && tp.x >= visibleMin && tp.x <= visibleMax;
    });
  }, [eventConnections, eventPoints, visibleMin, visibleMax]);

  return (
    <svg
      ref={svgRef}
      className="absolute top-0 left-0"
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {visibleConnections.map((conn) => {
        const sp = eventPoints.get(conn.sourceId)?.source;
        const tp = eventPoints.get(conn.targetId)?.target;
        if (!sp || !tp) return null;
        const midX = (sp.x + tp.x) / 2;
        const isActive =
          pendingConnection === conn.sourceId ||
          pendingConnection === conn.targetId ||
          selectedEventId === conn.sourceId ||
          selectedEventId === conn.targetId;
        const isForeshadow = conn.connectionType === 'foreshadow';
        const path = `M ${sp.x} ${sp.y} C ${midX} ${sp.y}, ${midX} ${tp.y}, ${tp.x} ${tp.y}`;
        return (
          <g key={`${conn.sourceId}-${conn.targetId}`}>
            <path
              d={path}
              fill="none"
              stroke={isForeshadow ? 'var(--accent-soft)' : isActive ? 'var(--accent)' : 'var(--text-secondary)'}
              strokeWidth={isActive ? 2.5 : 1.5}
              strokeDasharray={isForeshadow ? '6 4' : '4 3'}
              opacity={isActive ? 0.9 : 0.4}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={() => onDisconnect(conn.sourceId, conn.targetId)}
              onMouseEnter={(e) => {
                e.currentTarget.setAttribute('stroke-width', '3');
                e.currentTarget.setAttribute('opacity', '0.9');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.setAttribute('stroke-width', isActive ? '2.5' : '1.5');
                e.currentTarget.setAttribute('opacity', isActive ? '0.9' : '0.4');
              }}
            />
            <circle cx={tp.x} cy={tp.y} r={3} fill="var(--accent)" opacity={isActive ? 1 : 0.5} style={{ pointerEvents: 'none' }} />
          </g>
        );
      })}
    </svg>
  );
}

// ===== 轨道行 =====
function TrackLane({
  index,
  track,
  tracks,
  collapsed,
  events,
  eventPositions,
  timeScale,
  totalWidth,
  zoom,
  scrollLeft,
  viewportWidth,
  selectedEventId,
  pendingConnection,
  conflictEventIds,
  eventElementRegistry,
  copiedEvent,
  onSelectEvent,
  onEditEvent,
  onAddEvent,
  onAddEventToTrack,
  onPasteEvent,
  onCanvasDoubleClick,
  onEventDragEnd,
  onStartConnection,
  onDragStart,
  onDrag,
  onDuplicateEvent,
  onAskAiEvent,
  onDeleteEvent,
  onUpdateEventStatus,
  onZoomIn,
  onZoomOut,
  onCheckConsistency,
  onToggleCollapse,
  onDragEndNotify,
}: {
  index: number;
  track: Track;
  tracks: Track[];
  collapsed: boolean;
  events: Event[];
  eventPositions: Map<string, number>;
  timeScale: TimeScale;
  totalWidth: number;
  zoom: ZoomLevel;
  scrollLeft: number;
  viewportWidth: number;
  selectedEventId: string | null;
  pendingConnection: string | null;
  conflictEventIds: Set<string>;
  eventElementRegistry: React.MutableRefObject<Map<string, HTMLElement>>;
  copiedEvent: Event | null;
  onSelectEvent: (id: string) => void;
  onEditEvent: (ev: Event) => void;
  onAddEvent: () => void;
  onAddEventToTrack: (trackId: string) => void;
  onPasteEvent: () => void;
  onCanvasDoubleClick: (x: number) => void;
  onEventDragEnd: (ev: Event, track: Track, info: PanInfo, finalX: number) => void;
  onStartConnection: (id: string) => void;
  onDuplicateEvent: (ev: Event) => void;
  onAskAiEvent: (ev: Event) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEventStatus: (id: string, status: EventStatus) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCheckConsistency: () => void;
  onToggleCollapse: () => void;
  onDragStart: (id: string) => void;
  onDrag: (id: string, offsetX: number) => void;
  onDragEndNotify: () => void;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevEventIdsRef = useRef<Set<string>>(new Set(events.map((e) => e.id)));

  const newEventIds = useMemo(() => {
    const current = new Set(events.map((e) => e.id));
    const added = new Set<string>();
    for (const id of current) {
      if (!prevEventIdsRef.current.has(id)) {
        added.add(id);
      }
    }
    return added;
  }, [events]);

  useEffect(() => {
    prevEventIdsRef.current = new Set(events.map((e) => e.id));
  }, [events]);

  const visibleEvents = useMemo(() => {
    if (viewportWidth === 0) return events;
    const buffer = EVENT_MIN_WIDTH * 2;
    const min = scrollLeft - buffer;
    const max = scrollLeft + viewportWidth + buffer;
    return events.filter((ev) => {
      const x = timeScale.timeToX(eventPositions.get(ev.id) ?? 0);
      return x + EVENT_MIN_WIDTH >= min && x <= max;
    });
  }, [events, eventPositions, timeScale, scrollLeft, viewportWidth]);

  const eventXs = useMemo(
    () => events.map((ev) => timeScale.timeToX(eventPositions.get(ev.id) ?? 0)),
    [events, eventPositions, timeScale],
  );

  const addButtonLeft = useMemo(
    () => computeAddButtonLeft(eventXs, totalWidth, ADD_EVENT_BUTTON_WIDTH, EVENT_MIN_WIDTH, 12),
    [eventXs, totalWidth],
  );

  const targetHeight = collapsed ? TRACK_COLLAPSED_HEIGHT : TRACK_HEIGHT;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0, height: targetHeight }}
          transition={{ ...MOTION_BASE, delay: Math.min(index * 0.04, 0.2), height: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
          className={cn(
            'group relative border-b border-border/40 overflow-hidden will-change-transform',
            index % 2 === 0 ? 'bg-bg-base' : 'bg-bg-surface/40',
          )}
          style={{ minWidth: totalWidth, height: targetHeight }}
          onDoubleClick={(e) => {
            if (collapsed) return;
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) onCanvasDoubleClick(e.clientX - rect.left + (containerRef.current?.parentElement?.scrollLeft ?? 0));
          }}
        >
      {/* 轨道左侧色标 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: track.color }}
      />

      {/* 折叠状态标题与计数 */}
      {collapsed && (
        <div className="absolute inset-0 flex items-center gap-2 pl-4 pr-3">
          <span className="text-[10px] font-medium text-text-secondary truncate leading-none">{track.name}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-text-secondary border border-border leading-none">
            {events.length}
          </span>
        </div>
      )}

      {/* 时间网格背景 */}
      {!collapsed && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent ${LEFT_PADDING}px, transparent ${
              LEFT_PADDING + ZOOM_UNIT_WIDTH[zoom]
            }px, var(--border) ${LEFT_PADDING + ZOOM_UNIT_WIDTH[zoom]}px, var(--border) ${
              LEFT_PADDING + ZOOM_UNIT_WIDTH[zoom] + 1
            }px)`,
          }}
        />
      )}

      {/* 事件卡片 */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key={`${track.id}-content`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <AnimatePresence>
              {visibleEvents.map((ev, i) => {
                const x = timeScale.timeToX(eventPositions.get(ev.id) ?? 0);
                return (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    track={track}
                    index={i}
                    x={x}
                    totalWidth={totalWidth}
                    selected={ev.id === selectedEventId}
                    pendingConnection={pendingConnection === ev.id}
                    isConflict={conflictEventIds.has(ev.id)}
                    isNew={newEventIds.has(ev.id)}
                    eventElementRegistry={eventElementRegistry}
                    onClick={() => onSelectEvent(ev.id)}
                    onDoubleClick={() => onEditEvent(ev)}
                    onDragEnd={(info, finalX) => onEventDragEnd(ev, track, info, finalX)}
                    onStartConnection={() => onStartConnection(ev.id)}
                    onDuplicate={() => onDuplicateEvent(ev)}
                    onAskAi={() => onAskAiEvent(ev)}
                    onDelete={() => onDeleteEvent(ev.id)}
                    onChangeStatus={(status) => onUpdateEventStatus(ev.id, status)}
                    onDragStart={() => onDragStart(ev.id)}
                    onDrag={(_, offsetX) => onDrag(ev.id, offsetX)}
                    onDragEndNotify={() => onDragEndNotify()}
                  />
                );
              })}
            </AnimatePresence>

            {/* 添加按钮 */}
            <button
              onClick={onAddEvent}
              data-testid="add-event-btn"
              className={cn(
                'absolute top-3 z-10 flex items-center justify-center gap-1',
                'rounded-[6px] border-2 border-dashed border-border/70 text-text-secondary',
                'hover:border-accent hover:text-accent transition-colors',
              )}
              style={{ left: addButtonLeft, width: ADD_EVENT_BUTTON_WIDTH, height: EVENT_HEIGHT }}
              title={t('timeline.addEvent')}
            >
              <Plus className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuSection label={t('contextMenu.addEvent')}>
          {tracks.map((tr) => (
            <ContextMenuItem
              key={tr.id}
              onClick={() => onAddEventToTrack(tr.id)}
              className="gap-2"
            >
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: tr.color }}
              />
              <span className="truncate">{tr.name}</span>
            </ContextMenuItem>
          ))}
        </ContextMenuSection>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onPasteEvent} disabled={!copiedEvent} className="gap-2">
          <ClipboardPaste className="h-3.5 w-3.5" />
          {t('contextMenu.pasteEvent')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onZoomIn} className="gap-2">
          <ZoomIn className="h-3.5 w-3.5" />
          {t('contextMenu.zoomIn')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onZoomOut} className="gap-2">
          <ZoomOut className="h-3.5 w-3.5" />
          {t('contextMenu.zoomOut')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onToggleCollapse} className="gap-2">
          <ChevronsUpDown className="h-3.5 w-3.5" />
          {collapsed ? t('contextMenu.expandTrack') : t('contextMenu.collapseTrack')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onCheckConsistency} className="gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('contextMenu.checkConsistency')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ===== 事件卡片 =====
function EventCard({
  event,
  track,
  index,
  x,
  totalWidth,
  selected,
  pendingConnection,
  isConflict,
  isNew,
  eventElementRegistry,
  onClick,
  onDoubleClick,
  onDragEnd,
  onStartConnection,
  onDuplicate,
  onAskAi,
  onDelete,
  onChangeStatus,
  onDragStart,
  onDrag,
  onDragEndNotify,
}: {
  event: Event;
  track: Track;
  index: number;
  x: number;
  totalWidth: number;
  selected: boolean;
  pendingConnection: boolean;
  isConflict: boolean;
  isNew: boolean;
  eventElementRegistry: React.MutableRefObject<Map<string, HTMLElement>>;
  onClick: () => void;
  onDoubleClick: () => void;
  onDragEnd: (info: PanInfo, finalX: number) => void;
  onStartConnection: () => void;
  onDuplicate: () => void;
  onAskAi: () => void;
  onDelete: () => void;
  onChangeStatus: (status: EventStatus) => void;
  onDragStart: () => void;
  onDrag: (info: PanInfo, offsetX: number) => void;
  onDragEndNotify: () => void;
}) {
  const { t } = useI18n();
  const ambient = useAmbientAnimation();
  const color = event.color ?? track.color;
  const statusMap: Record<
    EventStatus,
    { dot: string; border: string; labelKey: string }
  > = {
    draft: { dot: 'bg-text-secondary/60', border: 'border-status-draft', labelKey: 'timeline.event.statusDraft' },
    done: { dot: 'bg-status-done', border: 'border-status-done', labelKey: 'timeline.event.statusDone' },
    revise: { dot: 'bg-status-revise', border: 'border-status-revise', labelKey: 'timeline.event.statusRevise' },
  };
  const status = statusMap[event.status];
  const isRelative = event.dateType !== 'absolute';

  const initial = isNew
    ? { opacity: 1, scale: 1.05, y: 0 }
    : { opacity: 0, scale: 0.9, y: 8 };
  const animate = { opacity: 1, scale: 1, y: 0 };
  const whileHover = ambient.animate ? { scale: 1.02, y: -2 } : { y: -2 };
  const whileTap = ambient.fancy ? { scale: 0.96, rotate: -0.5 } : { scale: 0.98 };
  const transition = { ...ambient.transition, delay: Math.min(index * 0.015, 0.1) };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          ref={(el) => {
            if (el) eventElementRegistry.current.set(event.id, el);
            else eventElementRegistry.current.delete(event.id);
          }}
          data-event-id={event.id}
      initial={initial}
      animate={animate}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={transition}
      drag="x"
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={computeEventDragConstraints(EVENT_MIN_WIDTH, totalWidth)}
      onDragStart={onDragStart}
      onDrag={(_, info) => onDrag(info, info.offset.x)}
      onDragEnd={(_, info) => {
        onDragEnd(info, x + info.offset.x);
        onDragEndNotify();
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      whileHover={whileHover}
      whileTap={whileTap}
      title={`${event.title}${event.dateValue ? ` · ${event.dateValue}` : ''}`}
      className={cn(
        'absolute top-3 cursor-grab active:cursor-grabbing select-none active:scale-[0.98]',
        'rounded-[8px] overflow-hidden',
        'shadow-[var(--shadow-card)] transition-shadow',
        'border-2 backdrop-blur-sm will-change-transform fancy-ripple',
        selected
          ? 'border-accent ring-2 ring-accent/30 shadow-[var(--shadow-elevated)]'
          : cn('border-border/60 hover:shadow-[var(--shadow-elevated)]', status.border),
        pendingConnection && 'border-accent animate-pulse',
        isConflict && 'ring-2 ring-red-500/50 border-red-400',
      )}
      style={{
        left: x,
        width: EVENT_MIN_WIDTH,
        height: EVENT_HEIGHT,
        background: `linear-gradient(135deg, ${color}25 0%, ${color}08 100%)`,
      }}
    >
      {/* 顶部色带 */}
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      {isConflict && (
        <div
          className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 shadow-sm"
          title={t('timeline.conflictBadge')}
        />
      )}

      <div className="px-3.5 py-2 flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {isRelative ? (
            <span className="flex items-center gap-1 flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-secondary border border-border/50">
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
              {t('timeline.relativeBadge')}
            </span>
          ) : (
            <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', status.dot)} />
          )}
          <span className="text-xs font-semibold text-text-primary truncate flex-1 min-w-0">
            {event.title}
          </span>
          {/* 连线手柄 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnection();
            }}
            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-accent p-0.5 rounded transition-colors flex-shrink-0"
            title={t('timeline.startConnection')}
          >
            <Link2 className="h-3 w-3" />
          </button>
        </div>
        {event.dateValue && (
          <span className="flex items-center gap-1 text-[10px] text-text-secondary truncate">
            {event.dateType === 'absolute' ? (
              <CalendarDays className="h-3 w-3 flex-shrink-0" />
            ) : (
              <Bookmark className="h-3 w-3 flex-shrink-0" />
            )}
            {event.dateValue}
          </span>
        )}
        {event.characterIds.length > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            {event.characterIds.slice(0, 4).map((cid, i) => (
              <span
                key={cid}
                className="h-3.5 w-3.5 rounded-full border border-white/40 text-[8px] grid place-items-center text-white font-bold"
                style={{
                  backgroundColor: ['#F4B6C2', '#B6D4F4', '#B6F4C8', '#F4E4B6'][i % 4],
                  marginLeft: i > 0 ? -4 : 0,
                }}
              >
                {i === 3 && event.characterIds.length > 4
                  ? `+${event.characterIds.length - 3}`
                  : ''}
              </span>
            ))}
          </div>
        )}
      </div>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onDoubleClick} className="gap-2">
          <Pencil className="h-3.5 w-3.5" />
          {t('contextMenu.edit')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onDuplicate} className="gap-2">
          <Copy className="h-3.5 w-3.5" />
          {t('contextMenu.duplicate')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="gap-2 text-red-500 hover:text-red-500 hover:bg-red-500/10 focus-visible:ring-red-500/40">
          <Trash2 className="h-3.5 w-3.5" />
          {t('contextMenu.delete')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSection label={t('contextMenu.changeStatus')}>
          {(['draft', 'done', 'revise'] as const).map((s) => (
            <ContextMenuItem key={s} onClick={() => onChangeStatus(s)} className="gap-2">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', statusMap[s].dot)} />
              {t(statusMap[s].labelKey)}
            </ContextMenuItem>
          ))}
        </ContextMenuSection>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onStartConnection} className="gap-2">
          <Link2 className="h-3.5 w-3.5" />
          {t('contextMenu.startConnection')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onAskAi} className="gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          {t('contextMenu.askAi')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function computeNewSortOrder(
  ev: Event,
  finalX: number,
  trackEvents: Event[],
  eventPositions: Map<string, number>,
  timeScale: TimeScale,
): number {
  const sameType = trackEvents.filter((e) => e.dateType === ev.dateType && e.id !== ev.id);
  const sorted = [...sameType].sort((a, b) => a.sortOrder - b.sortOrder);
  let index = sorted.length;
  for (let i = 0; i < sorted.length; i++) {
    const other = sorted[i]!;
    const ox = timeScale.timeToX(eventPositions.get(other.id) ?? 0);
    if (finalX < ox) {
      index = i;
      break;
    }
  }
  return index;
}

// ===== 轨道行（左侧面板项） =====
function TrackRow({
  track,
  eventCount,
  collapsed,
  onToggleVisible,
  onRename,
  onDelete,
  onChangeColor,
  onAddEvent,
  onToggleCollapse,
}: {
  track: Track;
  eventCount: number;
  collapsed: boolean;
  onToggleVisible: () => void;
  onRename: () => void;
  onDelete: () => void;
  onChangeColor: (color: string) => void;
  onAddEvent: () => void;
  onToggleCollapse: () => void;
}) {
  const { t } = useI18n();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group flex items-center gap-2.5 px-3 py-2.5 min-h-11 hover:bg-bg-elevated transition-colors">
      <span
        className="h-3 w-3 rounded-sm flex-shrink-0 shadow-sm"
        style={{ backgroundColor: track.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate leading-tight">{track.name}</div>
        <div className="text-[10px] text-text-secondary/80 mt-0.5">{eventCount} 个事件</div>
      </div>
      <button
        onClick={onToggleCollapse}
        className={cn(
          'text-text-secondary hover:text-text-primary p-1 rounded transition-colors',
          collapsed && 'text-accent',
        )}
        title={collapsed ? t('contextMenu.expandTrack') : t('contextMenu.collapseTrack')}
      >
        <ChevronsUpDown className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onToggleVisible}
        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
        title={track.isVisible ? t('contextMenu.hide') : t('contextMenu.show')}
      >
        {track.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={onRename}
        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
        title={t('contextMenu.rename')}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 p-1 rounded transition-colors"
        title={t('contextMenu.delete')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onRename} className="gap-2">
          <Pencil className="h-3.5 w-3.5" />
          {t('contextMenu.rename')}
        </ContextMenuItem>
        <ContextMenuSection label={t('contextMenu.changeColor')}>
          <div className="px-3 py-1.5 flex gap-1.5 flex-wrap">
            {EVENT_COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChangeColor(c)}
                className={cn(
                  'h-5 w-5 rounded-full border border-border transition-transform',
                  track.color === c ? 'ring-2 ring-accent scale-110' : 'hover:scale-110',
                )}
                style={{ backgroundColor: c }}
                aria-label={t('contextMenu.changeColor') + ' ' + c}
              />
            ))}
          </div>
        </ContextMenuSection>
        <ContextMenuItem onClick={onToggleVisible} className="gap-2">
          {track.isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {track.isVisible ? t('contextMenu.hide') : t('contextMenu.show')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onToggleCollapse} className="gap-2">
          <ChevronsUpDown className="h-3.5 w-3.5" />
          {collapsed ? t('contextMenu.expandTrack') : t('contextMenu.collapseTrack')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onAddEvent} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          {t('contextMenu.addEvent')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="gap-2 text-red-500 hover:text-red-500 hover:bg-red-500/10 focus-visible:ring-red-500/40">
          <Trash2 className="h-3.5 w-3.5" />
          {t('contextMenu.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ===== 事件编辑对话框 =====
function EventEditDialog({
  open,
  onOpenChange,
  event,
  isConflict,
  tracks,
  characters,
  locations,
  workspaceId,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  isConflict: boolean;
  tracks: Track[];
  characters: Character[];
  locations: { id: string; name: string; color?: string }[];
  workspaceId: string;
  onSave: (data: Partial<Event> & { title: string; characterIds: string[]; imageUrls: string[] }) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateType, setDateType] = useState<'absolute' | 'relative'>('relative');
  const [dateValue, setDateValue] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [trackId, setTrackId] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setDateType(event.dateType);
      setDateValue(event.dateValue);
      setStatus(event.status);
      setTrackId(event.trackId);
      setColor(event.color);
      setCharacterIds(event.characterIds);
      setLocationId(event.locationId);
      setImageUrls(event.imageUrls);
    }
  }, [event]);

  if (!event) return null;

  const toggleCharacter = (id: string) => {
    setCharacterIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  };

  const handleUploadImage = async () => {
    if (!isTauri()) {
      toastError(new Error(t('outline.desktopOnlyImage')));
      return;
    }
    try {
      const path = await openDialog({
        title: t('timeline.event.uploadImage'),
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
      });
      if (path && typeof path === 'string') {
        setUploadingImage(true);
        const uploadedPath = await uploadEventImage(event.id, workspaceId, path);
        setImageUrls((prev) => [...prev, uploadedPath]);
      }
    } catch (e) {
      toastError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('timeline.addEvent')} className="max-w-lg">
        <div className="flex flex-col gap-4">
          {isConflict && (
            <div className="rounded-[6px] border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs text-red-600">
              {t('timeline.conflictHint')}
            </div>
          )}
          <div>
            <Label>{t('timeline.event.title')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
              autoFocus
              data-testid="event-title-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('timeline.event.track')}</Label>
              <select
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="mt-1.5 w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {tracks.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('timeline.event.status')}</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="mt-1.5 w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="draft">{t('timeline.event.statusDraft')}</option>
                <option value="done">{t('timeline.event.statusDone')}</option>
                <option value="revise">{t('timeline.event.statusRevise')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('timeline.event.date')}</Label>
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setDateType('absolute')}
                  className={cn(
                    'flex-1 h-10 rounded-[6px] border text-xs transition-colors',
                    dateType === 'absolute'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-secondary hover:bg-bg-elevated',
                  )}
                >
                  {t('timeline.event.dateAbsolute')}
                </button>
                <button
                  type="button"
                  onClick={() => setDateType('relative')}
                  className={cn(
                    'flex-1 h-10 rounded-[6px] border text-xs transition-colors',
                    dateType === 'relative'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-secondary hover:bg-bg-elevated',
                  )}
                >
                  {t('timeline.event.dateRelative')}
                </button>
              </div>
            </div>
            <div>
              <Label> </Label>
              <Input
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                placeholder={dateType === 'absolute' ? '2024-03-15' : '第1章 / 第3天'}
                className="mt-1.5"
                type={dateType === 'absolute' ? 'date' : 'text'}
              />
            </div>
          </div>

          <div>
            <Label>{t('timeline.event.color')}</Label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {EVENT_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform',
                    color === c ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <button
                type="button"
                onClick={() => setColor(null)}
                className={cn(
                  'h-7 px-2 rounded-full text-[10px] border transition-colors',
                  color === null
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-secondary hover:bg-bg-elevated',
                )}
              >
                {t('timeline.event.colorDefault')}
              </button>
            </div>
          </div>

          <div>
            <Label>{t('timeline.event.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-[100px]"
              placeholder="事件详细描述…"
            />
          </div>

          {/* 图片上传 */}
          <div>
            <Label className="flex items-center justify-between">
              <span>{t('timeline.event.images')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUploadImage}
                loading={uploadingImage}
                disabled={uploadingImage}
                className="gap-1.5 h-7 text-xs"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                {t('timeline.event.uploadImage')}
              </Button>
            </Label>
            <div className="mt-1.5 border border-border rounded-[6px] p-3 bg-bg-elevated/40">
              {imageUrls.length === 0 ? (
                <p className="text-xs text-text-secondary/60 text-center py-2">
                  {t('timeline.event.noImages')}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {imageUrls.map((url) => (
                    <ImageThumbnail key={url} url={url} onRemove={() => removeImage(url)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 角色选择器 */}
          <div>
            <Label>{t('timeline.event.characters')}</Label>
            <div className="mt-1.5 border border-border rounded-[6px] p-3 max-h-40 overflow-y-auto bg-bg-elevated/40">
              {characters.length === 0 ? (
                <p className="text-xs text-text-secondary/60 text-center py-2">
                  暂无角色，请先到角色视图创建
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {characters.map((c) => {
                    const selected = characterIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCharacter(c.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition-colors',
                          selected
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-border text-text-secondary hover:bg-bg-surface',
                        )}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 地点选择器 */}
          <div>
            <Label>{t('timeline.event.location')}</Label>
            <div className="mt-1.5 border border-border rounded-[6px] p-3 max-h-40 overflow-y-auto bg-bg-elevated/40">
              {locations.length === 0 ? (
                <p className="text-xs text-text-secondary/60 text-center py-2">
                  暂无地点，请先到地图视图创建
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {locations.map((loc) => {
                    const selected = locationId === loc.id;
                    return (
                      <button
                        key={loc.id}
                        onClick={() => setLocationId(selected ? null : loc.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition-colors',
                          selected
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-border text-text-secondary hover:bg-bg-surface',
                        )}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: loc.color || '#999' }}
                        />
                        {loc.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-2 border-t border-border">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('common.delete')}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() =>
                  onSave({ title, description, dateType, dateValue, status, trackId, color, characterIds, locationId, imageUrls })
                }
                disabled={!title.trim()}
                data-testid="event-save-btn"
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('common.delete')}
        description={t('timeline.event.title') + ' - ' + event.title}
        destructive
        confirmText={t('common.delete')}
        onConfirm={() => onDelete(event.id)}
      />
    </Dialog>
  );
}

function ImageThumbnail({ url, onRemove }: { url: string; onRemove: () => void }) {
  const { t } = useI18n();
  const imageUrl = useMemo(() => {
    if (isTauri()) {
      try {
        return convertFileSrc(url);
      } catch {
        return url;
      }
    }
    return url;
  }, [url]);

  return (
    <div className="relative group w-16 h-16 rounded-[6px] overflow-hidden border border-border bg-bg-surface flex-shrink-0">
      <img
        src={imageUrl}
        alt=""
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <button
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        title={t('timeline.event.removeImage')}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ===== 轨道编辑对话框 =====
function TrackEditDialog({
  open,
  onOpenChange,
  track,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
  onSave: (data: { name?: string; color?: string }) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#F4B6C2');

  useEffect(() => {
    if (track) {
      setName(track.name);
      setColor(track.color);
    } else {
      setName('');
      setColor(EVENT_COLOR_PALETTE[Math.floor(Math.random() * EVENT_COLOR_PALETTE.length)] ?? '#F4B6C2');
    }
  }, [track, open]);

  const palette = EVENT_COLOR_PALETTE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={track ? t('timeline.rename') : t('timeline.addTrack')} className="max-w-sm">
        <div className="flex flex-col gap-4">
          <div>
            <Label>{t('timeline.trackName')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) onSave({ name, color });
              }}
            />
          </div>
          <div>
            <Label>{t('timeline.trackColor')}</Label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {palette.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform',
                    color === c ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => onSave({ name, color })} disabled={!name.trim()}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== 筛选栏 =====
interface FilterBarProps {
  characters: Character[];
  locations: { id: string; name: string; color?: string }[];
  selectedCharacterIds: string[];
  selectedLocationIds: string[];
  selectedStatuses: string[];
  searchQuery: string;
  hasActiveFilters: boolean;
  allCollapsed: boolean;
  onToggleCharacter: (id: string) => void;
  onToggleLocation: (id: string) => void;
  onToggleStatus: (status: string) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}

function FilterBar({
  characters,
  locations,
  selectedCharacterIds,
  selectedLocationIds,
  selectedStatuses,
  searchQuery,
  hasActiveFilters,
  allCollapsed,
  onToggleCharacter,
  onToggleLocation,
  onToggleStatus,
  onSearchChange,
  onClearFilters,
  onCollapseAll,
  onExpandAll,
}: FilterBarProps) {
  const { t } = useI18n();

  const statusOptions = [
    { value: 'draft', label: t('timeline.event.statusDraft'), colorClass: 'bg-text-secondary/60' },
    { value: 'done', label: t('timeline.event.statusDone'), colorClass: 'bg-status-done' },
    { value: 'revise', label: t('timeline.event.statusRevise'), colorClass: 'bg-status-revise' },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 min-h-11 border-b border-border bg-bg-surface/80 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-text-secondary text-xs h-8 shrink-0">
        <Filter className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('timeline.filter')}</span>
      </div>

      <MultiSelectDropdown
        label={t('timeline.filterCharacters')}
        options={characters.map((c) => ({ id: c.id, label: c.name, color: c.color }))}
        selectedIds={selectedCharacterIds}
        onToggle={onToggleCharacter}
      />

      <MultiSelectDropdown
        label={t('timeline.filterLocations')}
        options={locations.map((l) => ({ id: l.id, label: l.name, color: l.color || '#999' }))}
        selectedIds={selectedLocationIds}
        onToggle={onToggleLocation}
      />

      <MultiSelectDropdown
        label={t('timeline.filterStatus')}
        options={statusOptions.map((s) => ({ id: s.value, label: s.label, colorClass: s.colorClass }))}
        selectedIds={selectedStatuses}
        onToggle={onToggleStatus}
      />

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('timeline.searchEvents')}
          className="h-8 pl-7 pr-7 text-xs w-40 sm:w-52"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5 rounded"
            aria-label={t('common.clear')}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-8 text-xs gap-1.5">
          <X className="h-3.5 w-3.5" />
          {t('timeline.clearFilters')}
        </Button>
      )}

      <div className="ml-auto hidden sm:flex items-center gap-2">
        <div className="w-px h-5 bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={allCollapsed ? onExpandAll : onCollapseAll}
          className="h-8 text-xs gap-1.5"
          title={allCollapsed ? t('timeline.expandAllTracks') : t('timeline.collapseAllTracks')}
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {allCollapsed ? t('timeline.expandAllTracks') : t('timeline.collapseAllTracks')}
          </span>
        </Button>
      </div>
    </div>
  );
}

interface MultiSelectDropdownOption {
  id: string;
  label: string;
  color?: string;
  colorClass?: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: MultiSelectDropdownOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

function MultiSelectDropdown({ label, options, selectedIds, onToggle }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const selectedCount = selectedIds.length;
  const displayLabel = selectedCount > 0 ? `${label} (${selectedCount})` : label;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] text-xs transition-colors border',
            open || selectedCount > 0
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-bg-surface border-border text-text-secondary hover:text-text-primary hover:border-accent/30',
          )}
        >
          <span className="max-w-[80px] sm:max-w-[120px] truncate">{displayLabel}</span>
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          avoidCollisions
          className={cn(
            'z-50 min-w-[160px] max-w-[240px]',
            'rounded-[8px] border border-border bg-bg-surface shadow-[var(--shadow-elevated)] p-1.5',
            'focus:outline-none',
          )}
        >
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-text-secondary/70">{label}</div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {options.map((opt) => {
                const selected = selectedIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onToggle(opt.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-xs text-left',
                      'hover:bg-bg-elevated transition-colors',
                    )}
                  >
                    <span
                      className={cn(
                        'h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center',
                        selected
                          ? 'bg-accent border-accent text-white'
                          : 'border-border bg-bg-surface',
                      )}
                    >
                      {selected && <span className="text-[10px] leading-none">✓</span>}
                    </span>
                    {opt.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    {opt.colorClass && <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', opt.colorClass)} />}
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
