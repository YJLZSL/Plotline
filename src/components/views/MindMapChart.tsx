import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2 } from 'lucide-react';

import { EmptyState, Badge } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { computeRadialTreeLayout } from '@/features/outline/radialTreeLayout';
import { MOTION_BASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { OutlineNode } from '@/types';

const TYPE_TINT: Record<OutlineNode['type'], string> = {
  volume: '#F4B6C2',
  chapter: '#B6D4F4',
  scene: '#B6F4C8',
  event: '#F4E4B6',
};

interface MindMapChartProps {
  nodes: OutlineNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MindMapChart({ nodes, selectedId, onSelect }: MindMapChartProps) {
  const { t } = useI18n();
  const layout = useMemo(() => computeRadialTreeLayout(nodes), [nodes]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={<Share2 className="h-10 w-10" />}
        title={t('outline.empty.title')}
        description={t('outline.empty.description')}
      />
    );
  }

  const padding = 32;
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
                d={`M ${edge.fromX} ${edge.fromY} L ${edge.toX} ${edge.toY}`}
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
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...MOTION_BASE, delay: Math.min(i * 0.01, 0.1) }}
                  transform={`translate(${node.x}, ${node.y})`}
                  className={cn('cursor-pointer')}
                  onClick={() => onSelect(node.id)}
                  onMouseEnter={() => setHoverId(node.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <rect
                    x={-64}
                    y={-20}
                    width={128}
                    height={40}
                    rx={6}
                    fill="var(--bg-surface)"
                    stroke={isSelected ? 'var(--accent)' : isHover ? tint : 'var(--border)'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <rect x={-64} y={-20} width={4} height={40} rx={2} fill={tint} />
                  <circle cx={-48} cy={0} r={3.5} fill={statusColor(node.status)} />
                  <text
                    x={-38}
                    y={4}
                    fontSize={12}
                    fontWeight={600}
                    fill="var(--text-primary)"
                  >
                    {truncate(node.title, 12)}
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
  return t(`outline.type.${type}`);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}
