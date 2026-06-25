import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, ChevronRight } from 'lucide-react';

import { Button, EmptyState, Input, Textarea } from '@/components/ui';
import { MOTION_BASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { Event, EventStatus, Track } from '@/types';

interface TextTimelineProps {
  tracks: Track[];
  events: Event[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  onEditEvent: (ev: Event) => void;
  onAddEvent: (trackId: string) => void;
  onUpdateEvent: (id: string, patch: Partial<Event>) => void;
}

const STATUS_OPTION: { value: EventStatus; label: string; cls: string }[] = [
  { value: 'draft', label: '草稿', cls: 'text-text-secondary bg-bg-elevated' },
  { value: 'done', label: '完成', cls: 'text-status-done bg-status-done/10' },
  { value: 'revise', label: '待修改', cls: 'text-status-revise bg-status-revise/10' },
];

export function TextTimeline({
  tracks,
  events,
  selectedEventId,
  onSelectEvent,
  onEditEvent,
  onAddEvent,
  onUpdateEvent,
}: TextTimelineProps) {
  const [detailFocus, setDetailFocus] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const tr of tracks) map.set(tr.id, []);
    for (const ev of events) {
      const arr = map.get(ev.trackId);
      if (arr) arr.push(ev);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (a.dateType === 'absolute' && b.dateType === 'absolute' && a.dateValue && b.dateValue) {
          const ta = new Date(a.dateValue).getTime();
          const tb = new Date(b.dateValue).getTime();
          if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
        }
        return a.sortOrder - b.sortOrder;
      });
    }
    return tracks.map((tr) => ({ track: tr, events: map.get(tr.id) ?? [] }));
  }, [tracks, events]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  if (tracks.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-10 w-10" />}
        title="文本模式" // TODO i18n
        description="暂无轨道，请先添加轨道"
        action={
          <Button onClick={() => onAddEvent('')} className="gap-2">
            <Plus className="h-4 w-4" />
            添加轨道
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* 列表 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {grouped.map(({ track, events: trackEvents }, groupIdx) => (
            <motion.section
              key={track.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...MOTION_BASE, delay: Math.min(groupIdx * 0.04, 0.2) }}
              className="rounded-[8px] border border-border bg-bg-surface overflow-hidden"
            >
              <div className="h-10 px-4 flex items-center gap-2 border-b border-border bg-bg-elevated/40">
                <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: track.color }} />
                <span className="text-sm font-semibold text-text-primary flex-1">{track.name}</span>
                <span className="text-xs text-text-secondary">{trackEvents.length} 个事件</span>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onAddEvent(track.id)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {trackEvents.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-text-secondary">
                  该轨道暂无事件
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {trackEvents.map((ev, i) => (
                    <ListRow
                      key={ev.id}
                      event={ev}
                      index={i}
                      selected={ev.id === selectedEventId}
                      onSelect={() => {
                        onSelectEvent(ev.id);
                        setDetailFocus(false);
                      }}
                      onEdit={() => onEditEvent(ev)}
                      onUpdate={(patch) => onUpdateEvent(ev.id, patch)}
                    />
                  ))}
                </ul>
              )}
            </motion.section>
          ))}
        </div>
      </div>

      {/* 详情侧栏（仅正文） */}
      <aside
        className={cn(
          'w-96 flex-shrink-0 border-l border-border bg-bg-surface flex flex-col transition-all',
          selectedEvent ? 'translate-x-0' : 'translate-x-full absolute right-0',
        )}
      >
        {selectedEvent ? (
          <DetailPanel
            event={selectedEvent}
            onUpdate={(patch) => onUpdateEvent(selectedEvent.id, patch)}
            focusBody={detailFocus}
            onFocus={() => setDetailFocus(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm text-center px-6">
            选择一个事件，在右侧专注编辑正文
          </div>
        )}
      </aside>
    </div>
  );
}

function ListRow({
  event,
  index,
  selected,
  onSelect,
  onEdit,
  onUpdate,
}: {
  event: Event;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onUpdate: (patch: Partial<Event>) => void;
}) {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const status = STATUS_OPTION.find((s) => s.value === event.status) ?? STATUS_OPTION[0];

  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...MOTION_BASE, delay: Math.min(index * 0.015, 0.15) }}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
        selected ? 'bg-accent/5' : 'hover:bg-bg-elevated/40',
      )}
      onClick={onSelect}
    >
      <ChevronRight className={cn('h-3.5 w-3.5 text-text-secondary transition-transform', selected && 'rotate-90')} />
      <div className="flex-1 min-w-0">
        <Input
          value={event.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="h-7 text-sm border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:bg-bg-elevated"
        />
      </div>
      <div className="w-28 flex-shrink-0">
        {isEditingDate ? (
          <Input
            value={event.dateValue}
            onChange={(e) => onUpdate({ dateValue: e.target.value })}
            onBlur={() => setIsEditingDate(false)}
            onClick={(e) => e.stopPropagation()}
            className="h-7 text-xs"
            type={event.dateType === 'absolute' ? 'date' : 'text'}
            autoFocus
          />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingDate(true);
            }}
            className="text-xs text-text-secondary hover:text-text-primary truncate"
          >
            {event.dateValue || '无日期'}
          </button>
        )}
      </div>
      <select
        value={event.status}
        onChange={(e) => onUpdate({ status: e.target.value as EventStatus })}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'h-7 px-2 rounded-[5px] text-[10px] border border-transparent outline-none focus:ring-1 focus:ring-accent/40',
          status?.cls,
        )}
      >
        {STATUS_OPTION.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        编辑
      </Button>
    </motion.li>
  );
}

function DetailPanel({
  event,
  onUpdate,
}: {
  event: Event;
  onUpdate: (patch: Partial<Event>) => void;
  focusBody: boolean;
  onFocus: () => void;
}) {
  return (
    <>
      <div className="h-11 px-4 flex items-center border-b border-border bg-bg-elevated/40">
        <span className="text-sm font-semibold text-text-primary truncate flex-1">{event.title}</span>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <label className="text-xs text-text-secondary">正文 / 描述</label> {/* TODO i18n */}
          <Textarea
            value={event.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="mt-1.5 min-h-[60vh] leading-relaxed"
            placeholder="在这里专注写正文…"
            autoFocus
          />
        </div>
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>{event.dateType === 'absolute' ? '📅' : '🔖'} {event.dateValue || '无日期'}</span>
          <span>状态：{STATUS_OPTION.find((s) => s.value === event.status)?.label}</span>
        </div>
      </div>
    </>
  );
}
