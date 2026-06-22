import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ListTree } from 'lucide-react';

import { EmptyState, Badge } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import {
  computeTreeLayout,
  TREE_NODE_W,
  TREE_NODE_H,
} from '@/features/outline/treeLayout';
import { MOTION_BASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { OutlineNode } from '@/types';

const TYPE_TINT: Record<OutlineNode['type'], string> = {
  volume: '#F4B6C2',
  chapter: '#B6D4F4',
  scene: '#B6F4C8',
  event: '#F4E4B6',
};

interface OutlineTreeChartProps {
  nodes: OutlineNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function OutlineTreeChart({ nodes, selectedId, onSelect }: OutlineTreeChartProps) {
  const { t } = useI18n();
  const layout = useMemo(() => computeTreeLayout(nodes), [nodes]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={<ListTree className="h-10 w-10" />}
        title={t('outline.empty.title')}
        description={t('outline.empty.description')}
      />
    );
  }

  const padding = 24;
  const width = layout.width + padding * 2;
  const height = layout.height + padding * 2;

  return (
    <div className="flex-1 overflow-auto bg-bg-base p-6">
      <div className="min-w-full grid place-items-center">
        <svg width={width} height={height} className="block">
          <g transform={`translate(${padding}, ${padding})`}>
            {layout.edges.map((edge, i) => (
              <path
                key={i}
                d={`M ${edge.fromX} ${edge.fromY} C ${(edge.fromX + edge.toX) / 2} ${edge.fromY}, ${(edge.fromX + edge.toX) / 2} ${edge.toY}, ${edge.toX} ${edge.toY}`}
                fill="none"
                stroke="var(--border)"
                strokeWidth={1.5}
              />
            ))}

            {layout.nodes.map((node, i) => {
              const tint = TYPE_TINT[node.type];
              const isSelected = node.id === selectedId;
              const isHover = node.id === hoverId;
              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...MOTION_BASE, delay: Math.min(i * 0.01, 0.1) }}
                  transform={`translate(${node.x}, ${node.y})`}
                  className={cn('cursor-pointer')}
                  onClick={() => onSelect(node.id)}
                  onMouseEnter={() => setHoverId(node.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <rect
                    width={TREE_NODE_W}
                    height={TREE_NODE_H}
                    rx={6}
                    fill="var(--bg-surface)"
                    stroke={isSelected ? 'var(--accent)' : isHover ? tint : 'var(--border)'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <rect width={4} height={TREE_NODE_H} rx={2} fill={tint} />
                  <circle cx={16} cy={TREE_NODE_H / 2} r={3.5} fill={statusColor(node.status)} />
                  <text
                    x={26}
                    y={TREE_NODE_H / 2 + 4}
                    fontSize={12}
                    fontWeight={600}
                    fill="var(--text-primary)"
                  >
                    {truncate(node.title, 14)}
                  </text>
                </motion.g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
        {(Object.keys(TYPE_TINT) as OutlineNode['type'][]).map((k) => (
          <Badge key={k} variant="outline" className="gap-1.5">
            <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: TYPE_TINT[k] }} />
            {typeLabel(k, t)}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function statusColor(status: OutlineNode['status']): string {
  if (status === 'done') return '#7fb58c';
  if (status === 'revise') return '#e0a95c';
  return '#9b9b9b';
}

function typeLabel(type: OutlineNode['type'], t: (k: string) => string): string {
  if (type === 'volume') return t('treeChart.volume');
  if (type === 'chapter') return t('treeChart.chapter');
  if (type === 'scene') return t('treeChart.scene');
  return t('timeline.event.title');
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
