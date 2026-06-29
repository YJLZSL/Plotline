import { memo, useRef, useState, useMemo, useEffect, useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  MoreHorizontal,
  FileText,
  Download,
} from 'lucide-react';
import { GanttChart } from './GanttChart';
import { TreeTimeline } from './TreeTimeline';
import { TextTimeline } from './TextTimeline';
import {
  createTimelineGrid,
  computeTimelineLayout,
  computeRelativeDurationUnits,
  getZoomLabel,
  adjustZoom,
  DEFAULT_ZOOM,
  LEFT_PADDING,
  getXAtTime,
  getViewportTimeScale,
  getSnapTimeAtX,
  getSnapXAtTime,
  getSnapThreshold,
  type ViewportState,
  type EventLayoutItem,
} from '@/features/timeline/timelineGrid';
import { useTimelineViewport } from '@/features/timeline/useTimelineViewport';

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
  EventCard,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { MOTION_FAST, EASE_STANDARD } from '@/lib/motion';
import { getScenePreset, getElementDelay } from '@/lib/motionOrchestrator';
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
import { useWorkspaceSelectionStore } from '@/stores/workspaceSelection';
import {
  clampTodayLabelX,
  computeAddButtonLeft,
  getEventCardWidth,
  estimateLabelWidth,
} from '@/features/timeline/timelineLayout';
import {
  chooseTickLevel,
  formatMajorTick,
  formatMinorTick,
  getMajorTickTimestamps,
  getMinorTickTimestamps,
  type TickLevel,
} from '@/features/timeline/timeScale';
import { TimelineEmptyIllustration } from '@/features/timeline/TimelineEmptyIllustration';
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
const EVENT_CARD_MAX_WIDTH = 360;
const ADD_EVENT_BUTTON_WIDTH = 64;
const EVENT_HEIGHT = 64;
const EVENT_ROW_GAP = 8;
const EVENT_BASE_TOP = 12;
const RULER_HEIGHT = 44;
const DAY_MS = 24 * 3600 * 1000;

const EVENT_COLOR_PALETTE = ['#F4B6C2', '#B6D4F4', '#B6F4C8', '#F4E4B6', '#D8B6F4', '#F4CBB6'];
const VISIBLE_EVENT_BUFFER = EVENT_CARD_MAX_WIDTH * 4;

interface TimelineViewProps {
  workspaceId: string;
  workspaceName?: string;
}

/** 根据指针位置定位其下方的轨道（优先精确命中，其次按纵向位置兜底）。
 *  `excludeEventId` 用于拖拽时临时忽略被拖动的事件卡片，避免它挡住命中测试。 */
function resolveTrackAtPointer(
  clientX: number,
  clientY: number,
  tracks: Track[],
  excludeEventId?: string,
): Track | null {
  const cardEl = excludeEventId ? (document.querySelector(`[data-event-id="${excludeEventId}"]`) as HTMLElement | null) : null;
  const originalPointerEvents = cardEl?.style.pointerEvents;
  try {
    if (cardEl) cardEl.style.pointerEvents = 'none';

    const elements = document.elementsFromPoint(clientX, clientY);
    for (const el of elements) {
      const trackId = el.closest('[data-track-id]')?.getAttribute('data-track-id') ?? null;
      if (!trackId) continue;
      const tr = tracks.find((t) => t.id === trackId);
      if (tr) return tr;
    }
  } finally {
    if (cardEl) cardEl.style.pointerEvents = originalPointerEvents ?? '';
  }

  // 兜底：通过所有轨道包围盒定位
  const laneEls = document.querySelectorAll('[data-track-id]');
  let found: Track | null = null;
  for (const el of laneEls) {
    const id = el.getAttribute('data-track-id');
    if (!id) continue;
    const rect = el.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      const tr = tracks.find((t) => t.id === id);
      if (tr) {
        found = tr;
        break;
      }
    }
  }
  if (found) return found;
  for (const el of laneEls) {
    const id = el.getAttribute('data-track-id');
    if (!id) continue;
    const rect = el.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) {
      const tr = tracks.find((t) => t.id === id);
      if (tr) {
        found = tr;
        break;
      }
    }
  }
  return found;
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

  const selectedEventId = useWorkspaceSelectionStore((s) => s.selectedEventId);
  const selectEvent = useWorkspaceSelectionStore((s) => s.selectEvent);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [deleteTrackTarget, setDeleteTrackTarget] = useState<Track | null>(null);
  const [newTrackName, setNewTrackName] = useState('');
  const [showConnections, setShowConnections] = useState(true);
  const [onlySelectedConnections, setOnlySelectedConnections] = useState(false);
  const [checkingConsistency, setCheckingConsistency] = useState(false);
  const [conflictEventIds, setConflictEventIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'gantt' | 'tree' | 'text'>('timeline');
  const [connectionType, setConnectionType] = useState<'causal' | 'foreshadow'>('causal');
  const [copiedEvent, setCopiedEvent] = useState<Event | null>(null);
  const [filterBarVisible, setFilterBarVisible] = useState(true);
  const navigate = useNavigate();
  const filteredEvents = useMemo(
    () => filterEvents(events, filters),
    [events, filters],
  );

  // 从绝对事件中计算时间范围，作为视口坐标源的唯一时间边界。
  // 不依赖 zoom，可在 hook 之前计算，保证 viewportState.timeRange 与 grid 在同一帧一致。
  const timeBounds = useMemo(() => {
    const absoluteEvents = filteredEvents.filter((e) => e.dateType === 'absolute' && e.dateValue);
    let baseTime = 0;
    let maxTime = 365 * DAY_MS;
    if (absoluteEvents.length > 0) {
      const times = absoluteEvents.map((e) => new Date(e.dateValue).getTime()).filter((n) => !Number.isNaN(n));
      if (times.length > 0) {
        const firstTime = Math.min(...times);
        const lastTime = Math.max(...times);
        const span = lastTime - firstTime || 365 * DAY_MS;
        baseTime = firstTime;
        maxTime = lastTime + span * 0.15;
      }
    }
    return { startTime: baseTime, endTime: maxTime };
  }, [filteredEvents]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const {
    zoom,
    setZoom,
    scrollLeft,
    setScrollLeft,
    viewportWidth,
    setViewportWidth,
    zoomAt,
    panBy,
    viewportState,
    getTimeAtX: viewportGetTimeAtX,
  } = useTimelineViewport({ canvasRef, initialZoom: DEFAULT_ZOOM, timeRange: timeBounds });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const panElementRef = useRef<HTMLElement | null>(null);
  const [draggingEvent, setDraggingEvent] = useState<{
    id: string;
    offsetX: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [dragState, setDragState] = useState<{
    eventId: string;
    contentX: number;
    clientX: number;
    clientY: number;
    targetTrackId: string | null;
  } | null>(null);
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
  }, [setScrollLeft, setViewportWidth]);

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

  // 从剧本视图跳转回来时，滚动到共享选中的事件并使其可见
  useEffect(() => {
    if (!selectedEventId) return;
    const el = document.querySelector(`[data-event-id="${selectedEventId}"]`) as HTMLElement | null;
    if (el && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const cardRect = el.getBoundingClientRect();
      const relativeX = cardRect.left - canvasRect.left;
      const targetScrollLeft =
        canvasRef.current.scrollLeft + relativeX - canvasRef.current.clientWidth / 2 + cardRect.width / 2;
      canvasRef.current.scrollLeft = targetScrollLeft;
    }
  }, [selectedEventId]);

  const [pendingConnection, setPendingConnection] = useState<string | null>(null);

  const visibleTracks = useMemo(() => tracks.filter((tr) => tr.isVisible), [tracks]);

  // 计算连续 zoom 网格（timeBounds 已在 hook 之前算出，这里直接复用）
  const grid = useMemo(
    () => createTimelineGrid(timeBounds.startTime, timeBounds.endTime, zoom, LEFT_PADDING),
    [timeBounds, zoom],
  );

  const timeScale = useMemo(() => grid.getTimeScale(), [grid]);

  const totalWidth = useMemo(
    () => Math.max(800, getXAtTime(viewportState, timeBounds.endTime) + LEFT_PADDING + EVENT_CARD_MAX_WIDTH),
    [viewportState, timeBounds.endTime],
  );

  const relativeDurationUnits = useMemo(
    () => computeRelativeDurationUnits(grid, 200, 16),
    [grid],
  );

  const eventLayout = useMemo(
    () =>
      computeTimelineLayout(filteredEvents, visibleTracks, grid, {
        eventHeight: EVENT_HEIGHT,
        rowGap: EVENT_ROW_GAP,
        baseTop: EVENT_BASE_TOP,
        trackHeight: TRACK_HEIGHT,
        relativeDurationUnits,
      }),
    [filteredEvents, visibleTracks, grid, relativeDurationUnits],
  );

  const timelineMinHeight = useMemo(
    () =>
      visibleTracks.reduce(
        (sum, tr) =>
          sum + (isCollapsed(tr.id) ? TRACK_COLLAPSED_HEIGHT : (eventLayout.trackHeights.get(tr.id) ?? TRACK_HEIGHT)) + TRACK_GAP,
        RULER_HEIGHT,
      ),
    [visibleTracks, isCollapsed, eventLayout],
  );

  // 事件内部时间位置：绝对事件用真实时间戳，相对事件用基于 baseTime 的伪时间戳
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
    const unitMs = grid.getMsPerUnit();
    const fallbackStart = grid.baseTime;
    relativeEvents.forEach((ev, i) => {
      positions.set(ev.id, fallbackStart + i * unitMs * relativeDurationUnits);
    });
    return positions;
  }, [filteredEvents, grid, relativeDurationUnits]);

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

  const aiSelection = useMemo(() => {
    if (!selectedEventId) return null;
    const ev = events.find((e) => e.id === selectedEventId);
    return ev ? { type: 'event' as const, id: ev.id, label: ev.title, content: ev.description ?? '' } : null;
  }, [events, selectedEventId]);

  // 拖拽吸附：根据当前拖动 content-x 计算最近的网格线及阈值内是否触发吸附
  const snapInfo = useMemo(() => {
    if (!dragState) return null;
    const snapTime = getSnapTimeAtX(viewportState, dragState.contentX);
    if (!snapTime) return null;
    const snapX = getSnapXAtTime(viewportState, snapTime);
    const threshold = getSnapThreshold(viewportState);
    const distance = Math.abs(dragState.contentX - snapX);
    const snapped = distance <= threshold;
    const label = snapped ? formatMajorTick(snapTime, chooseTickLevel(viewportState.zoom)) : '';
    return { snapX, snapTime, distance, snapped, label };
  }, [dragState, viewportState]);

  const handleConsistencyCheck = useCallback(async () => {
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
  }, [workspaceId, t]);

  // 导出时间轴为 Markdown：按轨道分组列出事件，含日期/标题/状态
  const handleExportTimeline = useCallback(() => {
    const lines: string[] = [`# ${t('timeline.title')}`, ''];
    for (const tr of visibleTracks) {
      const trackEvents = eventsByTrack.get(tr.id) ?? [];
      if (trackEvents.length === 0) continue;
      lines.push(`## ${tr.name}`, '');
      for (const ev of trackEvents) {
        const dateStr = ev.dateType === 'absolute' && ev.dateValue
          ? new Date(ev.dateValue).toISOString().slice(0, 10)
          : t('timeline.relativeBadge');
        const statusBadge = ev.status === 'done' ? '✅' : ev.status === 'revise' ? '⚠️' : '📝';
        lines.push(`- ${statusBadge} **${dateStr}** ${ev.title}`);
        if (ev.description) lines.push(`  ${ev.description}`);
      }
      lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-${workspaceId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastInfo(t('timeline.exported'));
  }, [t, visibleTracks, eventsByTrack, workspaceId]);

  const handleAddTrack = useCallback(async () => {
    if (!newTrackName.trim()) return;
    await createTrack.mutateAsync({ workspaceId, name: newTrackName.trim() });
    setNewTrackName('');
  }, [createTrack, newTrackName, workspaceId]);

  const handleAddEvent = useCallback(
    async (trackId: string) => {
      const ev = await createEvent.mutateAsync({
        workspaceId,
        trackId,
        title: '新事件',
        dateType: 'relative',
        dateValue: '',
        sortOrder: eventsByTrack.get(trackId)?.length ?? 0,
      });
      setEditingEvent(ev);
      setEventDialogOpen(true);
      selectEvent(ev.id);
    },
    [createEvent, eventsByTrack, workspaceId, selectEvent],
  );

  const handleCanvasDoubleClick = useCallback(
    async (trackId: string, x: number) => {
      const timeDate = viewportGetTimeAtX(x);
      if (!timeDate) return;
      const time = timeDate.getTime();
      const ev = await createEvent.mutateAsync({
        workspaceId,
        trackId,
        title: '新事件',
        dateType: 'absolute',
        dateValue: new Date(time).toISOString().slice(0, 10),
        sortOrder: eventsByTrack.get(trackId)?.length ?? 0,
      });
      setEditingEvent(ev);
      setEventDialogOpen(true);
      selectEvent(ev.id);
    },
    [createEvent, eventsByTrack, viewportGetTimeAtX, workspaceId, selectEvent],
  );

  const handleEventDragEnd = useCallback(
    async (ev: Event, targetTrack: Track, finalX: number) => {
      const cardWidth = getEventCardWidth(ev.title);
      const lanePadding = 4;
      const clampedX = Math.max(lanePadding, Math.min(totalWidth - cardWidth, finalX));

      const updates: Partial<Event> & { id: string } = { id: ev.id };
      if (targetTrack.id !== ev.trackId) {
        updates.trackId = targetTrack.id;
      }

      // 吸附：若释放位置与网格线距离在阈值内，则把最终 x 对齐到网格
      const snapTime = getSnapTimeAtX(viewportState, clampedX);
      const snapX = snapTime ? getSnapXAtTime(viewportState, snapTime) : null;
      const threshold = getSnapThreshold(viewportState);
      const isSnapped = snapX !== null && Math.abs(clampedX - snapX) <= threshold;
      const snappedFinalX = isSnapped
        ? Math.max(lanePadding, Math.min(totalWidth - cardWidth, snapX))
        : clampedX;

      if (ev.dateType === 'absolute') {
        // 直接采用吸附网格时间，避免 timeScale 正反向换算的舍入误差导致日期偏离网格。
        const newTimeDate = isSnapped && snapTime ? snapTime : viewportGetTimeAtX(snappedFinalX);
        if (!newTimeDate) return;
        updates.dateType = 'absolute';
        updates.dateValue = newTimeDate.toISOString().slice(0, 10);
      } else {
        const trackEvents = eventsByTrack.get(targetTrack.id) ?? [];
        const newSort = computeNewSortOrder(ev, snappedFinalX, trackEvents, eventPositions, viewportState);
        if (newSort !== ev.sortOrder || updates.trackId !== undefined) {
          updates.sortOrder = newSort;
        }
      }

      if (Object.keys(updates).length > 1) {
        await updateEvent.mutateAsync(updates);
      }
    },
    [eventPositions, eventsByTrack, viewportGetTimeAtX, viewportState, totalWidth, updateEvent],
  );

  const handleSaveEvent = useCallback(
    async (data: Partial<Event> & { title: string; characterIds: string[]; imageUrls: string[] }) => {
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
    },
    [editingEvent, updateEvent],
  );

  const handleDeleteEvent = useCallback(
    async (id: string) => {
      await deleteEvent.mutateAsync(id);
      if (selectedEventId === id) selectEvent(null);
      setEventDialogOpen(false);
      setEditingEvent(null);
    },
    [deleteEvent, selectedEventId, selectEvent],
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
      selectEvent(newEv.id);
    },
    [createEvent, eventsByTrack, workspaceId, selectEvent],
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
      selectEvent(ev.id);
      setEditingEvent(ev);
      setAiContext({
        view: 'timeline',
        viewLabel: t('timeline.title'),
        selection: { type: 'event', id: ev.id, label: ev.title, content: ev.description ?? '' },
        suggestions: [
          { label: t('ai.suggestTimelinePacing'), prompt: t('ai.promptTimelinePacing') },
          { label: t('ai.suggestTimelineGaps'), prompt: t('ai.promptTimelineGaps') },
          { label: t('ai.suggestNextEvent'), prompt: t('ai.promptNextEvent') },
        ],
      });
      setAiPanelOpen(true);
    },
    [setAiContext, setAiPanelOpen, t, selectEvent],
  );

  const handleSelectEvent = useCallback(
    (eventId: string) => {
      if (pendingConnection && pendingConnection !== eventId) {
        void connectEvents.mutateAsync({
          sourceId: pendingConnection,
          targetId: eventId,
          connectionType,
        });
        setPendingConnection(null);
      } else {
        selectEvent(eventId);
        const ev = events.find((e) => e.id === eventId) ?? null;
        setEditingEvent(ev);
      }
    },
    [connectEvents, connectionType, events, pendingConnection, selectEvent],
  );

  const handleEditEvent = useCallback((ev: Event) => {
    setEditingEvent(ev);
    setEventDialogOpen(true);
  }, []);

  const handleDuplicateEvent = useCallback(
    (ev: Event) => duplicateEvent(ev),
    [duplicateEvent],
  );

  const handleStartConnection = useCallback((id: string) => setPendingConnection(id), []);

  const handleToggleCollapse = useCallback(
    (trackId: string) => toggleTrackCollapse(trackId),
    [toggleTrackCollapse],
  );

  const getEventInitialX = useCallback(
    (id: string) => {
      const position = eventPositions.get(id);
      if (position !== undefined) return getXAtTime(viewportState, position);
      return eventLayout.layouts.get(id)?.x ?? 0;
    },
    [eventPositions, eventLayout, viewportState],
  );

  const handleDragStart = useCallback(
    (id: string, clientX: number, clientY: number) => {
      setDraggingEvent({ id, offsetX: 0, clientX, clientY });
      const initialX = getEventInitialX(id);
      const ev = events.find((e) => e.id === id);
      const targetTrack = resolveTrackAtPointer(clientX, clientY, visibleTracks, id);
      setDragState({
        eventId: id,
        contentX: initialX,
        clientX,
        clientY,
        targetTrackId: targetTrack?.id ?? ev?.trackId ?? null,
      });
    },
    [events, getEventInitialX, visibleTracks],
  );

  const handleDrag = useCallback(
    (id: string, offsetX: number, clientX: number, clientY: number) => {
      setDraggingEvent({ id, offsetX, clientX, clientY });
      const initialX = getEventInitialX(id);
      const contentX = initialX + offsetX;
      const targetTrack = resolveTrackAtPointer(clientX, clientY, visibleTracks, id);
      setDragState({
        eventId: id,
        contentX,
        clientX,
        clientY,
        targetTrackId: targetTrack?.id ?? null,
      });
    },
    [getEventInitialX, visibleTracks],
  );

  const handleDragEndNotify = useCallback(() => {
    setDraggingEvent(null);
    setDragState(null);
  }, []);

  const handleTrackVisibleToggle = useCallback(
    (track: Track) => updateTrack.mutateAsync({ id: track.id, isVisible: !track.isVisible }),
    [updateTrack],
  );

  const handleRenameTrack = useCallback((track: Track) => {
    setEditingTrack(track);
    setTrackDialogOpen(true);
  }, []);

  const handleDeleteTrack = useCallback((track: Track) => setDeleteTrackTarget(track), []);

  const handleChangeTrackColor = useCallback(
    (track: Track, color: string) => updateTrack.mutateAsync({ id: track.id, color }),
    [updateTrack],
  );

  const handleUpdateEventStatus = useCallback(
    (id: string, status: EventStatus) => updateEvent.mutateAsync({ id, status }),
    [updateEvent],
  );

  const handlePatchEvent = useCallback(
    (id: string, patch: Partial<Event>) => updateEvent.mutateAsync({ id, ...patch }),
    [updateEvent],
  );

  const cycleZoom = useCallback(
    (dir: 1 | -1) => {
      setZoom(adjustZoom(zoom, dir));
    },
    [setZoom, zoom],
  );

  const handleZoomIn = useCallback(() => cycleZoom(1), [cycleZoom]);
  const handleZoomOut = useCallback(() => cycleZoom(-1), [cycleZoom]);

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

  const zoomLabel = getZoomLabel(zoom);

  return (
    <>
      <Toolbar
        title={t('timeline.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <div className="flex items-center gap-1" data-testid="timeline-toolbar">
            {/* Group 1: Create */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => handleAddEvent(visibleTracks[0]?.id ?? '')}
              title={t('timeline.addEvent')}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('timeline.addEvent')}</span>
            </Button>
            <div className="w-px h-5 bg-border mx-1" />

            {/* Group 2: Filter */}
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8', hasActiveFilters && 'text-accent')}
              onClick={() => setFilterBarVisible((v) => !v)}
              title={t('timeline.filter')}
              data-testid="timeline-toolbar-filter"
            >
              <Filter className="h-3.5 w-3.5" />
              {hasActiveFilters && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] rounded-full bg-accent/15 text-accent">
                  •
                </span>
              )}
            </Button>
            <div className="w-px h-5 bg-border mx-1" />

            {/* Group 3: View mode + zoom */}
            <ViewModeSegment
              value={viewMode}
              onChange={setViewMode}
              onScriptClick={() => navigate(`/workspaces/${workspaceId}/script`)}
            />
            <Button variant="ghost" size="sm" className="h-8" onClick={handleZoomOut} title={t('timeline.zoomOut')}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-text-secondary min-w-[40px] text-center">
              {t(`timeline.${zoomLabel}`)}
            </span>
            <Button variant="ghost" size="sm" className="h-8" onClick={handleZoomIn} title={t('timeline.zoomIn')}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />

            {/* Group 4: More */}
            <TimelineMoreMenu
              showConnections={showConnections}
              onToggleConnections={() => setShowConnections((v) => !v)}
              onlySelectedConnections={onlySelectedConnections}
              onToggleOnlySelectedConnections={() => setOnlySelectedConnections((v) => !v)}
              connectionType={connectionType}
              onSwitchConnectionType={() => setConnectionType((ty) => (ty === 'causal' ? 'foreshadow' : 'causal'))}
              checkingConsistency={checkingConsistency}
              onCheckConsistency={handleConsistencyCheck}
              aiSelection={aiSelection}
              onExport={() => handleExportTimeline()}
            />
          </div>
        }
      />

      {viewMode === 'timeline' && filterBarVisible && (
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

      <AnimatePresence>
        <motion.div
          key={viewMode}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -2 }}
          transition={reducedMotion ? { duration: 0 } : MOTION_FAST}
          className="flex flex-1 min-h-0 overflow-hidden"
        >
          {viewMode === 'gantt' ? (
        <GanttChart
          tracks={tracks}
          events={events}
          timeScale={timeScale}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
          onEditEvent={handleEditEvent}
          onAddEvent={handleAddEvent}
        />
      ) : viewMode === 'tree' ? (
        <TreeTimeline
          tracks={tracks}
          events={events}
          eventConnections={eventConnections}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
          onEditEvent={handleEditEvent}
        />
      ) : viewMode === 'text' ? (
        <TextTimeline
          tracks={tracks}
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
          onEditEvent={handleEditEvent}
          onAddEvent={handleAddEvent}
          onUpdateEvent={handlePatchEvent}
        />
      ) : (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 轨道面板 */}
        <aside className="w-56 flex-shrink-0 border-r border-border bg-bg-surface flex flex-col">
          <div className="h-11 px-3 flex items-center justify-between border-b border-border bg-bg-elevated">
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
                onToggleVisible={handleTrackVisibleToggle}
                onRename={handleRenameTrack}
                onDelete={handleDeleteTrack}
                onChangeColor={handleChangeTrackColor}
                onAddEvent={handleAddEvent}
                onToggleCollapse={handleToggleCollapse}
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
          data-panning={isPanning}
          className={cn(
            'flex-1 overflow-auto bg-bg-base relative overscroll-x-contain [-webkit-overflow-scrolling:auto]',
            isPanning && 'cursor-grabbing',
          )}
          onWheel={(e) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
              // 以鼠标位置为锚点缩放
              zoomAt(e.clientX, e.deltaY > 0 ? 1 : -1);
              return;
            }
            // 触摸板/触控水平滑动优先使用 deltaX；普通滚轮纵向滚动映射为水平平移
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY * 0.8;
            panBy(delta);
          }}
          onScroll={(e) => {
            const el = e.currentTarget;
            setScrollLeft(el.scrollLeft);
            setViewportWidth(el.clientWidth);
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            // 仅当点击空白处（未命中事件卡片或按钮）时启动画布平移
            const target = e.target as HTMLElement;
            if (target.closest('[data-event-id]') || target.closest('button')) return;
            const el = e.currentTarget;
            panStartRef.current = { x: e.clientX, scrollLeft: el.scrollLeft };
            panElementRef.current = el;
            setIsPanning(true);
            el.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!isPanning || !panStartRef.current) return;
            const deltaX = e.clientX - panStartRef.current.x;
            setScrollLeft(panStartRef.current.scrollLeft + deltaX);
          }}
          onPointerUp={(e) => {
            if (!isPanning) return;
            const el = panElementRef.current ?? e.currentTarget;
            panStartRef.current = null;
            panElementRef.current = null;
            setIsPanning(false);
            el.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={(e) => {
            if (!isPanning) return;
            const el = panElementRef.current ?? e.currentTarget;
            panStartRef.current = null;
            panElementRef.current = null;
            setIsPanning(false);
            el.releasePointerCapture(e.pointerId);
          }}
        >
          {visibleTracks.length === 0 ? (
            <EmptyState
              icon={<TimelineEmptyIllustration className="h-20 w-auto text-text-secondary" />}
              title={t('timeline.emptyStateTitle')}
              description={t('timeline.emptyStateDescription')}
              action={
                <Button
                  onClick={() => {
                    setEditingTrack(null);
                    setTrackDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {t('timeline.emptyStateCta')}
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
                    viewportState={viewportState}
                    totalWidth={totalWidth}
                    isPanning={isPanning}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      const el = e.currentTarget;
                      panStartRef.current = { x: e.clientX, scrollLeft: canvasRef.current?.scrollLeft ?? 0 };
                      panElementRef.current = el;
                      setIsPanning(true);
                      el.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!isPanning || !panStartRef.current) return;
                      const deltaX = e.clientX - panStartRef.current.x;
                      setScrollLeft(panStartRef.current.scrollLeft + deltaX);
                    }}
                    onPointerUp={(e) => {
                      if (!isPanning) return;
                      const el = panElementRef.current ?? e.currentTarget;
                      panStartRef.current = null;
                      panElementRef.current = null;
                      setIsPanning(false);
                      el.releasePointerCapture(e.pointerId);
                    }}
                  />

                  {/* 连线层（SVG，覆盖在轨道上） */}
                  {showConnections && filteredEvents.length > 1 && (
                  <ConnectionLayer
                    events={filteredEvents}
                    tracks={visibleTracks}
                    collapsedTrackIds={filters.collapsedTrackIds}
                    eventPositions={eventPositions}
                    eventLayout={eventLayout}
                    viewportState={viewportState}
                    scrollLeft={scrollLeft}
                    viewportWidth={viewportWidth}
                    pendingConnection={pendingConnection}
                    selectedEventId={selectedEventId}
                    onlySelectedConnections={onlySelectedConnections}
                    eventConnections={eventConnections}
                    draggingEvent={draggingEvent}
                    dragTargetTrackId={dragState?.targetTrackId ?? null}
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
                  eventLayout={eventLayout}
                  viewportState={viewportState}
                  totalWidth={totalWidth}
                  zoom={zoom}
                  scrollLeft={scrollLeft}
                  viewportWidth={viewportWidth}
                  selectedEventId={selectedEventId}
                  pendingConnection={pendingConnection}
                  conflictEventIds={conflictEventIds}
                  copiedEvent={copiedEvent}
                  draggingEvent={draggingEvent}
                  snapX={snapInfo?.snapped ? snapInfo.snapX : null}
                  isDropTarget={dragState?.targetTrackId === tr.id}
                  characters={characters}
                  locations={locations}
                  onSelectEvent={handleSelectEvent}
                  onEditEvent={handleEditEvent}
                  onAddEvent={handleAddEvent}
                  onAddEventToTrack={handleAddEvent}
                  onPasteEvent={pasteEvent}
                  onCanvasDoubleClick={handleCanvasDoubleClick}
                  onEventDragEnd={handleEventDragEnd}
                  onDuplicateEvent={handleDuplicateEvent}
                  onAskAiEvent={openAiForEvent}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onCheckConsistency={handleConsistencyCheck}
                  onDeleteEvent={handleDeleteEvent}
                  onUpdateEventStatus={handleUpdateEventStatus}
                  onStartConnection={handleStartConnection}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragEndNotify={handleDragEndNotify}
                  onToggleCollapse={handleToggleCollapse}
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

      {snapInfo?.snapped && dragState && (
        <DragSnapTooltip
          label={snapInfo.label}
          clientX={dragState.clientX}
          clientY={dragState.clientY}
        />
      )}

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

// ===== 工具栏组件 =====
function ViewModeSegment({
  value,
  onChange,
  onScriptClick,
}: {
  value: 'timeline' | 'gantt' | 'tree' | 'text';
  onChange: (v: 'timeline' | 'gantt' | 'tree' | 'text') => void;
  onScriptClick: () => void;
}) {
  const { t } = useI18n();
  const modes: Array<{ id: typeof value; icon: React.ComponentType<{ className?: string }>; labelKey: string }> = [
    { id: 'timeline', icon: CalendarRange, labelKey: 'timeline.title' },
    { id: 'gantt', icon: GanttIcon, labelKey: 'gantt.title' },
    { id: 'tree', icon: Network, labelKey: 'timeline.treeMode' },
    { id: 'text', icon: List, labelKey: 'timeline.textMode' },
  ];
  return (
    <div
      className="flex bg-bg-elevated rounded-[6px] p-0.5 mr-1"
      data-testid="timeline-viewmode-segment"
    >
      {modes.map((m) => {
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={cn(
              'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
              value === m.id
                ? 'bg-accent/10 text-accent'
                : 'text-text-secondary hover:text-text-primary',
            )}
            title={t(m.labelKey)}
            data-testid={`timeline-viewmode-${m.id}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t(m.labelKey)}</span>
          </button>
        );
      })}
      {/* 剧本视图：独立路由，点击跳转 */}
      <button
        onClick={onScriptClick}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
          'text-text-secondary hover:text-text-primary',
        )}
        title={t('script.title')}
        data-testid="timeline-viewmode-script"
      >
        <FileText className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('script.title')}</span>
      </button>
    </div>
  );
}

function TimelineMoreMenu({
  showConnections,
  onToggleConnections,
  onlySelectedConnections,
  onToggleOnlySelectedConnections,
  connectionType,
  onSwitchConnectionType,
  checkingConsistency,
  onCheckConsistency,
  aiSelection,
  onExport,
}: {
  showConnections: boolean;
  onToggleConnections: () => void;
  onlySelectedConnections: boolean;
  onToggleOnlySelectedConnections: () => void;
  connectionType: 'causal' | 'foreshadow';
  onSwitchConnectionType: () => void;
  checkingConsistency: boolean;
  onCheckConsistency: () => void;
  aiSelection: { type: 'event'; id: string; label: string; content: string } | null;
  onExport: () => void;
}) {
  const { t } = useI18n();
  const setAiPanelOpen = useUIStore((s) => s.setAiPanelOpen);
  const setAiContext = useAiContextStore((s) => s.setContext);
  const [open, setOpen] = useState(false);

  const openAi = () => {
    setAiContext({
      view: 'timeline',
      viewLabel: t('timeline.title'),
      selection: aiSelection,
      suggestions: [
        { label: t('ai.suggestTimelinePacing'), prompt: t('ai.promptTimelinePacing') },
        { label: t('ai.suggestTimelineGaps'), prompt: t('ai.promptTimelineGaps') },
        { label: t('ai.suggestNextEvent'), prompt: t('ai.promptNextEvent') },
      ],
    });
    setAiPanelOpen(true);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="sm" className="gap-1" title={t('common.more')}>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          avoidCollisions
          className={cn(
            'z-50 min-w-[180px] max-w-[260px]',
            'rounded-[8px] border border-border bg-bg-surface shadow-[var(--shadow-elevated)] p-1',
            'focus:outline-none',
          )}
        >
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => {
                onToggleConnections();
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 w-full px-2.5 py-2 rounded-[6px] text-xs text-left transition-colors',
                showConnections ? 'text-accent bg-accent/10' : 'text-text-secondary hover:bg-bg-elevated',
              )}
            >
              <Link2 className="h-3.5 w-3.5" />
              {showConnections ? t('timeline.hideConnections') : t('timeline.showConnections')}
            </button>
            <button
              onClick={() => {
                onSwitchConnectionType();
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-[6px] text-xs text-left text-text-secondary hover:bg-bg-elevated transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              {t('timeline.connectionType')}: {connectionType === 'causal' ? t('timeline.connectionTypeCausal') : t('timeline.connectionTypeForeshadow')}
            </button>
            <button
              onClick={() => {
                onToggleOnlySelectedConnections();
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 w-full px-2.5 py-2 rounded-[6px] text-xs text-left transition-colors',
                onlySelectedConnections ? 'text-accent bg-accent/10' : 'text-text-secondary hover:bg-bg-elevated',
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              {onlySelectedConnections ? t('timeline.showAllConnections') : t('timeline.showSelectedConnectionsOnly')}
            </button>
            <div className="h-px bg-border my-0.5" />
            <button
              onClick={() => {
                onCheckConsistency();
                setOpen(false);
              }}
              disabled={checkingConsistency}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-[6px] text-xs text-left text-text-secondary hover:bg-bg-elevated transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('timeline.consistencyCheck')}
            </button>
            <button
              onClick={openAi}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-[6px] text-xs text-left text-text-secondary hover:bg-bg-elevated transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('ai.ask')}
            </button>
            <div className="h-px bg-border my-0.5" />
            <button
              onClick={() => {
                onExport();
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-[6px] text-xs text-left text-text-secondary hover:bg-bg-elevated transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {t('timeline.export')}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ===== 日期标尺 =====
const DateRuler = memo(function DateRuler({
  viewportState,
  totalWidth,
  isPanning,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  viewportState: ViewportState;
  totalWidth: number;
  isPanning: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const { min, max } = useMemo(() => getViewportTimeScale(viewportState), [viewportState]);
  const { t } = useI18n();
  const [hovered, setHovered] = useState<{ x: number; label: string } | null>(null);

  // 刻度级别由连续 zoom 值决定（四档：year/quarter/month/week/day/hour），
  // 不再依赖离散 ZoomLevel 枚举，保证缩放过程中刻度密度平滑过渡。
  const { majorTicks, minorTicks, todayX, tickLevel } = useMemo(() => {
    const level: TickLevel = chooseTickLevel(viewportState.zoom);
    const majors = getMajorTickTimestamps(min, max, level).map((time) => ({
      time,
      label: formatMajorTick(new Date(time), level),
    }));
    const minors = getMinorTickTimestamps(min, max, level).map((time) => ({ time }));

    // 动态采样主刻度，避免标签重叠：间隔小于预估宽度 + 8px 时跳过
    // 水平坐标必须通过 getXAtTime 计算，保证与事件卡片/连接线/Today 线像素级对齐
    const sampled: typeof majors = [];
    let lastX: number | null = null;
    for (const tick of majors) {
      const x = getXAtTime(viewportState, tick.time);
      const width = estimateLabelWidth(tick.label);
      if (lastX === null || x - lastX >= width + 8) {
        sampled.push(tick);
        lastX = x;
      }
    }

    const now = Date.now();
    const today = now >= min && now <= max ? getXAtTime(viewportState, now) : null;
    return { majorTicks: sampled, minorTicks: minors, todayX: today, tickLevel: level };
  }, [viewportState, min, max]);

  // 次刻度标签：仅在 day/hour 等细粒度级别下显示，避免在 year/quarter 级别下噪点过多
  const showMinorLabels = tickLevel === 'day' || tickLevel === 'hour' || tickLevel === 'week';

  return (
    <div
      data-testid="timeline-ruler"
      className={cn(
        'sticky top-0 z-10 bg-bg-surface border-b border-border',
        isPanning ? 'cursor-grabbing' : 'cursor-grab',
      )}
      style={{ height: RULER_HEIGHT, minWidth: totalWidth }}
      onMouseLeave={() => setHovered(null)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="relative h-full">
        {/* 次刻度 */}
        {minorTicks.map((tick, i) => {
          const x = getXAtTime(viewportState, tick.time);
          if (x < 0 || x > totalWidth) return null;
          return (
            <div
              key={`m-${i}`}
              className="absolute top-0 bottom-0 border-l border-border/20 pointer-events-none"
              style={{ left: x }}
            >
              {showMinorLabels && (
                <span className="absolute top-2 left-1 text-[9px] text-text-tertiary whitespace-nowrap pointer-events-none">
                  {formatMinorTick(new Date(tick.time), tickLevel)}
                </span>
              )}
            </div>
          );
        })}

        {/* 主刻度 */}
        {majorTicks.map((tick, i) => {
          const x = getXAtTime(viewportState, tick.time);
          if (x < 0 || x > totalWidth) return null;
          return (
            <div
              key={i}
              data-testid="timeline-major-tick"
              data-tick-label={tick.label}
              className="absolute top-0 bottom-0 border-l border-border/50 cursor-crosshair"
              style={{ left: x }}
              onMouseEnter={() =>
                setHovered({
                  x,
                  label: formatMajorTick(new Date(tick.time), tickLevel),
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
            <div className="h-full w-px bg-accent/50" />
            <span
              className="absolute top-1 left-0 bg-bg-surface border border-border shadow-sm rounded px-1.5 py-0.5 text-xs text-text-secondary whitespace-nowrap"
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
});

// ===== 单条连接线（带 pathLength 入场动画） =====
const ConnectionPath = memo(function ConnectionPath({
  d,
  stroke,
  strokeWidth,
  strokeDasharray,
  isActive,
  enhanced,
  opacityDuration,
  pathLengthDuration,
  delay,
  onClick,
}: {
  d: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray: string;
  isActive: boolean;
  enhanced: boolean;
  opacityDuration: number;
  pathLengthDuration: number;
  delay: number;
  onClick: () => void;
}) {
  const ref = useRef<SVGPathElement>(null);
  const targetOpacity = isActive ? 0.9 : 0.25;
  return (
    <motion.path
      ref={ref}
      d={d}
      fill="none"
      stroke={stroke}
      strokeDasharray={strokeDasharray}
      initial={enhanced ? { pathLength: 0, opacity: 0 } : { opacity: 0 }}
      animate={{
        ...(enhanced ? { pathLength: 1 } : {}),
        opacity: targetOpacity,
        strokeWidth,
      }}
      whileHover={{ opacity: 0.9, strokeWidth: 2 }}
      transition={{
        pathLength: enhanced
          ? { duration: pathLengthDuration, ease: EASE_STANDARD, delay }
          : { duration: 0 },
        opacity: enhanced
          ? { duration: opacityDuration, ease: EASE_STANDARD, delay }
          : { duration: 0.2, ease: EASE_STANDARD },
        strokeWidth: { duration: 0.15, ease: EASE_STANDARD },
      }}
      onAnimationComplete={() => {
        if (ref.current && enhanced) {
          ref.current.style.strokeDasharray = '';
          ref.current.style.strokeDashoffset = '';
        }
      }}
      className="pointer-events-auto cursor-pointer"
      onClick={onClick}
    />
  );
});

// ===== 连线层（SVG，纯计算，不随滚动测量 DOM） =====
const ConnectionLayer = memo(function ConnectionLayer({
  events,
  tracks,
  collapsedTrackIds,
  eventPositions,
  eventLayout,
  viewportState,
  scrollLeft,
  viewportWidth,
  pendingConnection,
  selectedEventId,
  onlySelectedConnections,
  eventConnections,
  draggingEvent,
  dragTargetTrackId,
  onDisconnect,
}: {
  events: Event[];
  tracks: Track[];
  collapsedTrackIds: string[];
  eventPositions: Map<string, number>;
  eventLayout: { layouts: Map<string, EventLayoutItem>; trackHeights: Map<string, number> };
  viewportState: ViewportState;
  scrollLeft: number;
  viewportWidth: number;
  pendingConnection: string | null;
  selectedEventId: string | null;
  onlySelectedConnections: boolean;
  eventConnections: EventConnection[];
  draggingEvent: { id: string; offsetX: number } | null;
  dragTargetTrackId: string | null;
  onDisconnect: (sourceId: string, targetId: string) => void;
}) {
  const enhancedAnimations = useUIStore((s) => s.enhancedAnimations);
  // 连接线绘制属于 cardBatchEnter 场景的一部分：opacity 180ms + pathLength 220ms。
  // 退化模式下 pathLength 关闭，仅保留 200ms 同步淡入。
  const connectionPreset = getScenePreset('cardBatchEnter', { enhanced: enhancedAnimations });
  const connectionConfig = connectionPreset.connection;

  const buffer = EVENT_CARD_MAX_WIDTH * 2;
  const visibleMin = scrollLeft - buffer;
  const visibleMax = scrollLeft + viewportWidth + buffer;

  const trackTopByIndex = useMemo(() => {
    const map = new Map<number, number>();
    let top = RULER_HEIGHT;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (!track) continue;
      map.set(i, top);
      const height = collapsedTrackIds.includes(track.id)
        ? TRACK_COLLAPSED_HEIGHT
        : (eventLayout.trackHeights.get(track.id) ?? TRACK_HEIGHT);
      top += height + TRACK_GAP;
    }
    return map;
  }, [tracks, collapsedTrackIds, eventLayout]);

  // 连接线端点的水平坐标 SHALL 通过 getXAtTime(viewportState, ...) 计算，
  // 保证与事件卡片左边距、标尺刻度、Today 线像素级对齐。
  // 垂直锚点继续基于 layout/trackTopByIndex 推导，不依赖 DOM 测量。
  // 每个事件预计算完整几何（leftX/rightX/centerX/topY/bottomY/centerY/trackId），
  // 连接锚点按"同轨道/跨轨道"分别取边沿，确保不依赖 DOM 测量即可对齐。
  const eventGeometry = useMemo(() => {
    const map = new Map<
      string,
      {
        leftX: number;
        rightX: number;
        centerX: number;
        topY: number;
        bottomY: number;
        centerY: number;
        trackId: string;
      }
    >();
    for (const ev of events) {
      const x = getXAtTime(viewportState, eventPositions.get(ev.id) ?? 0);
      const layout = eventLayout.layouts.get(ev.id);
      const width = layout?.width ?? getEventCardWidth(ev.title);
      const effectiveTrackId =
        draggingEvent?.id === ev.id && dragTargetTrackId ? dragTargetTrackId : ev.trackId;
      const trackIndex = tracks.findIndex((t) => t.id === effectiveTrackId);
      const trackTop = trackTopByIndex.get(trackIndex) ?? RULER_HEIGHT;
      const offsetX = draggingEvent?.id === ev.id ? draggingEvent.offsetX : 0;
      const cardTopY = trackTop + (layout?.y ?? EVENT_BASE_TOP);
      const cardBottomY = cardTopY + EVENT_HEIGHT;
      const cardCenterY = cardTopY + EVENT_HEIGHT / 2;
      map.set(ev.id, {
        leftX: x + offsetX,
        rightX: x + width + offsetX,
        centerX: x + width / 2 + offsetX,
        topY: cardTopY,
        bottomY: cardBottomY,
        centerY: cardCenterY,
        trackId: effectiveTrackId,
      });
    }
    return map;
  }, [events, eventPositions, eventLayout, viewportState, tracks, trackTopByIndex, draggingEvent, dragTargetTrackId]);

  const visibleConnections = useMemo(() => {
    return eventConnections.filter((conn) => {
      const sg = eventGeometry.get(conn.sourceId);
      const tg = eventGeometry.get(conn.targetId);
      if (!sg || !tg) return false;
      if (onlySelectedConnections && selectedEventId) {
        if (conn.sourceId !== selectedEventId && conn.targetId !== selectedEventId) return false;
      }
      // 用源/目标的中心 X 做可见性裁剪，避免同轨道连接因端点在视口外被误裁
      return (
        (sg.centerX >= visibleMin && sg.centerX <= visibleMax) ||
        (tg.centerX >= visibleMin && tg.centerX <= visibleMax)
      );
    });
  }, [eventConnections, eventGeometry, visibleMin, visibleMax, onlySelectedConnections, selectedEventId]);

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      data-testid="timeline-connection-layer"
    >
      {visibleConnections.map((conn) => {
        const sg = eventGeometry.get(conn.sourceId);
        const tg = eventGeometry.get(conn.targetId);
        if (!sg || !tg) return null;
        // 同轨道：源右沿中点 → 目标左沿中点（水平贝塞尔）
        // 跨轨道：源下沿中点 → 目标上沿中点（垂直贝塞尔）
        const sameTrack = sg.trackId === tg.trackId;
        let sx: number, sy: number, tx: number, ty: number, path: string;
        if (sameTrack) {
          sx = sg.rightX;
          sy = sg.centerY;
          tx = tg.leftX;
          ty = tg.centerY;
          const midX = (sx + tx) / 2;
          path = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
        } else {
          sx = sg.centerX;
          sy = sg.bottomY;
          tx = tg.centerX;
          ty = tg.topY;
          const midY = (sy + ty) / 2;
          path = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
        }
        const isActive =
          pendingConnection === conn.sourceId ||
          pendingConnection === conn.targetId ||
          selectedEventId === conn.sourceId ||
          selectedEventId === conn.targetId;
        const isForeshadow = conn.connectionType === 'foreshadow';
        return (
          <g key={`${conn.sourceId}-${conn.targetId}`}>
            <ConnectionPath
              d={path}
              stroke={isForeshadow ? 'var(--accent-soft)' : isActive ? 'var(--accent)' : 'var(--text-secondary)'}
              strokeWidth={isActive ? 2 : 1}
              strokeDasharray={isForeshadow ? '6 4' : '4 3'}
              isActive={isActive}
              enhanced={connectionPreset.enhanced}
              opacityDuration={connectionConfig?.opacityDuration ?? 0.2}
              pathLengthDuration={connectionConfig?.pathLengthDuration ?? 0}
              delay={connectionConfig?.delay ?? 0}
              onClick={() => onDisconnect(conn.sourceId, conn.targetId)}
            />
            <circle cx={tx} cy={ty} r={3} fill="var(--accent)" opacity={isActive ? 1 : 0.5} className="pointer-events-none" />
          </g>
        );
      })}
    </svg>
  );
});

// ===== 轨道行 =====
interface TrackLaneProps {
  index: number;
  track: Track;
  tracks: Track[];
  collapsed: boolean;
  events: Event[];
  eventPositions: Map<string, number>;
  eventLayout: { layouts: Map<string, EventLayoutItem>; trackHeights: Map<string, number> };
  viewportState: ViewportState;
  totalWidth: number;
  zoom: number;
  scrollLeft: number;
  viewportWidth: number;
  selectedEventId: string | null;
  pendingConnection: string | null;
  conflictEventIds: Set<string>;
  copiedEvent: Event | null;
  draggingEvent: { id: string; offsetX: number; clientX: number; clientY: number } | null;
  snapX: number | null;
  isDropTarget: boolean;
  characters: Character[];
  locations: { id: string; name: string; color?: string }[];
  onSelectEvent: (eventId: string) => void;
  onEditEvent: (ev: Event) => void;
  onAddEvent: (trackId: string) => void;
  onAddEventToTrack: (trackId: string) => void;
  onPasteEvent: (trackId: string) => void;
  onCanvasDoubleClick: (trackId: string, x: number) => void;
  onEventDragEnd: (ev: Event, targetTrack: Track, finalX: number) => void;
  onStartConnection: (id: string) => void;
  onDuplicateEvent: (ev: Event) => void;
  onAskAiEvent: (ev: Event) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEventStatus: (id: string, status: EventStatus) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCheckConsistency: () => void;
  onToggleCollapse: (trackId: string) => void;
  onDragStart: (id: string, clientX: number, clientY: number) => void;
  onDrag: (id: string, offsetX: number, clientX: number, clientY: number) => void;
  onDragEndNotify: () => void;
}

const TrackLane = memo(function TrackLane({
  index,
  track,
  tracks,
  collapsed,
  events,
  eventPositions,
  eventLayout,
  viewportState,
  totalWidth,
  zoom,
  scrollLeft,
  viewportWidth,
  selectedEventId,
  pendingConnection,
  conflictEventIds,
  copiedEvent,
  draggingEvent,
  snapX,
  isDropTarget,
  characters,
  locations,
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
}: TrackLaneProps) {
  const { t } = useI18n();
  const enhancedAnimations = useUIStore((s) => s.enhancedAnimations);
  const cardPreset = getScenePreset('cardBatchEnter', { enhanced: enhancedAnimations });
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
    const min = scrollLeft - VISIBLE_EVENT_BUFFER;
    const max = scrollLeft + viewportWidth + VISIBLE_EVENT_BUFFER;
    return events.filter((ev) => {
      const layout = eventLayout.layouts.get(ev.id);
      if (!layout) return false;
      return layout.x + layout.width >= min && layout.x <= max;
    });
  }, [events, eventLayout, scrollLeft, viewportWidth]);

  const eventXs = useMemo(
    () => events.map((ev) => eventLayout.layouts.get(ev.id)?.x ?? getXAtTime(viewportState, eventPositions.get(ev.id) ?? 0)),
    [events, eventLayout, eventPositions, viewportState],
  );

  const addButtonLeft = useMemo(
    () => computeAddButtonLeft(eventXs, totalWidth, ADD_EVENT_BUTTON_WIDTH, EVENT_CARD_MAX_WIDTH, 12),
    [eventXs, totalWidth],
  );

  const targetHeight = collapsed ? TRACK_COLLAPSED_HEIGHT : (eventLayout.trackHeights.get(track.id) ?? TRACK_HEIGHT);

  const resolveTargetTrack = useCallback(
    (clientX: number, clientY: number, draggedId: string) => {
      const cardEl = document.querySelector(`[data-event-id="${draggedId}"]`) as HTMLElement | null;
      const originalPointerEvents = cardEl?.style.pointerEvents;
      let target: Track | null = null;

      try {
        if (cardEl) cardEl.style.pointerEvents = 'none';

        // 优先使用浏览器命中测试：直接查找指针下方的轨道元素。
        // 这比包围盒计算更稳定，能避免动画中矩形抖动或覆盖层干扰。
        const elements = document.elementsFromPoint(clientX, clientY);
        for (const el of elements) {
          const trackId = el.closest('[data-track-id]')?.getAttribute('data-track-id') ?? null;
          if (!trackId) continue;
          const candidate = tracks.find((t) => t.id === trackId);
          if (candidate) {
            target = candidate;
            break;
          }
        }
      } finally {
        if (cardEl) cardEl.style.pointerEvents = originalPointerEvents ?? '';
      }

      if (target) return target;

      // 兜底：通过所有轨道的包围盒定位指针所在轨道；
      // 若指针横向超出可见区域（内容溢出被裁剪），则仅按纵向位置匹配。
      const lanes = [...document.querySelectorAll('[data-track-id]')].map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          id: el.getAttribute('data-track-id') ?? null,
          rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        };
      });
      const lane =
        lanes.find((l) =>
          l.id !== null && clientX >= l.rect.left && clientX <= l.rect.right && clientY >= l.rect.top && clientY <= l.rect.bottom,
        ) ?? lanes.find((l) => l.id !== null && clientY >= l.rect.top && clientY <= l.rect.bottom);
      const laneId = lane?.id;
      return laneId ? tracks.find((t) => t.id === laneId) ?? track : track;
    },
    [tracks, track],
  );

  const handleDragEnd = useCallback(
    (id: string, finalX: number, clientX: number, clientY: number) => {
      const ev = events.find((e) => e.id === id);
      if (!ev) return;
      const targetTrack = resolveTargetTrack(clientX, clientY, id);
      onEventDragEnd(ev, targetTrack, finalX);
    },
    [events, onEventDragEnd, resolveTargetTrack],
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          ref={containerRef}
          data-track-id={track.id}
          data-testid="track-lane"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0, height: targetHeight }}
          transition={{
            duration: cardPreset.enter.duration,
            ease: cardPreset.enter.ease,
            delay: getElementDelay(index, cardPreset.enter.step),
            height: MOTION_FAST,
          }}
          className={cn(
            'group relative border-b border-border/40 overflow-hidden transition-colors',
            isDropTarget
              ? 'bg-accent/5'
              : index % 2 === 0 ? 'bg-bg-base' : 'bg-bg-surface/40',
          )}
          style={{ minWidth: totalWidth, height: targetHeight }}
          onDoubleClick={(e) => {
            if (collapsed) return;
            // 避免事件卡片的双击冒泡到轨道空白处，从而误创建新事件
            if ((e.target as HTMLElement).closest('[data-event-id]')) return;
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) onCanvasDoubleClick(track.id, e.clientX - rect.left + (containerRef.current?.parentElement?.scrollLeft ?? 0));
          }}
        >
          {/* 轨道左侧色标 */}
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: track.color }} />

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
                  LEFT_PADDING + zoom
                }px, var(--border) ${LEFT_PADDING + zoom}px, var(--border) ${
                  LEFT_PADDING + zoom + 1
                }px)`,
              }}
            />
          )}

          {/* 事件卡片 */}
          {!collapsed && (
            <div className="absolute inset-0">
              <AnimatePresence>
                {visibleEvents.map((ev, i) => {
                  const layout = eventLayout.layouts.get(ev.id);
                  if (!layout) return null;
                  const isDragging = draggingEvent?.id === ev.id;
                  return (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      track={track}
                      index={i}
                      layout={layout}
                      totalWidth={totalWidth}
                      selected={ev.id === selectedEventId}
                      pendingConnection={pendingConnection === ev.id}
                      isConflict={conflictEventIds.has(ev.id)}
                      isNew={newEventIds.has(ev.id)}
                      isDragging={isDragging}
                      characters={characters}
                      locations={locations}
                      onSelect={onSelectEvent}
                      onEdit={onEditEvent}
                      onDragEnd={handleDragEnd}
                      onStartConnection={onStartConnection}
                      onDuplicate={onDuplicateEvent}
                      onAskAi={onAskAiEvent}
                      onDelete={onDeleteEvent}
                      onChangeStatus={onUpdateEventStatus}
                      onDragStart={onDragStart}
                      onDrag={onDrag}
                      onDragEndNotify={onDragEndNotify}
                    />
                  );
                })}
              </AnimatePresence>

              {/* 拖拽 Ghost 占位 */}
              {draggingEvent && (() => {
                const ev = visibleEvents.find((e) => e.id === draggingEvent.id);
                const layout = ev && eventLayout.layouts.get(ev.id);
                if (!ev || !layout) return null;
                return <EventCardGhost layout={layout} color={ev.color ?? track.color} />;
              })()}

              {/* 吸附参考线：仅在指针位于当前轨道且存在有效吸附点时绘制 */}
              {isDropTarget && snapX !== null && <DragSnapHint x={snapX} />}

              {/* 添加按钮 */}
              <button
                onClick={() => onAddEvent(track.id)}
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
            </div>
          )}
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
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: tr.color }} />
              <span className="truncate">{tr.name}</span>
            </ContextMenuItem>
          ))}
        </ContextMenuSection>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onPasteEvent(track.id)} disabled={!copiedEvent} className="gap-2">
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
        <ContextMenuItem onClick={() => onToggleCollapse(track.id)} className="gap-2">
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
});

// ===== 拖拽 Ghost 占位卡片 =====
function EventCardGhost({
  layout,
  color,
}: {
  layout: EventLayoutItem;
  color: string;
}) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = reducedMotion === false;
  return (
    <motion.div
      data-testid="event-card-ghost"
      initial={shouldAnimate ? { opacity: 0 } : { opacity: 0.35 }}
      animate={{ opacity: 0.35 }}
      exit={{ opacity: 0 }}
      transition={shouldAnimate ? MOTION_FAST : { duration: 0 }}
      className="absolute rounded-[8px] border-2 border-dashed border-border/70 bg-bg-elevated pointer-events-none z-30"
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: EVENT_HEIGHT,
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
    </motion.div>
  );
}

// ===== 拖拽吸附参考线 =====
function DragSnapHint({ x }: { x: number }) {
  return (
    <motion.div
      data-testid="drag-snap-hint"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: EASE_STANDARD }}
      className="absolute top-0 bottom-0 pointer-events-none z-40 flex flex-col items-center"
      style={{ left: x }}
    >
      <div className="w-px h-full bg-accent/50 border-l border-dashed border-accent/60" />
      <div className="absolute top-1 h-1.5 w-1.5 rounded-full bg-accent/80" />
    </motion.div>
  );
}

// ===== 拖拽吸附提示（跟随指针） =====
function DragSnapTooltip({
  label,
  clientX,
  clientY,
}: {
  label: string;
  clientX: number;
  clientY: number;
}) {
  return (
    <div
      data-testid="drag-snap-tooltip"
      className="fixed z-50 pointer-events-none px-2 py-1 rounded-[5px] border border-border bg-bg-elevated shadow-[var(--shadow-card)] text-xs text-text-primary whitespace-nowrap"
      style={{
        left: clientX,
        top: clientY - 36,
        transform: 'translateX(-50%)',
      }}
    >
      {label}
    </div>
  );
}

function computeNewSortOrder(
  ev: Event,
  finalX: number,
  trackEvents: Event[],
  eventPositions: Map<string, number>,
  viewportState: ViewportState,
): number {
  const sameType = trackEvents.filter((e) => e.dateType === ev.dateType && e.id !== ev.id);
  const sorted = [...sameType].sort((a, b) => a.sortOrder - b.sortOrder);
  let index = sorted.length;
  for (let i = 0; i < sorted.length; i++) {
    const other = sorted[i]!;
    const ox = getXAtTime(viewportState, eventPositions.get(other.id) ?? 0);
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
  onToggleVisible: (track: Track) => void;
  onRename: (track: Track) => void;
  onDelete: (track: Track) => void;
  onChangeColor: (track: Track, color: string) => void;
  onAddEvent: (trackId: string) => void;
  onToggleCollapse: (trackId: string) => void;
}) {
  const { t } = useI18n();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div data-testid="track-row" className="group flex items-center gap-2.5 px-3 py-2 min-h-10 hover:bg-bg-elevated transition-colors">
      <span
        className="h-3 w-3 rounded-sm flex-shrink-0 shadow-sm"
        style={{ backgroundColor: track.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate leading-tight">{track.name}</div>
        <div className="text-[10px] text-text-secondary/80 mt-0.5">{eventCount} 个事件</div>
      </div>
      <button
        onClick={() => onToggleCollapse(track.id)}
        className={cn(
          'text-text-secondary hover:text-text-primary p-1 rounded transition-colors',
          collapsed && 'text-accent',
        )}
        title={collapsed ? t('contextMenu.expandTrack') : t('contextMenu.collapseTrack')}
      >
        <ChevronsUpDown className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onToggleVisible(track)}
        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
        title={track.isVisible ? t('contextMenu.hide') : t('contextMenu.show')}
      >
        {track.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => onRename(track)}
        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
        title={t('contextMenu.rename')}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onDelete(track)}
        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 p-1 rounded transition-colors"
        title={t('contextMenu.delete')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onRename(track)} className="gap-2">
          <Pencil className="h-3.5 w-3.5" />
          {t('contextMenu.rename')}
        </ContextMenuItem>
        <ContextMenuSection label={t('contextMenu.changeColor')}>
          <div className="px-3 py-1.5 flex gap-1.5 flex-wrap">
            {EVENT_COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChangeColor(track, c)}
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
        <ContextMenuItem onClick={() => onToggleVisible(track)} className="gap-2">
          {track.isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {track.isVisible ? t('contextMenu.hide') : t('contextMenu.show')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onToggleCollapse(track.id)} className="gap-2">
          <ChevronsUpDown className="h-3.5 w-3.5" />
          {collapsed ? t('contextMenu.expandTrack') : t('contextMenu.collapseTrack')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAddEvent(track.id)} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          {t('contextMenu.addEvent')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onDelete(track)} className="gap-2 text-red-500 hover:text-red-500 hover:bg-red-500/10 focus-visible:ring-red-500/40">
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
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 min-h-11 border-b border-border/60 bg-bg-surface/80 backdrop-blur-sm">
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
