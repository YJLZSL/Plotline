import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { RotateCcw, Upload, ChevronDown } from 'lucide-react';

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
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { MOTION_TAB } from '@/lib/motion';
import { toastError, toastInfo, toastSuccess } from '@/stores/toast';
import { useThemeStore } from '@/stores/ui';
import { useSettingsQuery, useUpdateSettings } from '@/features/settings/hooks';
import { checkForUpdates } from '@/features/settings/updater';
import { importFont, listImportedFonts, loadImportedFontFaces } from '@/features/font/api';
import { APP_VERSION } from '@/lib/version';
import { ThemeSelector, FontSelector, AnimationPreview } from '@/features/settings/components';
import { AiSettingsSection } from '@/features/ai/components/AiSettingsSection';
import type { AppSettings, DefaultView, Language } from '@/types';

interface SettingsViewProps {
  workspaceId: string;
  workspaceName?: string;
}

type Tab = 'appearance' | 'editor' | 'ai' | 'data' | 'about';

const TABS: Array<{ id: Tab; labelKey: string; descriptionKey: string }> = [
  { id: 'appearance', labelKey: 'settings.appearance', descriptionKey: 'settings.appearanceDescription' },
  { id: 'editor', labelKey: 'settings.editor', descriptionKey: 'settings.editorDescription' },
  { id: 'ai', labelKey: 'settings.ai', descriptionKey: 'settings.aiDescription' },
  { id: 'data', labelKey: 'settings.data', descriptionKey: 'settings.dataDescription' },
  { id: 'about', labelKey: 'settings.about', descriptionKey: 'settings.aboutDescription' },
];

const ACCENT_PALETTE = ['#C68A3E', '#A86A2C', '#B85537', '#7B5E3C', '#D4A574', '#9C6B3E'];

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
  const [searchQuery, setSearchQuery] = useState('');
  const reduced = useReducedMotion();
  const panelTransition = reduced ? { duration: 0 } : MOTION_TAB;

  useEffect(() => {
    void listImportedFonts().then((fonts) => setImportedFonts(fonts));
  }, []);

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
        ? `"${family}", ${FONT_STACKS_SANS_FALLBACK}`
        : `"${family}", ${FONT_STACKS_MONO_FALLBACK}`;
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

  const settingCards = buildSettingCards({
    t,
    draft,
    set,
    importedFonts,
    applyImportedFont,
    handleImportFont,
    i18n,
    settings,
    checkingUpdate,
    installUpdate,
    installingUpdate,
    updateVersion,
    handleCheckUpdate,
    handleInstallUpdate,
  });

  const activeTabDef = TABS.find((tb) => tb.id === tab)!;

  const filteredTabs = (() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return TABS.map((tb) => {
      const tabTitle = t(tb.labelKey).toLowerCase();
      const tabDesc = t(tb.descriptionKey).toLowerCase();
      const tabMatch = tabTitle.includes(query) || tabDesc.includes(query);
      const cards = settingCards[tb.id]
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => {
          if (tabMatch) return true;
          return (
            card.title.toLowerCase().includes(query) ||
            (card.description?.toLowerCase().includes(query) ?? false)
          );
        });
      return { ...tb, cards };
    }).filter((tb) => tb.cards.length > 0);
  })();

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
              onClick={() => {
                setTab(tb.id);
                setSearchQuery('');
              }}
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
          <div className="max-w-2xl mx-auto flex flex-col gap-5">
            <div className="sticky top-0 z-10 -mx-6 px-6 pb-2 bg-bg-base/95 backdrop-blur-sm">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('settings.searchPlaceholder')}
                data-testid="settings-search-input"
                className="h-10"
              />
            </div>

            <AnimatePresence mode="wait">
              {searchQuery.trim().length > 0 ? (
                <motion.div
                  key="search-results"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={panelTransition}
                  className="flex flex-col gap-5"
                  data-testid="settings-search-results"
                >
                  {filteredTabs.length === 0 && (
                    <div className="text-sm text-text-secondary text-center py-8">{t('common.noResults')}</div>
                  )}
                  {filteredTabs.map((tb) => (
                    <div key={tb.id} className="flex flex-col gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-text-primary">{t(tb.labelKey)}</h2>
                        <p className="text-xs text-text-secondary">{t(tb.descriptionKey)}</p>
                      </div>
                      {tb.cards.map(({ card, index }) => (
                        <Card key={`${tb.id}-${index}`} data-testid={card.testId}>
                          <CardHeader>
                            <CardTitle>{card.title}</CardTitle>
                            {card.description && <CardDescription>{card.description}</CardDescription>}
                          </CardHeader>
                          <CardContent>{card.content}</CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={panelTransition}
                  className="flex flex-col gap-5"
                  data-testid={`settings-tab-panel-${tab}`}
                >
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">{t(activeTabDef.labelKey)}</h2>
                    <p className="text-xs text-text-secondary mt-0.5">{t(activeTabDef.descriptionKey)}</p>
                  </div>
                  {settingCards[tab].map((card, index) => (
                    <Card key={`${tab}-${index}`} data-testid={card.testId}>
                      <CardHeader>
                        <CardTitle>{card.title}</CardTitle>
                        {card.description && <CardDescription>{card.description}</CardDescription>}
                      </CardHeader>
                      <CardContent>{card.content}</CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

const FONT_STACKS_SANS_FALLBACK =
  '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif';
const FONT_STACKS_MONO_FALLBACK =
  '"JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, "SFMono-Regular", "Noto Sans Mono CJK SC", "Microsoft YaHei", "Noto Sans Mono SC", monospace';

interface BuildSettingCardsContext {
  t: (key: string, options?: Record<string, unknown>) => string;
  draft: AppSettings;
  set: (patch: Partial<AppSettings>) => void;
  importedFonts: string[];
  applyImportedFont: (family: string, target: 'ui' | 'editor') => void;
  handleImportFont: (file: File) => Promise<void>;
  i18n: { changeLanguage: (lng: Language) => Promise<unknown> };
  settings: AppSettings | undefined;
  checkingUpdate: boolean;
  installUpdate: (() => Promise<void>) | null;
  installingUpdate: boolean;
  updateVersion: string | null;
  handleCheckUpdate: () => Promise<void>;
  handleInstallUpdate: () => Promise<void>;
}

interface SettingCard {
  title: string;
  description?: string;
  testId: string;
  content: React.ReactNode;
}

function buildSettingCards(ctx: BuildSettingCardsContext): Record<Tab, SettingCard[]> {
  const {
    t,
    draft,
    set,
    importedFonts,
    applyImportedFont,
    handleImportFont,
    i18n,
    settings,
    checkingUpdate,
    installUpdate,
    installingUpdate,
    updateVersion,
    handleCheckUpdate,
    handleInstallUpdate,
  } = ctx;

  return {
    appearance: [
      {
        title: t('settings.theme'),
        description: t('settings.themeDescription'),
        testId: 'theme-card',
        content: (
          <ThemeSelector
            value={draft.theme}
            accentColor={draft.accentColor}
            onChange={(theme) => set({ theme })}
          />
        ),
      },
      {
        title: t('settings.accentColor'),
        description: t('settings.accentColorDescription'),
        testId: 'accent-color-card',
        content: (
          <div className="flex gap-2 flex-wrap">
            {ACCENT_PALETTE.map((c) => (
              <button
                key={c}
                data-testid={`accent-color-${c}`}
                onClick={() => set({ accentColor: c })}
                className={cn(
                  'h-9 w-9 rounded-full transition-transform flex items-center justify-center',
                  draft.accentColor === c
                    ? 'ring-2 ring-offset-2 ring-text-primary/40 scale-110'
                    : 'hover:scale-110',
                )}
                style={{ backgroundColor: c }}
                aria-label={c}
              >
                {draft.accentColor === c && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        ),
      },
      {
        title: t('settings.language'),
        description: t('settings.languageDescription'),
        testId: 'language-card',
        content: (
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
                  'h-10 px-4 rounded-[6px] border text-sm transition-colors',
                  draft.language === lng
                    ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent'
                    : 'border-border text-text-secondary hover:bg-bg-elevated',
                )}
              >
                {lng === 'zh-CN' ? '简体中文' : 'English'}
              </button>
            ))}
          </div>
        ),
      },
      {
        title: t('settings.fontTheme'),
        description: t('settings.fontThemeDescription'),
        testId: 'font-theme-card',
        content: (
          <FontSelector
            uiFont={draft.uiFont}
            editorFont={draft.editorFont}
            fontTheme={draft.fontTheme}
            onChange={(patch) => set(patch)}
          />
        ),
      },
      {
        title: t('settings.animationsEnabled'),
        description: t('settings.animationsEnabledDescription'),
        testId: 'animations-card',
        content: (
          <AnimationPreview
            animationsEnabled={draft.animationsEnabled}
            onAnimationsChange={(checked) => {
              set({ animationsEnabled: checked });
            }}
          />
        ),
      },
    ],
    editor: [
      {
        title: t('settings.fontTheme'),
        description: t('settings.fontThemeDescription'),
        testId: 'editor-font-card',
        content: (
          <div className="flex flex-col gap-4">
            <FontSelector
              uiFont={draft.uiFont}
              editorFont={draft.editorFont}
              fontTheme={draft.fontTheme}
              onChange={(patch) => set(patch)}
            />
            <div>
              <Label className="text-sm font-semibold">{t('settings.fontSize')}</Label>
              <p className="text-xs text-text-secondary mt-0.5 mb-2">{t('settings.fontSizeDescription')}</p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={12}
                  max={18}
                  value={draft.fontSize}
                  onChange={(e) => set({ fontSize: Number(e.target.value) })}
                  className="flex-1 accent-accent"
                />
                <span className="text-sm w-12 text-right text-text-primary">{draft.fontSize}px</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: t('settings.defaultView'),
        description: t('settings.defaultViewDescription'),
        testId: 'default-view-card',
        content: (
          <select
            value={draft.defaultView}
            onChange={(e) => set({ defaultView: e.target.value as AppSettings['defaultView'] })}
            className="w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm"
          >
            {(
              [
                'timeline',
                'characters',
                'outline',
                'map',
                'vn',
                'worldbuilding',
                'statistics',
                'notebook',
              ] as DefaultView[]
            ).map((v) => (
              <option key={v} value={v}>
                {t(`nav.${v}`)}
              </option>
            ))}
          </select>
        ),
      },
      {
        title: t('settings.timelineZoom'),
        description: t('settings.timelineZoomDescription'),
        testId: 'timeline-zoom-card',
        content: (
          <select
            value={draft.timelineZoom}
            onChange={(e) => set({ timelineZoom: e.target.value as AppSettings['timelineZoom'] })}
            className="w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm"
          >
            <option value="year">{t('timeline.year')}</option>
            <option value="month">{t('timeline.month')}</option>
            <option value="day">{t('timeline.day')}</option>
            <option value="hour">{t('timeline.hour')}</option>
          </select>
        ),
      },
      {
        title: t('settings.importFont'),
        description: t('settings.importFontDescription'),
        testId: 'import-font-card',
        content: (
          <div className="flex flex-col gap-3">
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
              <div className="flex flex-col gap-2">
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
                        <Button variant="ghost" size="sm" onClick={() => applyImportedFont(family, 'ui')}>
                          {t('settings.setUiFont')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => applyImportedFont(family, 'editor')}>
                          {t('settings.setEditorFont')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ),
      },
    ],
    ai: [
      {
        title: t('settings.ai'),
        description: t('settings.aiDescription'),
        testId: 'ai-settings-card',
        content: <AiSettingsSection draft={draft} set={set} saved={settings} />,
      },
    ],
    data: [
      {
        title: t('settings.backupPath'),
        description: t('settings.backupPathDescription'),
        testId: 'backup-path-card',
        content: (
          <Input
            value={draft.backupPath}
            onChange={(e) => set({ backupPath: e.target.value })}
            placeholder="默认: 应用数据目录"
          />
        ),
      },
      {
        title: t('settings.autoBackup'),
        description: t('settings.autoBackupDescription'),
        testId: 'auto-backup-card',
        content: (
          <div className="flex items-center gap-4">
            <Switch
              checked={draft.autoBackup}
              onCheckedChange={(checked) => set({ autoBackup: checked })}
              data-testid="auto-backup-toggle"
            />
            <span className="text-xs text-text-secondary">{t('settings.backupInterval')}</span>
          </div>
        ),
      },
      {
        title: t('settings.backupInterval'),
        description: t('settings.backupIntervalDescription'),
        testId: 'backup-interval-card',
        content: (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={draft.backupIntervalHours}
              onChange={(e) => set({ backupIntervalHours: Math.max(1, Number(e.target.value)) })}
              className="w-32"
            />
            <span className="text-xs text-text-secondary">{t('settings.backupInterval')}</span>
          </div>
        ),
      },
    ],
    about: [
      {
        title: 'Plotline',
        description: t('settings.aboutDescription'),
        testId: 'about-app-card',
        content: (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-secondary">v{APP_VERSION}</p>
            <p className="text-sm text-text-secondary">
              面向小说作者、编剧与游戏叙事设计师的本地优先创作工作台。
            </p>
            <p className="text-xs text-text-secondary/60">
              技术栈：Tauri 2 + React 18 + TypeScript + Tailwind CSS v4 + SQLite
            </p>
          </div>
        ),
      },
      {
        title: t('settings.featureDescription'),
        description: t('settings.featureDescriptionDesc'),
        testId: 'feature-description-card',
        content: <FeatureDescriptionPanel t={t} />,
      },
      {
        title: t('settings.checkUpdateTitle'),
        description: t('settings.checkUpdateDescription'),
        testId: 'check-update-card',
        content: (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-secondary">
              {installUpdate
                ? t('settings.updateInstallPrompt', { version: updateVersion ?? '?' })
                : t('settings.checkUpdateDesc')}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                loading={checkingUpdate}
                onClick={handleCheckUpdate}
                data-testid="check-update-btn"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={checkingUpdate ? 'animate-spin' : ''}
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                {t('settings.checkUpdateCta')}
              </Button>
              {installUpdate && (
                <Button size="sm" className="gap-2" loading={installingUpdate} onClick={handleInstallUpdate}>
                  {t('settings.updateInstallCta')}
                </Button>
              )}
            </div>
          </div>
        ),
      },
    ],
  };
}

const FEATURE_DESCRIPTION_KEYS: Array<{ titleKey: string; descKey: string }> = [
  { titleKey: 'settings.featureTimeline', descKey: 'settings.featureTimelineDesc' },
  { titleKey: 'settings.featureCharacters', descKey: 'settings.featureCharactersDesc' },
  { titleKey: 'settings.featureOutline', descKey: 'settings.featureOutlineDesc' },
  { titleKey: 'settings.featureMap', descKey: 'settings.featureMapDesc' },
  { titleKey: 'settings.featureNotebook', descKey: 'settings.featureNotebookDesc' },
  { titleKey: 'settings.featurePomodoro', descKey: 'settings.featurePomodoroDesc' },
  { titleKey: 'settings.featureAi', descKey: 'settings.featureAiDesc' },
  { titleKey: 'settings.featureTheme', descKey: 'settings.featureThemeDesc' },
];

function FeatureDescriptionPanel({
  t,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotion();
  const featureTransition = reduced ? { duration: 0 } : MOTION_TAB;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        data-testid="feature-description-toggle"
        className="flex items-center justify-between w-full px-3 py-2 rounded-[6px] bg-bg-elevated hover:bg-border/50 transition-colors text-left"
      >
        <span className="text-sm font-medium text-text-primary">{t('settings.featureDescription')}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-text-secondary transition-transform duration-200',
            expanded && 'rotate-180',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={featureTransition}
            className="overflow-hidden"
            data-testid="feature-description-content"
          >
            <div className="flex flex-col gap-2 px-1 pb-1">
              {FEATURE_DESCRIPTION_KEYS.map(({ titleKey, descKey }) => (
                <div
                  key={titleKey}
                  className="rounded-[6px] border border-border bg-bg-surface p-3"
                >
                  <h4 className="text-sm font-semibold text-text-primary">{t(titleKey)}</h4>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">{t(descKey)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
