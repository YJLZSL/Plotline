import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  Clock4,
  Users,
  Layers,
  ListTree,
  Link2,
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

import { Button, Card, CardContent, EmptyState } from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { useStatisticsQuery } from '@/features/statistics/hooks';
import { useEventConnectionsQuery } from '@/features/timeline/hooks';
import { useEventsQuery } from '@/features/timeline/hooks';
import { useCharactersQuery } from '@/features/characters/hooks';
import { MOTION_BASE } from '@/lib/motion';
import { PlotDensityChart } from './PlotDensityChart';
import { CharacterArcChart } from './CharacterArcChart';
import { MindMapChart } from './MindMapChart';
import { OutlineTreeChart } from './OutlineTreeChart';
import { RelationshipGraph } from '@/features/characters/RelationshipGraph';
import { AiToolbarButton } from '@/features/ai/components/AiToolbarButton';
import { useAiContextStore } from '@/stores/aiContext';
import { useOutlineQuery } from '@/features/outline/hooks';

const TRANSITION = MOTION_BASE;

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
  const navigate = useNavigate();
  const { data, isLoading } = useStatisticsQuery(workspaceId);
  const { data: connections = [] } = useEventConnectionsQuery(workspaceId);
  const { data: events = [] } = useEventsQuery(workspaceId);
  const { data: characters = [] } = useCharactersQuery(workspaceId);
  const { data: outlineNodes = [] } = useOutlineQuery(workspaceId);
  const foreshadows = connections.filter((c) => c.connectionType === 'foreshadow');
  const setAiContext = useAiContextStore((s) => s.setContext);
  const [chartTab, setChartTab] = useState<'overview' | 'mindmap' | 'brain' | 'tree'>('overview');
  const reduced = useReducedMotion();
  const emptyTransition = reduced ? { duration: 0 } : MOTION_BASE;

  useEffect(() => {
    const stats = data
      ? `事件 ${data.totalEvents}，角色 ${data.totalCharacters}，轨道 ${data.totalTracks}，大纲节点 ${data.totalOutlineNodes}。`
      : '';
    setAiContext({
      view: 'statistics',
      viewLabel: t('statistics.title'),
      selection: null,
      suggestions: [
        { label: t('ai.suggestStatsInsight'), prompt: `${t('ai.promptStatsInsight')}\n${stats}` },
        { label: t('ai.suggestBalance'), prompt: t('ai.promptBalance') },
      ],
    });
  }, [t, data, setAiContext]);

  return (
    <>
      <Toolbar
        title={t('statistics.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <AiToolbarButton
            view="statistics"
            viewLabel={t('statistics.title')}
            suggestions={[
              { label: t('ai.suggestStatsInsight'), prompt: t('ai.promptStatsInsight') },
              { label: t('ai.suggestBalance'), prompt: t('ai.promptBalance') },
            ]}
          />
        }
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
            transition={emptyTransition}
            actions={[
              <Button
                key="timeline"
                onClick={() => navigate(`/workspaces/${workspaceId}/timeline`)}
                className="gap-2"
              >
                <Clock4 className="h-4 w-4" />
                {t('statistics.emptyCtaTimeline')}
              </Button>,
              <Button
                key="outline"
                variant="outline"
                onClick={() => navigate(`/workspaces/${workspaceId}/outline`)}
                className="gap-2"
              >
                <ListTree className="h-4 w-4" />
                {t('statistics.emptyCtaOutline')}
              </Button>,
            ]}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-1 bg-bg-elevated rounded-[6px] p-0.5 w-fit">
              {([
                { key: 'overview', label: t('statistics.tabOverview') },
                { key: 'mindmap', label: t('statistics.tabMindmap') },
                { key: 'brain', label: t('statistics.tabBrain') },
                { key: 'tree', label: t('statistics.tabTree') },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  data-testid={`stats-tab-${tab.key}`}
                  onClick={() => setChartTab(tab.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-[5px] text-xs transition-colors',
                    chartTab === tab.key
                      ? 'bg-bg-surface text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {chartTab === 'overview' && (
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
                            isAnimationActive={false}
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

                <Card className="sm:col-span-2 lg:col-span-3">
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      <Link2 className="h-4 w-4 text-text-secondary" />
                      <h3 className="text-sm font-semibold text-text-primary">{t('statistics.foreshadowTracker')}</h3>
                      <span className="text-xs text-text-secondary ml-auto">{foreshadows.length}</span>
                    </div>
                    {foreshadows.length === 0 ? (
                      <p className="text-xs text-text-secondary/60 py-4 text-center">
                        {t('statistics.foreshadowEmpty')}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {foreshadows.map((c) => (
                          <li
                            key={`${c.sourceId}-${c.targetId}`}
                            className="text-sm flex items-center gap-2 p-2 rounded-[6px] bg-bg-elevated/40"
                          >
                            <span className="text-text-primary truncate max-w-[40%]">{c.sourceTitle}</span>
                            <span className="text-accent">→</span>
                            <span className="text-text-primary truncate max-w-[40%]">{c.targetTitle}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent ml-auto">
                              {t('timeline.connectionTypeForeshadow')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <PlotDensityChart events={events} />
                <CharacterArcChart events={events} characters={characters} />
              </div>
            )}

            {chartTab === 'mindmap' && (
              <MindMapChart nodes={outlineNodes} selectedId={null} onSelect={() => {}} />
            )}

            {chartTab === 'brain' && (
              <div className="h-[500px] flex flex-col rounded-[8px] border border-border overflow-hidden bg-bg-base">
                <RelationshipGraph workspaceId={workspaceId} characters={characters} readOnly />
              </div>
            )}

            {chartTab === 'tree' && (
              <OutlineTreeChart nodes={outlineNodes} selectedId={null} onSelect={() => {}} />
            )}
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
