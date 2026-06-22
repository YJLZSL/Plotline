import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { EmptyState, Button } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { Clock4, Plus } from 'lucide-react';
import { computeGanttLayout } from '@/features/timeline/ganttLayout';
import { MOTION_BASE } from '@/lib/motion';
import type { Event, Track } from '@/types';

const STATUS_DOT: Record<Event['status'], string> = {
  draft: '#9b9b9b',
  done: '#7fb58c',
  revise: '#e0a95c',
};

interface GanttChartProps {
  tracks: Track[];
  events: Event[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  onEditEvent: (ev: Event) => void;
  onAddEvent: (trackId: string) => void;
}

export function GanttChart({
  tracks,
  events,
  selectedEventId,
  onSelectEvent,
  onEditEvent,
  onAddEvent,
}: GanttChartProps) {
  const { t } = useI18n();
  const layout = useMemo(
    () => computeGanttLayout(tracks, events),
    [tracks, events],
  );

  if (layout.rowCount === 0) {
    return (
      <EmptyState
        icon={<Clock4 className="h-10 w-10" />}
        title={t('gantt.title')}
        description={t('timeline.emptyTrack')}
      />
    );
  }

  if (layout.bars.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="min-w-[640px]">
          {layout.rowLabels.map((row) => (
            <div
              key={row.trackId}
              className="flex items-center gap-3 mb-2 rounded-[8px] border border-border/60 bg-bg-surface p-3"
              style={{ height: 56 }}
            >
              <span
                className="h-3 w-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: row.color }}
              />
              <span className="text-sm text-text-primary flex-1 truncate">{row.name}</span>
              <Button variant="outline" size="sm" onClick={() => onAddEvent(row.trackId)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t('timeline.addEvent')}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-bg-base">
      <div style={{ minWidth: layout.totalWidth, minHeight: layout.totalHeight }}>
        <svg width={layout.totalWidth} height={layout.totalHeight} className="block">
          {layout.tickLabels.map((tick, i) => (
            <g key={i}>
              <line
                x1={tick.x}
                y1={0}
                x2={tick.x}
                y2={layout.totalHeight}
                stroke="var(--border)"
                strokeWidth={1}
                opacity={0.4}
              />
              <text
                x={tick.x + 6}
                y={22}
                fontSize={11}
                fill="var(--text-secondary)"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {layout.rowLabels.map((row, i) => (
            <g key={row.trackId}>
              <rect
                x={0}
                y={36 + i * layout.rowHeight}
                width={layout.totalWidth}
                height={layout.rowHeight}
                fill={i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)'}
                opacity={0.5}
              />
              <rect
                x={0}
                y={36 + i * layout.rowHeight}
                width={4}
                height={layout.rowHeight}
                fill={row.color}
              />
              <text
                x={14}
                y={36 + i * layout.rowHeight + layout.rowHeight / 2 + 4}
                fontSize={13}
                fontWeight={600}
                fill="var(--text-primary)"
              >
                {row.name.length > 10 ? row.name.slice(0, 10) + '…' : row.name}
              </text>
            </g>
          ))}

          {layout.bars.map((bar, i) => {
            const y = 36 + bar.row * layout.rowHeight + (layout.rowHeight - layout.barHeight) / 2;
            const isSelected = bar.eventId === selectedEventId;
            return (
              <motion.g
                key={bar.eventId}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...MOTION_BASE, delay: Math.min(i * 0.02, 0.2) }}
                onClick={() => onSelectEvent(bar.eventId)}
                onDoubleClick={() => {
                  const ev = events.find((e) => e.id === bar.eventId);
                  if (ev) onEditEvent(ev);
                }}
                className="cursor-pointer"
              >
                <rect
                  x={bar.x}
                  y={y}
                  width={bar.width}
                  height={layout.barHeight}
                  rx={6}
                  fill={bar.color}
                  fillOpacity={isSelected ? 0.32 : 0.18}
                  stroke={bar.color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                <rect
                  x={bar.x}
                  y={y}
                  width={4}
                  height={layout.barHeight}
                  rx={2}
                  fill={bar.color}
                />
                <circle
                  cx={bar.x + 12}
                  cy={y + 12}
                  r={3}
                  fill={STATUS_DOT[bar.status]}
                />
                <text
                  x={bar.x + 20}
                  y={y + 16}
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--text-primary)"
                >
                  {truncate(bar.title, 12)}
                </text>
                {bar.dateValue && (
                  <text
                    x={bar.x + 12}
                    y={y + 30}
                    fontSize={10}
                    fill="var(--text-secondary)"
                  >
                    {bar.dateValue}
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
