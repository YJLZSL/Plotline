import { motion } from 'framer-motion';
import {
  BarChart3,
  Clock4,
  Users,
  Layers,
  ListTree,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

import { Card, CardContent, EmptyState } from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { useStatisticsQuery } from '@/features/statistics/hooks';

const TRANSITION = { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const };

const STATUS_COLORS: Record<string, string> = {
  draft: '#9b9b9b',
  done: '#7fb58c',
  revise: '#e0a95c',
};

interface StatisticsViewProps {
  workspaceId: string;
  workspaceName?: string;
}

export function StatisticsView({ workspaceId, workspaceName }: StatisticsViewProps) {
  const { t } = useI18n();
  const { data, isLoading } = useStatisticsQuery(workspaceId);

  return (
    <>
      <Toolbar
        title={t('statistics.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
      />
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-32 rounded-[8px]" />
            ))}
          </div>
        ) : !data || data.totalEvents === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-10 w-10" />}
            title={t('statistics.title')}
            description={t('statistics.empty')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <StatCard
              icon={<Clock4 className="h-5 w-5" />}
              label={t('statistics.totalEvents')}
              value={data.totalEvents}
              color="#F4B6C2"
            />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label={t('statistics.totalCharacters')}
              value={data.totalCharacters}
              color="#B6D4F4"
            />
            <StatCard
              icon={<Layers className="h-5 w-5" />}
              label={t('statistics.totalTracks')}
              value={data.totalTracks}
              color="#B6F4C8"
            />
            <StatCard
              icon={<ListTree className="h-5 w-5" />}
              label={t('statistics.totalOutline')}
              value={data.totalOutlineNodes}
              color="#F4E4B6"
            />

            <Card className="sm:col-span-2">
              <CardContent>
                <h3 className="text-sm font-semibold text-text-primary mb-4">
                  {t('statistics.statusBreakdown')}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: t('timeline.event.statusDraft'), value: data.statusBreakdown.draft, key: 'draft' },
                          { name: t('timeline.event.statusDone'), value: data.statusBreakdown.done, key: 'done' },
                          { name: t('timeline.event.statusRevise'), value: data.statusBreakdown.revise, key: 'revise' },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
                        paddingAngle={2}
                      >
                        {[
                          { key: 'draft' },
                          { key: 'done' },
                          { key: 'revise' },
                        ].map((entry) => (
                          <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-text-primary mb-4">
                  {t('statistics.trackEvents')}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trackEventCounts} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="trackName"
                        tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#C68A3E">
                        {data.trackEventCounts.map((entry, i) => (
                          <Cell
                            key={entry.trackId}
                            fill={
                              [
                                '#F4B6C2',
                                '#B6D4F4',
                                '#B6F4C8',
                                '#F4E4B6',
                                '#D8B6F4',
                                '#F4CBB6',
                              ][i % 6]
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="sm:col-span-2 lg:col-span-3">
              <CardContent>
                <h3 className="text-sm font-semibold text-text-primary mb-4">
                  {t('statistics.characterAppearances')}
                </h3>
                {data.characterAppearances.length === 0 ? (
                  <p className="text-xs text-text-secondary/60 py-8 text-center">
                    {t('characters.noEvents')}
                  </p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.characterAppearances} margin={{ left: 20, bottom: 40 }}>
                        <XAxis
                          dataKey="characterName"
                          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                          angle={-30}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#C68A3E" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={TRANSITION}>
      <Card hover>
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-text-secondary">{label}</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
            </div>
            <div
              className="h-9 w-9 rounded-[8px] grid place-items-center"
              style={{ backgroundColor: color + '40', color }}
            >
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
