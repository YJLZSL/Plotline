import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

import { EmptyState, Card, CardContent } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import {
  buildRelationshipMatrix,
  RELATIONSHIP_COLORS,
  RELATIONSHIP_LABELS,
} from '@/features/characters/relationshipMatrix';
import { MOTION_BASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { Character, CharacterRelationship } from '@/types';

interface RelationshipMatrixProps {
  characters: Character[];
  relationships: CharacterRelationship[];
  onCharacterClick?: (id: string) => void;
}

export function RelationshipMatrix({
  characters,
  relationships,
  onCharacterClick,
}: RelationshipMatrixProps) {
  const { t } = useI18n();
  const matrix = useMemo(
    () => buildRelationshipMatrix(characters, relationships),
    [characters, relationships],
  );

  if (characters.length === 0) {
    return (
      <div className="flex-1 grid place-items-center p-6">
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title={t('characters.empty.title')}
          description={t('characters.empty.description')}
        />
      </div>
    );
  }

  const cellSize = 44;
  const labelWidth = 120;
  const headerHeight = 44;
  const gridSize = characters.length * cellSize;

  return (
    <div className="flex-1 overflow-auto p-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={MOTION_BASE}>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">
                {t('matrix.title')}
              </h3>
              <span className="text-xs text-text-secondary">
                {t('matrix.totalRelations', { count: matrix.totals })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <div style={{ minWidth: labelWidth + gridSize + cellSize }}>
                <svg width={labelWidth + gridSize + cellSize} height={headerHeight + gridSize + cellSize}>
                  <text
                    x={labelWidth + gridSize / 2 + cellSize / 2}
                    y={16}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="var(--text-secondary)"
                  >
                    {t('matrix.target')}
                  </text>
                  <text
                    x={8}
                    y={headerHeight + gridSize / 2 + cellSize / 2}
                    textAnchor="start"
                    fontSize={11}
                    fontWeight={600}
                    fill="var(--text-secondary)"
                  >
                    {t('matrix.source')}
                  </text>

                  {characters.map((c, i) => (
                    <g
                      key={`h-${c.id}`}
                      transform={`translate(${labelWidth + i * cellSize + cellSize / 2}, ${headerHeight - 8})`}
                      className={cn(onCharacterClick && 'cursor-pointer')}
                      onClick={() => onCharacterClick?.(c.id)}
                    >
                      <rect
                        x={-cellSize / 2 + 4}
                        y={-14}
                        width={cellSize - 8}
                        height={16}
                        rx={4}
                        fill={c.color}
                        fillOpacity={0.18}
                      />
                      <text
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fill="var(--text-primary)"
                      >
                        {truncate(c.name, 5)}
                      </text>
                    </g>
                  ))}

                  {characters.map((c, i) => (
                    <g
                      key={`r-${c.id}`}
                      transform={`translate(8, ${headerHeight + i * cellSize + cellSize / 2 + 4})`}
                      className={cn(onCharacterClick && 'cursor-pointer')}
                      onClick={() => onCharacterClick?.(c.id)}
                    >
                      <rect
                        x={0}
                        y={-14}
                        width={labelWidth - 16}
                        height={16}
                        rx={4}
                        fill={c.color}
                        fillOpacity={0.18}
                      />
                      <text
                        x={6}
                        y={-2}
                        fontSize={11}
                        fontWeight={600}
                        fill="var(--text-primary)"
                      >
                        {truncate(c.name, 8)}
                      </text>
                    </g>
                  ))}

                  {matrix.cells.map((row, ri) =>
                    row.map((cell, ci) => {
                      const x = labelWidth + ci * cellSize;
                      const y = headerHeight + ri * cellSize;
                      if (ri === ci) {
                        return (
                          <rect
                            key={`${ri}-${ci}`}
                            x={x + 2}
                            y={y + 2}
                            width={cellSize - 4}
                            height={cellSize - 4}
                            fill="var(--bg-elevated)"
                            opacity={0.5}
                          />
                        );
                      }
                      if (!cell.hasRelationship) {
                        return (
                          <rect
                            key={`${ri}-${ci}`}
                            x={x + 2}
                            y={y + 2}
                            width={cellSize - 4}
                            height={cellSize - 4}
                            rx={4}
                            fill="var(--bg-base)"
                            opacity={0.6}
                          />
                        );
                      }
                      const color = cell.type ? RELATIONSHIP_COLORS[cell.type] : '#C68A3E';
                      const opacity = 0.2 + (cell.strength / 5) * 0.5;
                      return (
                        <motion.g
                          key={`${ri}-${ci}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={MOTION_BASE}
                        >
                          <rect
                            x={x + 2}
                            y={y + 2}
                            width={cellSize - 4}
                            height={cellSize - 4}
                            rx={4}
                            fill={color}
                            fillOpacity={opacity}
                            stroke={color}
                            strokeWidth={1}
                          />
                          <text
                            x={x + cellSize / 2}
                            y={y + cellSize / 2 + 3}
                            textAnchor="middle"
                            fontSize={9}
                            fontWeight={700}
                            fill="var(--text-primary)"
                          >
                            {cell.strength}
                          </text>
                        </motion.g>
                      );
                    }),
                  )}
                </svg>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-xs text-text-secondary">{t('matrix.legend')}</span>
              {(Object.keys(RELATIONSHIP_COLORS) as Array<keyof typeof RELATIONSHIP_COLORS>).map((k) => (
                <span key={k} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <span
                    className="h-2.5 w-4 rounded-sm"
                    style={{ backgroundColor: RELATIONSHIP_COLORS[k] }}
                  />
                  {RELATIONSHIP_LABELS[k]}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
