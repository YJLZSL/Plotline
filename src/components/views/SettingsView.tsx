import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, BookOpen, Check, RotateCcw } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import type { AppSettings, Language, Theme } from '@/types';
import { useSettingsQuery, useUpdateSettings } from '@/features/settings/hooks';
import { useThemeStore } from '@/stores/ui';

interface SettingsViewProps {
  workspaceId: string;
  workspaceName?: string;
}

type Tab = 'appearance' | 'editor' | 'data' | 'shortcuts' | 'about';

const TABS: Array<{ id: Tab; labelKey: string }> = [
  { id: 'appearance', labelKey: 'settings.appearance' },
  { id: 'editor', labelKey: 'settings.editor' },
  { id: 'data', labelKey: 'settings.data' },
  { id: 'shortcuts', labelKey: 'settings.shortcuts' },
  { id: 'about', labelKey: 'settings.about' },
];

const THEMES: Array<{ value: Theme; labelKey: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'light', labelKey: 'settings.themeLight', icon: Sun },
  { value: 'dark', labelKey: 'settings.themeDark', icon: Moon },
  { value: 'sepia', labelKey: 'settings.themeSepia', icon: BookOpen },
];

const ACCENT_PALETTE = ['#C68A3E', '#A86A2C', '#B85537', '#7B5E3C', '#D4A574', '#9C6B3E'];

export function SettingsView({ workspaceId, workspaceName }: SettingsViewProps) {
  const { t, i18n } = useI18n();
  const { data: settings } = useSettingsQuery();
  const update = useUpdateSettings();
  const applyToDOM = useThemeStore((s) => s.applyToDOM);
  const [tab, setTab] = useState<Tab>('appearance');
  const [draft, setDraft] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (settings && !draft) {
      setDraft(settings);
      applyToDOM(settings);
    }
  }, [settings, draft, applyToDOM]);

  if (!draft) return null;

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const set = (patch: Partial<AppSettings>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    if (patch.theme || patch.accentColor || patch.fontSize || patch.uiFont || patch.editorFont) {
      applyToDOM({ ...draft, ...patch });
    }
  };

  const save = async () => {
    if (!dirty) return;
    await update.mutateAsync(draft);
  };

  const reset = () => {
    if (settings) {
      setDraft(settings);
      applyToDOM(settings);
    }
  };

  return (
    <>
      <Toolbar
        title={t('settings.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <div className="flex gap-2">
            {dirty && (
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                {t('settings.reset')}
              </Button>
            )}
            <Button size="sm" onClick={save} loading={update.isPending} disabled={!dirty}>
              {t('common.save')}
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        <aside className="w-48 flex-shrink-0 border-r border-border bg-bg-surface p-2">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={cn(
                'w-full text-left text-sm px-3 h-9 rounded-[6px] transition-colors',
                tab === tb.id
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
              )}
            >
              {t(tb.labelKey)}
            </button>
          ))}
        </aside>

        <div className="flex-1 overflow-auto p-6">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto"
          >
            {tab === 'appearance' && (
              <div className="flex flex-col gap-6">
                <Section title={t('settings.theme')}>
                  <div className="grid grid-cols-3 gap-3">
                    {THEMES.map((th) => {
                      const Icon = th.icon;
                      const active = draft.theme === th.value;
                      return (
                        <button
                          key={th.value}
                          onClick={() => set({ theme: th.value })}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-[8px] border-2 transition-all',
                            active
                              ? 'border-accent bg-accent/5'
                              : 'border-border hover:bg-bg-elevated',
                          )}
                        >
                          <div
                            className="h-14 w-full rounded-[6px] mb-1"
                            data-theme={th.value}
                            style={{
                              background:
                                th.value === 'light'
                                  ? 'linear-gradient(135deg, #FAF7F0, #F5EFE3)'
                                  : th.value === 'dark'
                                    ? 'linear-gradient(135deg, #1E1A16, #352D27)'
                                    : 'linear-gradient(135deg, #F2E8D5, #E7D7B6)',
                            }}
                          />
                          <Icon className="h-4 w-4 text-text-secondary" />
                          <span className="text-xs font-medium text-text-primary">
                            {t(th.labelKey)}
                          </span>
                          {active && <Check className="h-3 w-3 text-accent" />}
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section title={t('settings.accentColor')}>
                  <div className="flex gap-2 flex-wrap">
                    {ACCENT_PALETTE.map((c) => (
                      <button
                        key={c}
                        onClick={() => set({ accentColor: c })}
                        className={cn(
                          'h-9 w-9 rounded-full transition-transform flex items-center justify-center',
                          draft.accentColor === c
                            ? 'ring-2 ring-offset-2 ring-text-primary/40 scale-110'
                            : 'hover:scale-110',
                        )}
                        style={{ backgroundColor: c }}
                      >
                        {draft.accentColor === c && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title={t('settings.language')}>
                  <div className="flex gap-2">
                    {(['zh-CN', 'en'] as Language[]).map((lng) => (
                      <button
                        key={lng}
                        onClick={() => {
                          set({ language: lng });
                          void i18n.changeLanguage(lng);
                        }}
                        className={cn(
                          'h-10 px-4 rounded-[6px] border text-sm transition-colors',
                          draft.language === lng
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-text-secondary hover:bg-bg-elevated',
                        )}
                      >
                        {lng === 'zh-CN' ? '简体中文' : 'English'}
                      </button>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {tab === 'editor' && (
              <div className="flex flex-col gap-6">
                <Section title={t('settings.uiFont')}>
                  <Input
                    value={draft.uiFont}
                    onChange={(e) => set({ uiFont: e.target.value })}
                  />
                </Section>
                <Section title={t('settings.editorFont')}>
                  <Input
                    value={draft.editorFont}
                    onChange={(e) => set({ editorFont: e.target.value })}
                  />
                </Section>
                <Section title={t('settings.fontSize')}>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={12}
                      max={18}
                      value={draft.fontSize}
                      onChange={(e) => set({ fontSize: Number(e.target.value) })}
                      className="flex-1 accent-accent"
                    />
                    <span className="text-sm w-12 text-right text-text-primary">
                      {draft.fontSize}px
                    </span>
                  </div>
                </Section>
                <Section title={t('settings.defaultView')}>
                  <select
                    value={draft.defaultView}
                    onChange={(e) =>
                      set({ defaultView: e.target.value as AppSettings['defaultView'] })
                    }
                    className="w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm"
                  >
                    <option value="timeline">{t('nav.timeline')}</option>
                    <option value="characters">{t('nav.characters')}</option>
                    <option value="outline">{t('nav.outline')}</option>
                    <option value="statistics">{t('nav.statistics')}</option>
                  </select>
                </Section>
                <Section title={t('settings.timelineZoom')}>
                  <select
                    value={draft.timelineZoom}
                    onChange={(e) =>
                      set({ timelineZoom: e.target.value as AppSettings['timelineZoom'] })
                    }
                    className="w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm"
                  >
                    <option value="year">{t('timeline.year')}</option>
                    <option value="month">{t('timeline.month')}</option>
                    <option value="day">{t('timeline.day')}</option>
                    <option value="hour">{t('timeline.hour')}</option>
                  </select>
                </Section>
              </div>
            )}

            {tab === 'data' && (
              <div className="flex flex-col gap-6">
                <Section title={t('settings.backupPath')}>
                  <Input
                    value={draft.backupPath}
                    onChange={(e) => set({ backupPath: e.target.value })}
                    placeholder="默认: 应用数据目录"
                  />
                </Section>
                <Section title={t('settings.autoBackup')}>
                  <button
                    onClick={() => set({ autoBackup: !draft.autoBackup })}
                    className={cn(
                      'w-12 h-7 rounded-full transition-colors relative',
                      draft.autoBackup ? 'bg-accent' : 'bg-border',
                    )}
                  >
                    <motion.span
                      layout
                      className="absolute top-1 h-5 w-5 bg-white rounded-full shadow-sm"
                      style={{ left: draft.autoBackup ? 24 : 4 }}
                    />
                  </button>
                </Section>
                <Section title={t('settings.backupInterval')}>
                  <Input
                    type="number"
                    min={1}
                    value={draft.backupIntervalHours}
                    onChange={(e) =>
                      set({ backupIntervalHours: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-32"
                  />
                  <span className="text-xs text-text-secondary ml-2">
                    {t('settings.backupInterval')}
                  </span>
                </Section>
              </div>
            )}

            {tab === 'shortcuts' && (
              <div className="flex flex-col gap-3 text-sm text-text-secondary">
                <Card>
                  <CardContent className="text-xs">
                    <p className="text-text-secondary">
                      快捷键功能将在后续迭代中开放自定义。当前可用：
                    </p>
                    <ul className="mt-2 space-y-1 text-text-primary/80">
                      <li>• Ctrl/Cmd + N - 新建工作区</li>
                      <li>• Ctrl/Cmd + B - 切换侧栏</li>
                      <li>• Esc - 关闭对话框</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === 'about' && (
              <div className="flex flex-col gap-3 text-sm">
                <Card>
                  <CardContent>
                    <h2 className="text-base font-bold text-text-primary">Plotline</h2>
                    <p className="text-xs text-text-secondary mt-1">v0.2.0</p>
                    <p className="text-sm text-text-secondary mt-3">
                      面向小说作者、编剧与游戏叙事设计师的本地优先创作工作台。
                    </p>
                    <p className="text-xs text-text-secondary/60 mt-4">
                      技术栈：Tauri 2 + React 18 + TypeScript + Tailwind CSS v4 + SQLite
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-semibold">{title}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
