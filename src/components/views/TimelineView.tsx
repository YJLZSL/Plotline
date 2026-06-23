import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import {
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  ZoomIn,
  ZoomOut,
  Clock4,
  Link2,
  ShieldCheck,
  GanttChart as GanttIcon,
  CalendarRange,
} from 'lucide-react';
import { GanttChart } from './GanttChart';

import {
  Button,
  EmptyState,
  Input,
  Textarea,
  Label,
  ConfirmDialog,
  Dialog,
  DialogContent,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
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
  useEventConnectionsQuery,
} from '@/features/timeline/hooks';
import { useCharactersQuery } from '@/features/characters/hooks';
import { checkConsistency } from '@/features/timeline/eventApi';
import { AiToolbarButton } from '@/features/ai/components/AiToolbarButton';
import { useAiContextStore } from '@/stores/aiContext';
import { toastError, toastInfo, toastWarning } from '@/stores/toast';

// ===== 常量 =====
const TRACK_HEIGHT = 92;
const TRACK_GAP = 6;
const EVENT_MIN_WIDTH = 180;
const EVENT_HEIGHT = 64;
const RULER_HEIGHT = 44;
const LEFT_PADDING = 24;
const ZOOM_LEVELS = ['hour', 'day', 'month', 'year'] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

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
  const { data: tracks = [] } = useTracksQuery(workspaceId);
  const { data: events = [] } = useEventsQuery(workspaceId);
  const { data: characters = [] } = useCharactersQuery(workspaceId);
  const createTrack = useCreateTrack(workspaceId);
  const updateTrack = useUpdateTrack(workspaceId);
  const deleteTrack = useDeleteTrack(workspaceId);
  const createEvent = useCreateEvent(workspaceId);
  const updateEvent = useUpdateEvent(workspaceId);
  const deleteEvent = useDeleteEvent(workspaceId);

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
  const [viewMode, setViewMode] = useState<'timeline' | 'gantt'>('timeline');
  const [connectionType, setConnectionType] = useState<'causal' | 'foreshadow'>('causal');
  const connectEvents = useConnectEvents(workspaceId);
  const { data: eventConnections = [] } = useEventConnectionsQuery(workspaceId);
  const setAiContext = useAiContextStore((s) => s.setContext);

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

  // 计算时间轴范围：找出所有绝对日期事件的最早/最晚时间
  const { timeRange, eventPositions } = useMemo(() => {
    const absoluteEvents = events.filter((e) => e.dateType === 'absolute' && e.dateValue);
    let minTime = Date.now();
    let maxTime = Date.now() + 365 * 24 * 3600 * 1000;
    if (absoluteEvents.length > 0) {
      const times = absoluteEvents.map((e) => new Date(e.dateValue).getTime()).filter((n) => !Number.isNaN(n));
      if (times.length > 0) {
        minTime = Math.min(...times);
        maxTime = Math.max(...times);
        // 留一些边距
        const span = maxTime - minTime || 365 * 24 * 3600 * 1000;
        minTime -= span * 0.1;
        maxTime += span * 0.15;
      }
    }
    // 把相对事件按 sortOrder 排在绝对事件之前/之后
    const positions = new Map<string, number>();
    events.forEach((ev) => {
      if (ev.dateType === 'absolute' && ev.dateValue) {
        const t = new Date(ev.dateValue).getTime();
        if (!Number.isNaN(t)) {
          positions.set(ev.id, t);
        }
      }
    });
    // 相对事件按 sortOrder 排布
    const relativeEvents = events
      .filter((e) => e.dateType !== 'absolute' || !positions.has(e.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const unit = ZOOM_UNIT_WIDTH[zoom];
    const fallbackStart = minTime;
    relativeEvents.forEach((ev, i) => {
      positions.set(ev.id, fallbackStart + i * unit * 2 * 24 * 3600 * 1000);
    });
    return { timeRange: { min: minTime, max: maxTime }, eventPositions: positions };
  }, [events, zoom]);

  const totalWidth = Math.max(
    800,
    (timeRange.max - timeRange.min) / (24 * 3600 * 1000) * ZOOM_UNIT_WIDTH[zoom] +
      LEFT_PADDING * 2 +
      EVENT_MIN_WIDTH,
  );

  // 时间 → x 坐标
  const timeToX = useCallback(
    (time: number) => {
      const unit = ZOOM_UNIT_WIDTH[zoom];
      const msPerUnit =
        zoom === 'hour'
          ? 3600 * 1000
          : zoom === 'day'
            ? 24 * 3600 * 1000
            : zoom === 'month'
              ? 30 * 24 * 3600 * 1000
              : 365 * 24 * 3600 * 1000;
      return LEFT_PADDING + ((time - timeRange.min) / msPerUnit) * unit;
    },
    [timeRange.min, zoom],
  );

  // x → 时间
  const xToTime = useCallback(
    (x: number) => {
      const unit = ZOOM_UNIT_WIDTH[zoom];
      const msPerUnit =
        zoom === 'hour'
          ? 3600 * 1000
          : zoom === 'day'
            ? 24 * 3600 * 1000
            : zoom === 'month'
              ? 30 * 24 * 3600 * 1000
              : 365 * 24 * 3600 * 1000;
      return timeRange.min + ((x - LEFT_PADDING) / unit) * msPerUnit;
    },
    [timeRange.min, zoom],
  );

  const eventsByTrack = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const tr of tracks) map.set(tr.id, []);
    for (const ev of events) {
      const arr = map.get(ev.trackId);
      if (arr) arr.push(ev);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    return map;
  }, [tracks, events]);

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
    const time = xToTime(x);
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

  const handleEventDragEnd = async (ev: Event, track: Track, info: PanInfo, x: number) => {
    const newTime = xToTime(x + info.offset.x);
    const newSort = ev.sortOrder + Math.round(info.offset.x / 40);
    await updateEvent.mutateAsync({
      id: ev.id,
      dateType: 'absolute',
      dateValue: new Date(newTime).toISOString().slice(0, 10),
      sortOrder: newSort,
      trackId: track.id,
    });
  };

  const handleSaveEvent = async (data: Partial<Event> & { title: string; characterIds: string[] }) => {
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
    });
    setEventDialogOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent.mutateAsync(id);
    if (selectedEventId === id) setSelectedEventId(null);
    setEventDialogOpen(false);
    setEditingEvent(null);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, eventDialogOpen]);

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

      {viewMode === 'gantt' ? (
        <GanttChart
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
                onToggleVisible={() => updateTrack.mutateAsync({ id: tr.id, isVisible: !tr.isVisible })}
                onRename={() => {
                  setEditingTrack(tr);
                  setTrackDialogOpen(true);
                }}
                onDelete={() => setDeleteTrackTarget(tr)}
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
          className="flex-1 overflow-auto bg-bg-base relative"
          onWheel={(e) => {
            const el = e.currentTarget;
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              cycleZoom(e.deltaY > 0 ? 1 : -1);
            } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.preventDefault();
              el.scrollLeft += e.deltaY * 0.8;
            }
          }}
        >
          {visibleTracks.length === 0 ? (
            <EmptyState
              icon={<Clock4 className="h-10 w-10" />}
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
            <div style={{ minWidth: totalWidth, minHeight: visibleTracks.length * (TRACK_HEIGHT + TRACK_GAP) + RULER_HEIGHT }}>
              {/* 日期标尺 */}
              <DateRuler
                min={timeRange.min}
                max={timeRange.max}
                zoom={zoom}
                timeToX={timeToX}
                totalWidth={totalWidth}
              />

              {/* 连线层（SVG，覆盖在轨道上） */}
              {showConnections && events.length > 1 && (
              <ConnectionLayer
                events={events}
                tracks={visibleTracks}
                eventPositions={eventPositions}
                timeToX={timeToX}
                pendingConnection={pendingConnection}
                selectedEventId={selectedEventId}
                eventConnections={eventConnections}
              />
              )}

              {/* 轨道 */}
              {visibleTracks.map((tr, idx) => (
                <TrackLane
                  key={tr.id}
                  index={idx}
                  track={tr}
                  events={eventsByTrack.get(tr.id) ?? []}
                  eventPositions={eventPositions}
                  timeToX={timeToX}
                  totalWidth={totalWidth}
                  zoom={zoom}
                  selectedEventId={selectedEventId}
                  pendingConnection={pendingConnection}
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
                  onCanvasDoubleClick={(x) => void handleCanvasDoubleClick(tr.id, x)}
                  onEventDragEnd={handleEventDragEnd}
                  onStartConnection={(id) => setPendingConnection(id)}
                />
              ))}
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

      <EventEditDialog
        open={eventDialogOpen}
        onOpenChange={(v) => {
          setEventDialogOpen(v);
          if (!v) setEditingEvent(null);
        }}
        event={editingEvent}
        tracks={tracks}
        characters={characters}
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
  min,
  max,
  zoom,
  timeToX,
  totalWidth,
}: {
  min: number;
  max: number;
  zoom: ZoomLevel;
  timeToX: (t: number) => number;
  totalWidth: number;
}) {
  const { t, i18n } = useI18n();
  const [hovered, setHovered] = useState<{ x: number; label: string } | null>(null);

  const { majorTicks, minorTicks, todayX } = useMemo(() => {
    const majors: Array<{ time: number; label: string }> = [];
    const minors: Array<{ time: number }> = [];
    const fmt = new Intl.DateTimeFormat(i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US', {
      ...ZOOM_RULER_FORMAT[zoom],
    });
    let cur = new Date(min);
    if (zoom === 'hour') cur.setMinutes(0, 0, 0);
    if (zoom === 'day') cur.setHours(0, 0, 0, 0);
    if (zoom === 'month') cur.setDate(1);
    if (zoom === 'year') cur.setMonth(0, 1);

    const pushMajor = (d: Date) => {
      majors.push({ time: d.getTime(), label: fmt.format(d) });
    };
    const pushMinor = (d: Date) => {
      minors.push({ time: d.getTime() });
    };

    while (cur.getTime() < max) {
      const t = cur.getTime();
      if (t >= min) pushMajor(new Date(cur));
      if (zoom === 'hour') {
        for (let i = 1; i < 6; i++) pushMinor(new Date(t + i * 3600 * 1000));
        cur = new Date(t + 6 * 3600 * 1000);
      } else if (zoom === 'day') {
        for (let i = 1; i < 7; i++) pushMinor(new Date(t + i * 24 * 3600 * 1000));
        cur = new Date(t + 7 * 24 * 3600 * 1000);
      } else if (zoom === 'month') {
        pushMinor(new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
        pushMinor(new Date(cur.getFullYear(), cur.getMonth() + 2, 1));
        cur = new Date(cur.getFullYear(), cur.getMonth() + 3, 1);
      } else {
        pushMinor(new Date(cur.getFullYear(), 6, 1));
        cur = new Date(cur.getFullYear() + 1, 0, 1);
      }
    }

    const now = Date.now();
    const today = now >= min && now <= max ? timeToX(now) : null;
    return { majorTicks: majors, minorTicks: minors, todayX: today };
  }, [min, max, zoom, timeToX, i18n.language]);

  return (
    <div
      className="sticky top-0 z-10 bg-bg-surface border-b border-border"
      style={{ height: RULER_HEIGHT, minWidth: totalWidth }}
      onMouseLeave={() => setHovered(null)}
    >
      <div className="relative h-full">
        {/* 次刻度 */}
        {minorTicks.map((tick, i) => {
          const x = timeToX(tick.time);
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
          const x = timeToX(tick.time);
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
            <span className="absolute top-1 -translate-x-1/2 left-0 text-[9px] font-bold text-red-500 bg-bg-surface px-1 rounded">
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

// ===== 连线层（SVG） =====
function ConnectionLayer({
  events,
  tracks,
  eventPositions,
  timeToX,
  pendingConnection,
  selectedEventId,
  eventConnections,
}: {
  events: Event[];
  tracks: Track[];
  eventPositions: Map<string, number>;
  timeToX: (t: number) => number;
  pendingConnection: string | null;
  selectedEventId: string | null;
  eventConnections: EventConnection[];
}) {
  const trackIndex = (id: string) => tracks.findIndex((t) => t.id === id);
  const eventY = (ev: Event) => {
    const ti = trackIndex(ev.trackId);
    if (ti < 0) return 0;
    return RULER_HEIGHT + ti * (TRACK_HEIGHT + TRACK_GAP) + TRACK_HEIGHT / 2;
  };

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    >
      {eventConnections.map((conn) => {
        const source = events.find((e) => e.id === conn.sourceId);
        const target = events.find((e) => e.id === conn.targetId);
        if (!source || !target) return null;
        const sx = timeToX(eventPositions.get(conn.sourceId) ?? 0);
        const sy = eventY(source);
        const tx = timeToX(eventPositions.get(conn.targetId) ?? 0);
        const ty = eventY(target);
        const midX = (sx + tx) / 2;
        const isActive =
          pendingConnection === conn.sourceId ||
          pendingConnection === conn.targetId ||
          selectedEventId === conn.sourceId ||
          selectedEventId === conn.targetId;
        const isForeshadow = conn.connectionType === 'foreshadow';
        const path = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
        return (
          <g key={`${conn.sourceId}-${conn.targetId}`}>
            <path
              d={path}
              fill="none"
              stroke={isForeshadow ? 'var(--accent-soft)' : isActive ? 'var(--accent)' : 'var(--text-secondary)'}
              strokeWidth={isActive ? 2 : 1.5}
              strokeDasharray={isForeshadow ? '6 4' : '4 3'}
              opacity={isActive ? 0.9 : 0.4}
            />
            <circle cx={tx} cy={ty} r={3} fill="var(--accent)" opacity={isActive ? 1 : 0.5} />
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
  events,
  eventPositions,
  timeToX,
  totalWidth,
  zoom,
  selectedEventId,
  pendingConnection,
  onSelectEvent,
  onEditEvent,
  onAddEvent,
  onCanvasDoubleClick,
  onEventDragEnd,
  onStartConnection,
}: {
  index: number;
  track: Track;
  events: Event[];
  eventPositions: Map<string, number>;
  timeToX: (t: number) => number;
  totalWidth: number;
  zoom: ZoomLevel;
  selectedEventId: string | null;
  pendingConnection: string | null;
  onSelectEvent: (id: string) => void;
  onEditEvent: (ev: Event) => void;
  onAddEvent: () => void;
  onCanvasDoubleClick: (x: number) => void;
  onEventDragEnd: (ev: Event, track: Track, info: PanInfo, x: number) => void;
  onStartConnection: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...MOTION_BASE, delay: Math.min(index * 0.04, 0.2) }}
      className={cn(
        'group relative border-b border-border/40',
        index % 2 === 0 ? 'bg-bg-base' : 'bg-bg-surface/40',
      )}
      style={{
        height: TRACK_HEIGHT,
        minWidth: totalWidth,
      }}
      onDoubleClick={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) onCanvasDoubleClick(e.clientX - rect.left + (containerRef.current?.parentElement?.scrollLeft ?? 0));
      }}
    >
      {/* 轨道左侧色标 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: track.color }}
      />

      {/* 时间网格背景 */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent ${
            ZOOM_UNIT_WIDTH[zoom]
          }px, var(--border) ${ZOOM_UNIT_WIDTH[zoom]}px, var(--border) ${
            ZOOM_UNIT_WIDTH[zoom] + 1
          }px)`,
        }}
      />

      {/* 事件卡片 */}
      <div className="absolute inset-0 px-6">
        <AnimatePresence>
          {events.map((ev, i) => {
            const x = timeToX(eventPositions.get(ev.id) ?? 0);
            return (
              <EventCard
                key={ev.id}
                event={ev}
                track={track}
                index={i}
                x={x}
                selected={ev.id === selectedEventId}
                pendingConnection={pendingConnection === ev.id}
                onClick={() => onSelectEvent(ev.id)}
                onDoubleClick={() => onEditEvent(ev)}
                onDragEnd={(info) => onEventDragEnd(ev, track, info, x)}
                onStartConnection={() => onStartConnection(ev.id)}
              />
            );
          })}
        </AnimatePresence>

        {/* 添加按钮 */}
        <button
          onClick={onAddEvent}
          data-testid="add-event-btn"
          className={cn(
            'absolute top-3 flex items-center justify-center gap-1',
            'rounded-[6px] border-2 border-dashed border-border/70 text-text-secondary',
            'hover:border-accent hover:text-accent transition-colors',
          )}
          style={{ left: 8, width: 72, height: EVENT_HEIGHT }}
          title="添加事件"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ===== 事件卡片 =====
function EventCard({
  event,
  track,
  index,
  x,
  selected,
  pendingConnection,
  onClick,
  onDoubleClick,
  onDragEnd,
  onStartConnection,
}: {
  event: Event;
  track: Track;
  index: number;
  x: number;
  selected: boolean;
  pendingConnection: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onDragEnd: (info: PanInfo) => void;
  onStartConnection: () => void;
}) {
  const { t } = useI18n();
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ ...MOTION_BASE, delay: Math.min(index * 0.015, 0.1) }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={(_, info) => onDragEnd(info)}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      title={`${event.title}${event.dateValue ? ` · ${event.dateValue}` : ''}`}
      className={cn(
        'absolute top-3 cursor-grab active:cursor-grabbing select-none',
        'rounded-[8px] overflow-hidden',
        'shadow-[var(--shadow-card)] transition-shadow',
        'border-2 backdrop-blur-sm',
        selected
          ? 'border-accent ring-2 ring-accent/30 shadow-[var(--shadow-elevated)]'
          : cn('border-border/60 hover:shadow-[var(--shadow-elevated)]', status.border),
        pendingConnection && 'border-accent animate-pulse',
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

      <div className="px-3 py-2 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', status.dot)} />
          <span className="text-xs font-semibold text-text-primary truncate flex-1">
            {event.title}
          </span>
          {isRelative && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-bg-elevated text-text-secondary border border-border/50">
              {t('timeline.relativeBadge')}
            </span>
          )}
          {/* 连线手柄 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnection();
            }}
            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-accent p-0.5 rounded transition-all"
            title={t('timeline.startConnection')}
          >
            <Link2 className="h-3 w-3" />
          </button>
        </div>
        {event.dateValue && (
          <span className="text-[10px] text-text-secondary truncate">
            {event.dateType === 'absolute' ? '📅' : '🔖'} {event.dateValue}
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
  );
}

// ===== 轨道行（左侧面板项） =====
function TrackRow({
  track,
  eventCount,
  onToggleVisible,
  onRename,
  onDelete,
}: {
  track: Track;
  eventCount: number;
  onToggleVisible: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 px-3 py-2 hover:bg-bg-elevated transition-colors">
      <span
        className="h-3 w-3 rounded-sm flex-shrink-0 shadow-sm"
        style={{ backgroundColor: track.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">{track.name}</div>
        <div className="text-[10px] text-text-secondary">{eventCount} 个事件</div>
      </div>
      <button
        onClick={onToggleVisible}
        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary p-1 rounded transition-all"
        title={track.isVisible ? '隐藏' : '显示'}
      >
        {track.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={onRename}
        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary p-1 rounded transition-all"
        title="重命名"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 p-1 rounded transition-all"
        title="删除"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ===== 事件编辑对话框 =====
function EventEditDialog({
  open,
  onOpenChange,
  event,
  tracks,
  characters,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  tracks: Track[];
  characters: Character[];
  onSave: (data: Partial<Event> & { title: string; characterIds: string[] }) => void;
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
    }
  }, [event]);

  if (!event) return null;

  const toggleCharacter = (id: string) => {
    setCharacterIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('timeline.addEvent')} className="max-w-lg">
        <div className="flex flex-col gap-4">
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
            <Label>{t('timeline.event.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-[100px]"
              placeholder="事件详细描述…"
            />
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
                          'flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition-all',
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
                  onSave({ title, description, dateType, dateValue, status, trackId, color, characterIds })
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
      setColor(
        ['#F4B6C2', '#B6D4F4', '#B6F4C8', '#F4E4B6', '#D8B6F4', '#F4CBB6'][
          Math.floor(Math.random() * 6)
        ] ?? '#F4B6C2',
      );
    }
  }, [track, open]);

  const palette = ['#F4B6C2', '#B6D4F4', '#B6F4C8', '#F4E4B6', '#D8B6F4', '#F4CBB6'];

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
