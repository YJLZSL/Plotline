import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, BookOpen, Box, Check, RotateCcw, RefreshCw, Upload, ExternalLink } from 'lucide-react';

const FONT_PRESETS: Array<{ labelKey: string; value: string }> = [
  { labelKey: 'settings.fontPresetDefault', value: '' },
  { labelKey: 'settings.fontPresetInter', value: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif' },
  { labelKey: 'settings.fontPresetSans', value: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif' },
  { labelKey: 'settings.fontPresetMono', value: '"JetBrains Mono", "Cascadia Code", Consolas, monospace' },
  { labelKey: 'settings.fontPresetPixel', value: '"Fusion Pixel 10px", "Zpix", "站酷快乐体", "Microsoft YaHei", monospace' },
  { labelKey: 'settings.fontPresetSmiley', value: '"Smiley Sans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif' },
];

function FontPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  const matched = FONT_PRESETS.find((p) => p.value === value);
  const mode = matched ? matched.value : '__custom__';

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <select
        value={mode}
        onChange={(e) => {
          const v = e.target.value;
          if (v !== '__custom__') onChange(v);
        }}
        className="w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm"
      >
        {FONT_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {t(p.labelKey)}
          </option>
        ))}
        <option value="__custom__">{t('settings.fontPresetCustom')}</option>
      </select>
      {mode === '__custom__' && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('settings.fontCustomPlaceholder')}
        />
      )}
      <p className="text-xs text-text-secondary" style={{ fontFamily: value || undefined }}>
        {t('settings.fontPreview')}
      </p>
    </div>
  );
}

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { MOTION_FAST } from '@/lib/motion';
import { toastError, toastInfo, toastSuccess } from '@/stores/toast';
import type { AppSettings, DefaultView, FontTheme, Language, Theme } from '@/types';
import { useSettingsQuery, useUpdateSettings } from '@/features/settings/hooks';
import { checkForUpdates } from '@/features/settings/updater';
import { importFont, listImportedFonts, loadImportedFontFaces } from '@/features/font/api';
import { useThemeStore } from '@/stores/ui';
import { useAiModelsQuery } from '@/features/ai/hooks';
import { AI_PROVIDERS, getProviderPreset } from '@/features/ai/providers';
import { APP_VERSION } from '@/lib/version';

interface SettingsViewProps {
  workspaceId: string;
  workspaceName?: string;
}

type Tab = 'appearance' | 'editor' | 'data' | 'ai' | 'startup' | 'shortcuts' | 'about' | 'help';

const TABS: Array<{ id: Tab; labelKey: string }> = [
  { id: 'appearance', labelKey: 'settings.appearance' },
  { id: 'editor', labelKey: 'settings.editor' },
  { id: 'data', labelKey: 'settings.data' },
  { id: 'ai', labelKey: 'settings.ai' },
  { id: 'startup', labelKey: 'settings.startup' },
  { id: 'shortcuts', labelKey: 'settings.shortcuts' },
  { id: 'help', labelKey: 'settings.help' },
  { id: 'about', labelKey: 'settings.about' },
];

const THEMES: Array<{ value: Theme; labelKey: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'light', labelKey: 'settings.themeLight', icon: Sun },
  { value: 'dark', labelKey: 'settings.themeDark', icon: Moon },
  { value: 'sepia', labelKey: 'settings.themeSepia', icon: BookOpen },
  { value: 'mc', labelKey: 'settings.themeMc', icon: Box },
];

const ACCENT_PALETTE = ['#C68A3E', '#A86A2C', '#B85537', '#7B5E3C', '#D4A574', '#9C6B3E'];

const FONT_THEMES: Array<{ value: FontTheme; labelKey: string; previewClass: string }> = [
  { value: 'sans', labelKey: 'settings.fontThemeSans', previewClass: 'font-sans' },
  { value: 'mono', labelKey: 'settings.fontThemeMono', previewClass: 'font-mono' },
  { value: 'pixel', labelKey: 'settings.fontThemePixel', previewClass: '[font-family:var(--font-pixel)]' },
  { value: 'smiley', labelKey: 'settings.fontThemeSmiley', previewClass: '[font-family:var(--font-smiley)]' },
];

const FONT_THEME_STACKS: Record<FontTheme, { ui: string; editor: string }> = {
  sans: {
    ui: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    editor: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  },
  mono: {
    ui: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
    editor: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  },
  pixel: {
    ui: '"Fusion Pixel 10px", "Zpix", "站酷快乐体", "Microsoft YaHei", monospace',
    editor: '"Fusion Pixel 10px", "Zpix", "站酷快乐体", "Microsoft YaHei", monospace',
  },
  smiley: {
    ui: '"Smiley Sans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    editor: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  },
};

export function SettingsView({ workspaceId, workspaceName }: SettingsViewProps) {
  const { t, i18n } = useI18n();
  const { data: settings } = useSettingsQuery();
  const update = useUpdateSettings();
  const applyToDOM = useThemeStore((s) => s.applyToDOM);
  const [tab, setTab] = useState<Tab>('appearance');
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [installUpdate, setInstallUpdate] = useState<(() => Promise<void>) | null>(null);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [importedFonts, setImportedFonts] = useState<string[]>([]);
  const modelsQuery = useAiModelsQuery(
    draft?.aiBaseUrl ?? '',
    draft?.aiApiKey ?? '',
    Boolean(draft?.aiEnabled),
  );

  useEffect(() => {
    void listImportedFonts().then((fonts) => setImportedFonts(fonts));
  }, []);

  const handleImportFont = async (file: File) => {
    const family = await importFont(file);
    await loadImportedFontFaces();
    const fonts = await listImportedFonts();
    setImportedFonts(fonts);
    toastSuccess(t('settings.fontImported', { family }));
  };

  const applyImportedFont = (family: string, target: 'ui' | 'editor') => {
    const fallback =
      target === 'ui'
        ? `"${family}", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`
        : `"${family}", "JetBrains Mono", "Cascadia Code", Consolas, monospace`;
    set(target === 'ui' ? { uiFont: fallback } : { editorFont: fallback });
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setInstallUpdate(null);
    setUpdateVersion(null);
    try {
      const { info, install } = await checkForUpdates(APP_VERSION);
      if (info.available && install) {
        setUpdateVersion(info.latestVersion ?? null);
        setInstallUpdate(() => install);
        toastSuccess(t('settings.updateAvailable', { version: info.latestVersion ?? '?' }));
      } else {
        toastInfo(t('settings.updateUpToDate'));
      }
    } catch (err) {
      toastError(err);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!installUpdate) return;
    setInstallingUpdate(true);
    try {
      toastInfo(t('settings.updateInstalling'));
      await installUpdate();
    } catch (err) {
      toastError(err);
      setInstallingUpdate(false);
    }
  };

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
    if (patch.theme || patch.accentColor || patch.fontSize || patch.uiFont || patch.editorFont || patch.fontTheme) {
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
            <Button size="sm" onClick={save} loading={update.isPending} disabled={!dirty} data-testid="settings-save-btn">
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
              data-testid={`settings-tab-${tb.id}`}
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
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl mx-auto"
            >
            {tab === 'appearance' && (
              <div className="flex flex-col gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.theme')}</CardTitle>
                    <CardDescription>{t('settings.theme')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {THEMES.map((th) => {
                        const Icon = th.icon;
                        const active = draft.theme === th.value;
                        return (
                          <motion.button
                            key={th.value}
                            data-testid={`theme-${th.value}`}
                            onClick={() => set({ theme: th.value })}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              'group relative flex flex-col items-center gap-2 p-4 rounded-[8px] border-2 transition-all overflow-hidden',
                              active
                                ? 'border-accent bg-accent/10 ring-2 ring-accent ring-offset-1 ring-offset-bg-surface'
                                : 'border-border hover:bg-bg-elevated hover:border-accent/30',
                            )}
                          >
                            <div
                              className="ambient-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-accent/15 to-transparent"
                              aria-hidden="true"
                            />
                            <div
                              className="h-14 w-full rounded-[6px] mb-1 relative z-10 overflow-hidden border border-border/50 flex items-center justify-center gap-2"
                              data-theme={th.value}
                              style={{ background: 'var(--bg-base-gradient)' }}
                            >
                              <span className="text-[10px] font-medium text-text-primary">
                                Aa
                              </span>
                              <span className="h-2 w-2 rounded-full bg-accent" />
                            </div>
                            <Icon className="h-4 w-4 text-text-secondary" />
                            <span className="text-xs font-medium text-text-primary">
                              {t(th.labelKey)}
                            </span>
                            {active && (
                              <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
                                <Check className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.accentColor')}</CardTitle>
                    <CardDescription>{t('settings.accentColorMcHint')}</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.language')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {(['zh-CN', 'en'] as Language[]).map((lng) => (
                        <button
                          key={lng}
                          onClick={() => {
                            set({ language: lng });
                            void i18n.changeLanguage(lng);
                          }}
                          data-testid={`lang-${lng}`}
                          className={cn(
                            'h-10 px-4 rounded-[6px] border text-sm transition-all',
                            draft.language === lng
                              ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent'
                              : 'border-border text-text-secondary hover:bg-bg-elevated',
                          )}
                        >
                          {lng === 'zh-CN' ? '简体中文' : 'English'}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.fontTheme')}</CardTitle>
                    <CardDescription>{t('settings.fontTheme')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {FONT_THEMES.map((ft) => {
                        const active = draft.fontTheme === ft.value;
                        return (
                          <motion.button
                            key={ft.value}
                            data-testid={`font-theme-${ft.value}`}
                            onClick={() =>
                              set({
                                fontTheme: ft.value,
                                uiFont: FONT_THEME_STACKS[ft.value].ui,
                                editorFont: FONT_THEME_STACKS[ft.value].editor,
                              })
                            }
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              'flex flex-col items-start gap-1.5 p-3 rounded-[8px] border-2 text-left transition-all',
                              active
                                ? 'border-accent bg-accent/10 ring-2 ring-accent ring-offset-1 ring-offset-bg-surface'
                                : 'border-border hover:bg-bg-elevated hover:border-accent/30',
                            )}
                          >
                            <span
                              className={cn(
                                'text-base font-medium text-text-primary',
                                ft.previewClass,
                              )}
                            >
                              {t(ft.labelKey)}
                            </span>
                            <span className={cn('text-xs text-text-secondary', ft.previewClass)}>
                              plotline Plotline 12345 ，。！？
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.animationsEnabled')}</CardTitle>
                    <CardDescription>{t('settings.animationsEnabledDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <Switch
                        checked={draft.animationsEnabled}
                        onCheckedChange={(checked) => {
                          set({ animationsEnabled: checked });
                          update.mutate({ animationsEnabled: checked });
                        }}
                        data-testid="animations-enabled-toggle"
                      />
                      <p className="text-xs text-text-secondary">{t('settings.animationsEnabledDescription')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === 'editor' && (
              <div className="flex flex-col gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.fontTheme')}</CardTitle>
                    <CardDescription>{t('settings.uiFont')} / {t('settings.editorFont')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FontPicker
                      label={t('settings.uiFont')}
                      value={draft.uiFont}
                      onChange={(v) => set({ uiFont: v })}
                    />
                    <FontPicker
                      label={t('settings.editorFont')}
                      value={draft.editorFont}
                      onChange={(v) => set({ editorFont: v })}
                    />
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.defaultView')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={draft.defaultView}
                      onChange={(e) =>
                        set({ defaultView: e.target.value as AppSettings['defaultView'] })
                      }
                      className="w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm"
                    >
                      {([
                        'timeline',
                        'characters',
                        'outline',
                        'map',
                        'vn',
                        'worldbuilding',
                        'statistics',
                        'notebook',
                      ] as DefaultView[]).map((v) => (
                        <option key={v} value={v}>{t(`nav.${v}`)}</option>
                      ))}
                    </select>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.timelineZoom')}</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.importFont')}</CardTitle>
                    <CardDescription>{t('settings.importFontDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <label className="inline-flex">
                      <Button variant="secondary" size="sm" className="gap-2 cursor-pointer">
                        <Upload className="h-3.5 w-3.5" />
                        {t('settings.importFontBtn')}
                      </Button>
                      <input
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleImportFont(f);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                    {importedFonts.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        <p className="text-xs text-text-secondary">{t('settings.importedFonts')}</p>
                        {importedFonts.map((name) => {
                          const family = name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
                          return (
                            <div
                              key={name}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-[6px] border border-border bg-bg-surface"
                            >
                              <span className="text-sm text-text-primary truncate">{family}</span>
                              <div className="flex gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => applyImportedFont(family, 'ui')}
                                >
                                  {t('settings.setUiFont')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => applyImportedFont(family, 'editor')}
                                >
                                  {t('settings.setEditorFont')}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === 'data' && (
              <div className="flex flex-col gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.backupPath')}</CardTitle>
                    <CardDescription>{t('settings.backupPath')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={draft.backupPath}
                      onChange={(e) => set({ backupPath: e.target.value })}
                      placeholder="默认: 应用数据目录"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.autoBackup')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => set({ autoBackup: !draft.autoBackup })}
                        className={cn(
                          'w-12 h-7 rounded-full transition-colors relative',
                          draft.autoBackup ? 'bg-accent' : 'bg-border',
                        )}
                      >
                        <motion.span
                          className="absolute top-1 left-1 h-5 w-5 bg-white rounded-full shadow-sm"
                          initial={false}
                          animate={{ x: draft.autoBackup ? 20 : 0 }}
                          transition={MOTION_FAST}
                        />
                      </button>
                      <span className="text-xs text-text-secondary">
                        {t('settings.backupInterval')}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.backupInterval')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={draft.backupIntervalHours}
                        onChange={(e) =>
                          set({ backupIntervalHours: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-32"
                      />
                      <span className="text-xs text-text-secondary">
                        {t('settings.backupInterval')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === 'ai' && (
              <div className="flex flex-col gap-5">
                <Card data-testid="ai-connection-status-card">
                  <CardHeader>
                    <CardTitle>{t('settings.aiEnabled')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <button
                        data-testid="ai-enabled-toggle"
                        onClick={() => set({ aiEnabled: !draft.aiEnabled })}
                        className={cn(
                          'w-12 h-7 rounded-full transition-colors relative',
                          draft.aiEnabled ? 'bg-accent' : 'bg-border',
                        )}
                      >
                        <motion.span
                          className="absolute top-1 left-1 h-5 w-5 bg-white rounded-full shadow-sm"
                          initial={false}
                          animate={{ x: draft.aiEnabled ? 20 : 0 }}
                          transition={MOTION_FAST}
                        />
                      </button>
                    </div>
                    {/* AI 连接状态组件占位；由后续 agent 实现具体 UI */}
                    <div
                      data-testid="ai-connection-placeholder"
                      className="mt-4 min-h-[48px] rounded-[6px] border border-dashed border-border bg-bg-base/50"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.aiProvider')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {AI_PROVIDERS.map((p) => {
                        const active = draft.aiProvider === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              const patch: Partial<AppSettings> = { aiProvider: p.id };
                              if (p.baseUrl) {
                                patch.aiBaseUrl = p.baseUrl;
                              }
                              if (p.defaultModel && !draft.aiModel) {
                                patch.aiModel = p.defaultModel;
                              }
                              set(patch);
                            }}
                            className={cn(
                              'flex items-center gap-2 rounded-[8px] border px-3 py-2.5 text-left transition-all',
                              active
                                ? 'border-accent bg-accent/10 text-text-primary ring-1 ring-accent'
                                : 'border-border bg-bg-surface text-text-secondary hover:border-accent/50 hover:text-text-primary',
                            )}
                          >
                            <span
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px]"
                              style={{ backgroundColor: `${p.color}1A`, color: p.color }}
                            >
                              {p.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{p.name}</span>
                              <span className="block truncate text-xs text-text-secondary">
                                {p.description}
                              </span>
                            </span>
                            {active && <Check className="h-4 w-4 flex-shrink-0 text-accent" />}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.aiBaseUrl')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={draft.aiBaseUrl}
                      onChange={(e) => set({ aiBaseUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                    />
                    {(() => {
                      const preset = getProviderPreset(draft.aiProvider);
                      return (
                        <p className="mt-1.5 text-xs text-text-secondary">
                          {preset.name} — {preset.description}
                        </p>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.aiModel')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <select
                        value={draft.aiModel}
                        onChange={(e) => set({ aiModel: e.target.value })}
                        className="flex-1 h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm"
                      >
                        <option value="">
                          {getProviderPreset(draft.aiProvider).defaultModel || 'gpt-4o-mini'}
                        </option>
                        {modelsQuery.data?.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.id}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        size="icon"
                        loading={modelsQuery.isFetching}
                        onClick={() => modelsQuery.refetch()}
                        title={t('ai.refreshModels')}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    {modelsQuery.error && (
                      <p className="mt-1.5 text-xs text-red-500">{t('ai.modelListError')}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.aiApiKey')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="password"
                      value={draft.aiApiKey}
                      onChange={(e) => set({ aiApiKey: e.target.value })}
                      placeholder="sk-..."
                    />
                    {(() => {
                      const preset = getProviderPreset(draft.aiProvider);
                      if (!preset.keyUrl) return null;
                      return (
                        <a
                          href={preset.keyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          {t('settings.aiGetKey')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.aiRagEnabled')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <button
                      onClick={() => set({ aiRagEnabled: !draft.aiRagEnabled })}
                      className={cn(
                        'w-12 h-7 rounded-full transition-colors relative',
                        draft.aiRagEnabled ? 'bg-accent' : 'bg-border',
                      )}
                    >
                      <motion.span
                        className="absolute top-1 left-1 h-5 w-5 bg-white rounded-full shadow-sm"
                        initial={false}
                        animate={{ x: draft.aiRagEnabled ? 20 : 0 }}
                        transition={MOTION_FAST}
                      />
                    </button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.aiSystemPrompt')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={draft.aiSystemPrompt}
                      onChange={(e) => set({ aiSystemPrompt: e.target.value })}
                      placeholder={t('settings.aiSystemPromptPlaceholder')}
                      rows={5}
                      className="text-sm"
                    />
                    <p className="mt-1.5 text-xs text-text-secondary">
                      {t('settings.aiSystemPromptHint')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === 'startup' && (
              <div className="flex flex-col gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.splashEnabled')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <button
                      onClick={() => set({ splashEnabled: !draft.splashEnabled })}
                      className={cn(
                        'w-12 h-7 rounded-full transition-colors relative',
                        draft.splashEnabled ? 'bg-accent' : 'bg-border',
                      )}
                    >
                      <motion.span
                        className="absolute top-1 left-1 h-5 w-5 bg-white rounded-full shadow-sm"
                        initial={false}
                        animate={{ x: draft.splashEnabled ? 20 : 0 }}
                        transition={MOTION_FAST}
                      />
                    </button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.splashDuration')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={800}
                        max={4000}
                        step={100}
                        value={draft.splashDurationMs}
                        onChange={(e) => set({ splashDurationMs: Number(e.target.value) })}
                        className="flex-1 accent-accent"
                      />
                      <span className="text-sm w-16 text-right text-text-primary">
                        {(draft.splashDurationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </CardContent>
                </Card>
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

            {tab === 'help' && (
              <div className="flex flex-col gap-4 text-sm">
                <Card>
                  <CardContent className="space-y-4">
                    <h3 className="text-sm font-semibold text-text-primary">{t('settings.helpTimeline')}</h3>
                    <p className="text-xs text-text-secondary">{t('settings.helpTimelineDesc')}</p>
                    <ul className="text-xs text-text-primary/80 space-y-1">
                      <li>• {t('settings.helpTimeline1')}</li>
                      <li>• {t('settings.helpTimeline2')}</li>
                      <li>• {t('settings.helpTimeline3')}</li>
                      <li>• {t('settings.helpTimeline4')}</li>
                      <li>• {t('settings.helpTimeline5')}</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-4">
                    <h3 className="text-sm font-semibold text-text-primary">{t('settings.helpOutline')}</h3>
                    <p className="text-xs text-text-secondary">{t('settings.helpOutlineDesc')}</p>
                    <ul className="text-xs text-text-primary/80 space-y-1">
                      <li>• {t('settings.helpOutline1')}</li>
                      <li>• {t('settings.helpOutline2')}</li>
                      <li>• {t('settings.helpOutline3')}</li>
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-4">
                    <h3 className="text-sm font-semibold text-text-primary">{t('settings.helpPomodoro')}</h3>
                    <p className="text-xs text-text-secondary">{t('settings.helpPomodoroDesc')}</p>
                    <ul className="text-xs text-text-primary/80 space-y-1">
                      <li>• {t('settings.helpPomodoro1')}</li>
                      <li>• {t('settings.helpPomodoro2')}</li>
                      <li>• {t('settings.helpPomodoro3')}</li>
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
                    <p className="text-xs text-text-secondary mt-1">v{APP_VERSION}</p>
                    <p className="text-sm text-text-secondary mt-3">
                      面向小说作者、编剧与游戏叙事设计师的本地优先创作工作台。
                    </p>
                    <p className="text-xs text-text-secondary/60 mt-4">
                      技术栈：Tauri 2 + React 18 + TypeScript + Tailwind CSS v4 + SQLite
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {t('settings.checkUpdateTitle')}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      {installUpdate
                        ? t('settings.updateInstallPrompt', { version: updateVersion ?? '?' })
                        : t('settings.checkUpdateDesc')}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                        loading={checkingUpdate}
                        onClick={handleCheckUpdate}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t('settings.checkUpdateCta')}
                      </Button>
                      {installUpdate && (
                        <Button
                          size="sm"
                          className="gap-2"
                          loading={installingUpdate}
                          onClick={handleInstallUpdate}
                        >
                          {t('settings.updateInstallCta')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm font-semibold">{title}</Label>
      {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
