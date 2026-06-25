import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, UnfoldVertical } from 'lucide-react';

import { buildEventTree, getVisibleNodes, toggleCollapsed } from '@/features/timeline/treeLayout';
import { MOTION_BASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { Event, EventConnection, Track } from '@/types';

interface TreeTimelineProps {
  tracks: Track[];
  events: Event[];
  eventConnections: EventConnection[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  onEditEvent: (ev: Event) => void;
}

const STATUS_DOT: Record<Event['status'], string> = {
  draft: 'bg-text-secondary/60',
  done: 'bg-status-done',
  revise: 'bg-status-revise',
};

export function TreeTimeline({
  tracks,
  events,
  eventConnections,
  selectedEventId,
  onSelectEvent,
  onEditEvent,
}: TreeTimelineProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const baseLayout = useMemo(
    () => buildEventTree(events, eventConnections),
    [events, eventConnections],
  );

  const layout = useMemo(() => {
    let patched = baseLayout;
    for (const id of collapsed) {
      patched = toggleCollapsed(patched, id);
    }
    return patched;
  }, [baseLayout, collapsed]);

  const visibleNodes = useMemo(() => getVisibleNodes(layout), [layout]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleConnections = useMemo(() => {
    return eventConnections.filter(
      (conn) => visibleIds.has(conn.sourceId) && visibleIds.has(conn.targetId),
    );
  }, [eventConnections, visibleIds]);

  const toggleNode = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const trackMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  return (
    <div className="flex-1 overflow-auto bg-bg-base">
      <div style={{ minWidth: layout.totalWidth, minHeight: layout.totalHeight }} className="relative">
        <svg
          width={layout.totalWidth}
          height={layout.totalHeight}
          className="absolute inset-0 pointer-events-none"
        >
          {visibleConnections.map((conn) => {
            const source = visibleNodes.find((n) => n.id === conn.sourceId);
            const target = visibleNodes.find((n) => n.id === conn.targetId);
            if (!source || !target) return null;
            const sx = source.x + layout.nodeWidth;
            const sy = source.y + layout.nodeHeight / 2;
            const tx = target.x;
            const ty = target.y + layout.nodeHeight / 2;
            const midX = (sx + tx) / 2;
            const isForeshadow = conn.connectionType === 'foreshadow';
            return (
              <path
                key={`${conn.sourceId}-${conn.targetId}`}
                d={`M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.5}
                strokeDasharray={isForeshadow ? '6 4' : '0'}
                opacity={0.5}
              />
            );
          })}
        </svg>

        {visibleNodes.map((node, i) => {
          const track = trackMap.get(node.event.trackId);
          const color = node.event.color ?? track?.color ?? '#F4B6C2';
          const selected = selectedEventId === node.id;
          const hasChildren = node.childIds.length > 0;
          const isCollapsed = collapsed.has(node.id);
          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...MOTION_BASE, delay: Math.min(i * 0.02, 0.2) }}
              className={cn(
                'absolute rounded-[8px] border-2 overflow-hidden cursor-pointer select-none',
                'shadow-[var(--shadow-card)] backdrop-blur-sm',
                selected
                  ? 'border-accent ring-2 ring-accent/30'
                  : 'border-border/60 hover:border-accent/60',
              )}
              style={{
                left: node.x,
                top: node.y,
                width: layout.nodeWidth,
                height: layout.nodeHeight,
                background: `linear-gradient(135deg, ${color}25 0%, ${color}08 100%)`,
              }}
              onClick={() => onSelectEvent(node.id)}
              onDoubleClick={() => onEditEvent(node.event)}
            >
              <div className="h-1 w-full" style={{ backgroundColor: color }} />
              <div className="px-3 py-2 flex flex-col gap-1 h-full">
                <div className="flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', STATUS_DOT[node.event.status])} />
                  <span className="text-xs font-semibold text-text-primary truncate flex-1">
                    {node.event.title}
                  </span>
                </div>
                {node.event.dateValue && (
                  <span className="text-[10px] text-text-secondary truncate">
                    {node.event.dateType === 'absolute' ? '📅' : '🔖'} {node.event.dateValue}
                  </span>
                )}
              </div>

              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(node.id);
                  }}
                  className="absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-bg-elevated border border-border text-text-secondary hover:text-accent flex items-center justify-center shadow-sm"
                  title={isCollapsed ? '展开分支' : '折叠分支'} // TODO i18n
                >
                  {isCollapsed ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                </button>
              )}
            </motion.div>
          );
        })}

        {events.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <UnfoldVertical className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无事件，先在时间轴视图添加事件</p>
              <p className="text-xs opacity-60 mt-1">树状图根据事件连接关系自动布局</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
