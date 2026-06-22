import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { Card, CardContent } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { computePlotDensity } from '@/features/statistics/advancedStats';
import { MOTION_BASE } from '@/lib/motion';
import type { Event } from '@/types';

interface PlotDensityChartProps {
  events: Event[];
}

export function PlotDensityChart({ events }: PlotDensityChartProps) {
  const { t } = useI18n();
  const density = useMemo(() => computePlotDensity(events), [events]);

  return (
    <Card className="sm:col-span-2 lg:col-span-3">
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">
            {t('statistics.plotDensity')}
          </h3>
          <span className="text-xs text-text-secondary">
            {t('statistics.peakCount', { count: density.peakCount })}
          </span>
        </div>
        {density.buckets.length === 0 ? (
          <p className="text-xs text-text-secondary/60 py-8 text-center">
            {t('statistics.empty')}
          </p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={MOTION_BASE}
            className="h-56"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={density.buckets} margin={{ left: 8, right: 8, bottom: 8 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  label={{ value: t('statistics.segment'), position: 'insideBottom', offset: -2, fontSize: 11, fill: 'var(--text-secondary)' }}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} 事件`, t('statistics.plotDensity')]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#C68A3E">
                  {density.buckets.map((b, i) => (
                    <Cell
                      key={i}
                      fill={b.count === density.peakCount ? '#C68A3E' : '#E8C988'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
