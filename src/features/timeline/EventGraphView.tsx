import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Info, Link2, Plus, Users, Waypoints } from 'lucide-react';

import {
  buildEventGraph,
  GRAPH_NODE_HEIGHT,
  GRAPH_NODE_WIDTH,
  type EventGraphEdge,
  type EventGraphNode,
} from '@/features/timeline/eventGraph';
import { formatEventTimeRange } from '@/lib/time';
import { MOTION_BASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';
import { Button, EmptyState } from '@/components/ui';
import { TimelineEmptyIllustration } from '@/features/timeline/TimelineEmptyIllustration';
import type { Event, EventConnection, Track } from '@/types';

interface EventGraphViewProps {
  tracks: Track[];
  events: Event[];
  eventConnections: EventConnection[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  onEditEvent: (event: Event) => void;
  onAddEvent: (trackId: string) => void;
}

const EDGE_STROKE: Record<EventGraphEdge['connectionType'], string> = {
  causal: 'var(--color-status-done)',
  foreshadow: 'var(--color-status-revise)',
  related: 'var(--text-secondary)',
};

const STATUS_DOT: Record<Event['status'], string> = {
  draft: 'bg-text-secondary/60',
  done: 'bg-status-done',
  revise: 'bg-status-revise',
};

/**
 * v5.0 事件关系时间轴：把 `event_connections` 与旧版 `connectedEventIds`
 * 自动迁移为关系图边。原日历时间轴保持不变，用户可随时切回。
 */
export function EventGraphView({
  tracks,
  events,
  eventConnections,
  selectedEventId,
  onSelectEvent,
  onEditEvent,
  onAddEvent,
}: EventGraphViewProps) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const layout = useMemo(
    () => buildEventGraph(events, eventConnections),
    [events, eventConnections],
  );
  const trackMap = useMemo(() => new Map(tracks.map((tr) => [tr.id, tr])), [tracks]);

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-bg-base">
      {/* 老用户迁移提示：只说明关系，不改动任何旧数据 */}
      {layout.stats.edgeCount > 0 && (
        <div
          className="mx-3 mt-2 flex items-start gap-2 rounded-[8px] border border-accent/20 bg-accent/10 px-3 py-2"
          data-testid="timeline-graph-migration-banner"
        >
          <Info className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-text-primary">{t('timeline.graphMigrationTitle')}</span>
            <span className="text-text-secondary">
              {' '}
              {t('timeline.graphMigrationDescription', {
                count: layout.stats.edgeCount,
                migrated: layout.stats.migratedCount,
              })}
            </span>
          </div>
        </div>
      )}

      {/* 统计条：事件/边/孤立/分支 */}
      {layout.stats.eventCount > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 px-3 py-2 text-[11px] text-text-secondary"
          data-testid="timeline-graph-stats"
        >
          <GraphStat icon={<Waypoints className="h-3.5 w-3.5" />} label={t('timeline.graphNodeCount', { count: layout.stats.eventCount })} />
          <GraphStat icon={<Link2 className="h-3.5 w-3.5" />} label={t('timeline.graphEdgeCount', { count: layout.stats.edgeCount })} />
          <GraphStat icon={<Users className="h-3.5 w-3.5" />} label={t('timeline.graphIsolatedCount', { count: layout.stats.isolatedCount })} />
          <span className="text-text-secondary/70">{t('timeline.graphComponentCount', { count: layout.stats.componentCount })}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto overscroll-contain" data-testid="timeline-graph-canvas">
        {layout.nodes.length === 0 ? (
          <EmptyState
            icon={<TimelineEmptyIllustration className="h-20 w-auto text-text-secondary" />}
            title={t('timeline.graphEmptyTitle')}
            description={t('timeline.graphEmptyDescription')}
            action={
              <Button onClick={() => onAddEvent(tracks[0]?.id ?? '')} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('timeline.addEvent')}
              </Button>
            }
          />
        ) : (
          <div
            style={{ minWidth: layout.totalWidth, minHeight: layout.totalHeight }}
            className="relative"
          >
            <svg
              width={layout.totalWidth}
              height={layout.totalHeight}
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="graph-arrow"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor" />
                </marker>
              </defs>
              {layout.edges.map((edge) => (
                <GraphEdge key={edge.id} edge={edge} layoutNodes={layout.nodes} />
              ))}
            </svg>

            {layout.nodes.map((node, index) => (
              <GraphNode
                key={node.id}
                node={node}
                index={index}
                reduced={reducedMotion ?? false}
                track={trackMap.get(node.event.trackId)}
                selected={selectedEventId === node.id}
                ariaLabel={t('timeline.graphNodeAria', {
                  title: node.event.title,
                  date: formatEventTimeRange(node.event),
                  inDegree: node.inDegree,
                  outDegree: node.outDegree,
                })}
                onSelect={() => onSelectEvent(node.id)}
                onEdit={() => onEditEvent(node.event)}
              />
            ))}

            {/* 关系类型图例 */}
            <div
              className="absolute left-3 bottom-3 flex items-center gap-3 rounded-[8px] border border-border bg-bg-surface/90 px-3 py-2 text-[10px] text-text-secondary shadow-[var(--shadow-card)]"
              aria-label={t('timeline.graphLegend')}
            >
              {(['causal', 'foreshadow', 'related'] as const).map((type) => (
                <span key={type} className="flex items-center gap-1.5">
                  <span
                    className="h-0.5 w-5 rounded-full"
                    style={{ backgroundColor: EDGE_STROKE[type] }}
                  />
                  {t(`timeline.graphEdge${type.charAt(0).toUpperCase()}${type.slice(1)}`)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GraphStat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-border bg-bg-surface px-2 py-0.5">
      {icon}
      {label}
    </span>
  );
}

const GraphEdge = memo(function GraphEdge({
  edge,
  layoutNodes,
}: {
  edge: EventGraphEdge;
  layoutNodes: EventGraphNode[];
}) {
  const source = layoutNodes.find((n) => n.id === edge.sourceId);
  const target = layoutNodes.find((n) => n.id === edge.targetId);
  if (!source || !target) return null;

  const sx = source.x + GRAPH_NODE_WIDTH;
  const sy = source.y + GRAPH_NODE_HEIGHT / 2;
  const tx = target.x;
  const ty = target.y + GRAPH_NODE_HEIGHT / 2;
  const bend = Math.max(48, (tx - sx) * 0.42);
  const cx1 = sx + bend;
  const cx2 = tx - bend;
  const isDashed = edge.connectionType !== 'causal';

  return (
    <g data-testid={`graph-edge-${edge.sourceId}-${edge.targetId}`}>
      <path
        d={`M ${sx} ${sy} C ${cx1} ${sy}, ${cx2} ${ty}, ${tx} ${ty}`}
        fill="none"
        stroke={EDGE_STROKE[edge.connectionType]}
        strokeWidth={1.5}
        strokeDasharray={isDashed ? '6 4' : undefined}
        markerEnd="url(#graph-arrow)"
        className="text-current"
        opacity={0.65}
      >
        <title>{`${edge.sourceTitle} → ${edge.targetTitle}`}</title>
      </path>
    </g>
  );
});

const GraphNode = memo(function GraphNode({
  node,
  index,
  track,
  selected,
  ariaLabel,
  reduced,
  onSelect,
  onEdit,
}: {
  node: EventGraphNode;
  index: number;
  track: Track | undefined;
  selected: boolean;
  ariaLabel: string;
  reduced: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const color = node.event.color ?? track?.color ?? '#F4B6C2';
  const timeLabel = formatEventTimeRange(node.event);

  return (
    <motion.button
      type="button"
      initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduced ? { duration: 0 } : { ...MOTION_BASE, delay: Math.min(index * 0.02, 0.2) }}
      className={cn(
        'absolute rounded-[10px] border-2 text-left cursor-pointer select-none',
        'shadow-[var(--shadow-card)] bg-bg-surface hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        selected ? 'border-accent ring-2 ring-accent/30' : 'border-border/60',
      )}
      style={{
        left: node.x,
        top: node.y,
        width: GRAPH_NODE_WIDTH,
        height: GRAPH_NODE_HEIGHT,
        background: `linear-gradient(135deg, ${color}2b 0%, var(--bg-surface) 65%)`,
      }}
      data-testid={`graph-node-${node.id}`}
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      <span
        className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[8px]"
        style={{ backgroundColor: color }}
      />
      <span className="flex h-full flex-col gap-1 px-3 pt-2.5 pb-2">
        <span className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', STATUS_DOT[node.event.status])} />
          <span className="truncate text-xs font-semibold text-text-primary">{node.event.title}</span>
        </span>
        {timeLabel && (
          <span className="truncate text-[10px] text-text-secondary tabular-nums">
            {node.event.dateType === 'absolute' ? '📅' : '🔖'} {timeLabel}
          </span>
        )}
        <span className="flex items-center gap-2 text-[10px] text-text-secondary/80">
          {track && (
            <span className="flex min-w-0 items-center gap-1">
              <span className="h-2 w-2 rounded-[3px] flex-shrink-0" style={{ backgroundColor: track.color }} />
              <span className="truncate">{track.name}</span>
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 flex-shrink-0">
            <span className="rounded-[4px] bg-bg-elevated px-1">{node.inDegree}←</span>
            <span className="rounded-[4px] bg-bg-elevated px-1">→{node.outDegree}</span>
          </span>
        </span>
      </span>
    </motion.button>
  );
});
