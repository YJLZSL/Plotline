import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { Card, CardContent } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { computeCharacterArcs } from '@/features/statistics/advancedStats';
import { MOTION_BASE } from '@/lib/motion';
import type { Character, Event } from '@/types';

const STATUS_DOT: Record<Event['status'], string> = {
  draft: '#9b9b9b',
  done: '#7fb58c',
  revise: '#e0a95c',
};

interface CharacterArcChartProps {
  events: Event[];
  characters: Character[];
}

export function CharacterArcChart({ events, characters }: CharacterArcChartProps) {
  const { t } = useI18n();
  const arcs = useMemo(
    () => computeCharacterArcs(events, characters),
    [events, characters],
  );

  const withAppearances = arcs.filter((a) => a.appearances.length > 0);
  const maxIndex = Math.max(
    1,
    ...withAppearances.flatMap((a) => a.appearances.map((p) => p.eventIndex)),
  );

  const rowHeight = 44;
  const labelWidth = 140;
  const pad = 16;
  const plotWidth = 520;
  const width = labelWidth + plotWidth + pad * 2;
  const height = Math.max(withAppearances.length * rowHeight + pad * 2, 80);

  return (
    <Card className="sm:col-span-2 lg:col-span-3">
      <CardContent>
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          {t('statistics.characterArc')}
        </h3>
        {withAppearances.length === 0 ? (
          <p className="text-xs text-text-secondary/60 py-8 text-center">
            {t('statistics.empty')}
          </p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={MOTION_BASE}
            className="overflow-x-auto"
          >
            <svg width={width} height={height} className="block">
              {withAppearances.map((arc, i) => {
                const y = pad + i * rowHeight + rowHeight / 2;
                return (
                  <g key={arc.characterId}>
                    <rect
                      x={pad}
                      y={y - 12}
                      width={labelWidth - 8}
                      height={24}
                      rx={6}
                      fill={arc.color}
                      fillOpacity={0.18}
                    />
                    <text
                      x={pad + 8}
                      y={y + 4}
                      fontSize={11}
                      fontWeight={600}
                      fill="var(--text-primary)"
                    >
                      {truncate(arc.characterName, 10)}
                    </text>
                    <line
                      x1={pad + labelWidth}
                      y1={y}
                      x2={pad + labelWidth + plotWidth}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    {arc.appearances.map((p, j) => {
                      const x =
                        pad +
                        labelWidth +
                        (p.eventIndex / Math.max(maxIndex, 1)) * plotWidth;
                      return (
                        <motion.g
                          key={j}
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ ...MOTION_BASE, delay: Math.min(j * 0.03, 0.2) }}
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r={6}
                            fill={arc.color}
                            fillOpacity={0.85}
                            stroke={STATUS_DOT[p.status]}
                            strokeWidth={1.5}
                          >
                            <title>
                              {`${p.eventTitle}${p.dateValue ? `（${p.dateValue}）` : ''}`}
                            </title>
                          </circle>
                        </motion.g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            <div className="mt-3 space-y-1.5">
              {withAppearances
                .filter((a) => a.arc.trim().length > 0)
                .slice(0, 6)
                .map((a) => (
                  <p key={a.characterId} className="text-[11px] text-text-secondary">
                    <span className="font-semibold text-text-primary">{a.characterName}</span>
                    ：{a.arc}
                  </p>
                ))}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
