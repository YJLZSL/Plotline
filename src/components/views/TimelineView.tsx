import { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import {
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  ZoomIn,
  Clock4,
} from 'lucide-react';

import { Button, EmptyState, Input, Textarea, Label, ConfirmDialog, Dialog, DialogContent } from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import type { Event, EventStatus, Track } from '@/types';
import {
  useCreateEvent,
  useCreateTrack,
  useDeleteEvent,
  useDeleteTrack,
  useEventsQuery,
  useTracksQuery,
  useUpdateEvent,
  useUpdateTrack,
} from '@/features/timeline/hooks';

const TRACK_HEIGHT = 88;
const EVENT_MIN_WIDTH = 160;
const ZOOM_LEVELS = ['hour', 'day', 'month', 'year'] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

interface TimelineViewProps {
  workspaceId: string;
  workspaceName?: string;
}

export function TimelineView({ workspaceId, workspaceName }: TimelineViewProps) {
  const { t } = useI18n();
  const { data: tracks = [] } = useTracksQuery(workspaceId);
  const { data: events = [] } = useEventsQuery(workspaceId);
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

  const visibleTracks = tracks.filter((tr) => tr.isVisible);

  const eventsByTrack = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const tr of tracks) map.set(tr.id, []);
    for (const ev of events) {
      const arr = map.get(ev.trackId);
      if (arr) arr.push(ev);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.sortOrder - b.sortOrder);
    }
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

  const handleSaveEvent = async (data: Partial<Event> & { title: string }) => {
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

  const cycleZoom = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    setZoom(ZOOM_LEVELS[(idx + 1) % ZOOM_LEVELS.length]!);
  };

  return (
    <>
      <Toolbar
        title={t('timeline.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <>
            <Button variant="ghost" size="sm" onClick={cycleZoom} className="gap-1.5">
              <ZoomIn className="h-3.5 w-3.5" />
              <span className="text-xs">{t(`timeline.${zoom}`)}</span>
            </Button>
          </>
        }
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 轨道面板 */}
        <aside className="w-56 flex-shrink-0 border-r border-border bg-bg-surface flex flex-col">
          <div className="h-9 px-3 flex items-center justify-between border-b border-border">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t('timeline.tracks')}
            </span>
            <button
              onClick={() => setTrackDialogOpen(true)}
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
                onToggleVisible={() =>
                  updateTrack.mutateAsync({ id: tr.id, isVisible: !tr.isVisible })
                }
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
        <div className="flex-1 overflow-auto bg-bg-base">
          {visibleTracks.length === 0 ? (
            <EmptyState
              icon={<Clock4 className="h-10 w-10" />}
              title={t('timeline.title')}
              description={t('timeline.emptyTrack')}
              action={
                <Button onClick={() => setTrackDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('timeline.addTrack')}
                </Button>
              }
            />
          ) : (
            <div className="min-w-full" style={{ minWidth: 800 }}>
              {visibleTracks.map((tr) => (
                <TrackLane
                  key={tr.id}
                  track={tr}
                  events={eventsByTrack.get(tr.id) ?? []}
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
                  onAddEvent={() => void handleAddEvent(tr.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 事件编辑对话框 */}
      <EventEditDialog
        open={eventDialogOpen}
        onOpenChange={(v) => {
          setEventDialogOpen(v);
          if (!v) setEditingEvent(null);
        }}
        event={editingEvent}
        tracks={tracks}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      {/* 轨道编辑对话框 */}
      <TrackEditDialog
        open={trackDialogOpen}
        onOpenChange={setTrackDialogOpen}
        track={editingTrack}
        onSave={async (data) => {
          if (editingTrack) {
            await updateTrack.mutateAsync({ id: editingTrack.id, ...data });
          } else if (newTrackName.trim()) {
            await createTrack.mutateAsync({ workspaceId, name: newTrackName.trim(), color: data.color });
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
        description={t('timeline.deleteTrackConfirm', {
          name: deleteTrackTarget?.name ?? '',
        })}
        destructive
        confirmText={t('common.delete')}
        onConfirm={() => {
          if (deleteTrackTarget) void deleteTrack.mutateAsync(deleteTrackTarget.id);
        }}
      />
    </>
  );
}

/** 轨道行（左侧面板项）。 */
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

/** 轨道画布行：渲染轨道上的事件。 */
function TrackLane({
  track,
  events,
  selectedEventId,
  onSelectEvent,
  onEditEvent,
  onAddEvent,
}: {
  track: Track;
  events: Event[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  onEditEvent: (ev: Event) => void;
  onAddEvent: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative border-b border-border"
      style={{
        height: TRACK_HEIGHT,
        backgroundImage: `linear-gradient(90deg, ${track.color}10 0%, transparent 100%)`,
      }}
    >
      {/* 轨道左侧色标 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: track.color }}
      />
      {/* 事件卡片 */}
      <div className="absolute inset-0 pl-4 pr-4 py-2 flex items-center gap-3 overflow-x-auto overflow-y-hidden">
        <AnimatePresence>
          {events.map((ev, i) => (
            <EventCard
              key={ev.id}
              event={ev}
              track={track}
              index={i}
              selected={ev.id === selectedEventId}
              onClick={() => onSelectEvent(ev.id)}
              onDoubleClick={() => onEditEvent(ev)}
            />
          ))}
        </AnimatePresence>
        <button
          onClick={onAddEvent}
          className={cn(
            'flex-shrink-0 h-full flex items-center justify-center gap-1',
            'rounded-[6px] border-2 border-dashed border-border text-text-secondary',
            'hover:border-accent hover:text-accent transition-colors',
          )}
          style={{ width: 80 }}
          title="添加事件"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** 事件卡片：圆角矩形，颜色跟随轨道。 */
function EventCard({
  event,
  track,
  index,
  selected,
  onClick,
  onDoubleClick,
}: {
  event: Event;
  track: Track;
  index: number;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const color = event.color ?? track.color;
  const statusMap: Record<EventStatus, string> = {
    draft: 'bg-text-secondary/60',
    done: 'bg-status-done',
    revise: 'bg-status-revise',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: index * 0.02 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      onDragEnd={(_, info: PanInfo) => {
        // 拖拽距离用于将来调整 sortOrder（v1 暂不实现，留给后续迭代）
        if (Math.abs(info.offset.x) > 60) {
          // TODO: reorder
        }
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex-shrink-0 cursor-pointer select-none',
        'rounded-[8px] p-3 flex flex-col gap-1',
        'shadow-[var(--shadow-card)] transition-shadow',
        'border',
        selected ? 'border-accent ring-2 ring-accent/30' : 'border-border',
      )}
      style={{
        width: EVENT_MIN_WIDTH,
        minHeight: 68,
        backgroundColor: `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)` as unknown as string,
        background: `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', statusMap[event.status])} />
        <span className="text-xs font-semibold text-text-primary truncate flex-1">
          {event.title}
        </span>
      </div>
      {event.dateValue && (
        <span className="text-[10px] text-text-secondary truncate pl-3">
          {event.dateType === 'absolute' ? '📅' : '🔖'} {event.dateValue}
        </span>
      )}
    </motion.div>
  );
}

/** 事件编辑对话框。 */
function EventEditDialog({
  open,
  onOpenChange,
  event,
  tracks,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  tracks: Track[];
  onSave: (data: Partial<Event> & { title: string }) => void;
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 当 event 改变时同步本地状态
  useMemo(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setDateType(event.dateType);
      setDateValue(event.dateValue);
      setStatus(event.status);
      setTrackId(event.trackId);
      setColor(event.color);
    }
  }, [event]);

  if (!event) return null;

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

          <div>
            <Label>{t('timeline.event.characters')}</Label>
            <p className="text-xs text-text-secondary mt-1">
              {event.characterIds.length > 0
                ? `${event.characterIds.length} 个角色已关联`
                : t('characters.noEvents')}
            </p>
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
                onClick={() => onSave({ title, description, dateType, dateValue, status, trackId, color })}
                disabled={!title.trim()}
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

/** 轨道编辑对话框。 */
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

  useMemo(() => {
    if (track) {
      setName(track.name);
      setColor(track.color);
    } else {
      setName('');
      setColor(['#F4B6C2', '#B6D4F4', '#B6F4C8', '#F4E4B6', '#D8B6F4', '#F4CBB6'][Math.floor(Math.random() * 6)] ?? '#F4B6C2');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
