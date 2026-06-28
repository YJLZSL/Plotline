import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { Input, Label } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { FONT_STACKS } from '@/lib/fonts';
import { useUIStore } from '@/stores/ui';
import type { FontTheme } from '@/types';

const FONT_THEMES: Array<{
  value: FontTheme;
  labelKey: string;
  previewClass: string;
}> = [
  { value: 'sans', labelKey: 'settings.fontThemeSans', previewClass: 'font-sans' },
  { value: 'mono', labelKey: 'settings.fontThemeMono', previewClass: 'font-mono' },
  { value: 'pixel', labelKey: 'settings.fontThemePixel', previewClass: '[font-family:var(--font-pixel)]' },
  { value: 'smiley', labelKey: 'settings.fontThemeSmiley', previewClass: '[font-family:var(--font-smiley)]' },
];

const FONT_THEME_STACKS: Record<FontTheme, { ui: string; editor: string }> = {
  sans: { ui: FONT_STACKS.sans, editor: FONT_STACKS.mono },
  mono: { ui: FONT_STACKS.mono, editor: FONT_STACKS.mono },
  pixel: { ui: FONT_STACKS.pixel, editor: FONT_STACKS.pixel },
  smiley: { ui: FONT_STACKS.smiley, editor: FONT_STACKS.mono },
};

const FONT_PRESETS: Array<{ labelKey: string; value: string }> = [
  { labelKey: 'settings.fontPresetDefault', value: '' },
  { labelKey: 'settings.fontPresetInter', value: FONT_STACKS.sans },
  { labelKey: 'settings.fontPresetSans', value: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif' },
  { labelKey: 'settings.fontPresetMono', value: FONT_STACKS.mono },
  { labelKey: 'settings.fontPresetPixel', value: FONT_STACKS.pixel },
  { labelKey: 'settings.fontPresetSmiley', value: FONT_STACKS.smiley },
];

interface FontSelectorProps {
  uiFont: string;
  editorFont: string;
  fontTheme: FontTheme;
  onChange: (patch: { uiFont?: string; editorFont?: string; fontTheme?: FontTheme }) => void;
}

export function FontSelector({ uiFont, editorFont, fontTheme, onChange }: FontSelectorProps) {
  const { t } = useI18n();
  const enhancedAnimations = useUIStore((s) => s.enhancedAnimations);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        {FONT_THEMES.map((ft) => {
          const active = fontTheme === ft.value;
          return (
            <motion.button
              key={ft.value}
              data-testid={`font-theme-${ft.value}`}
              onClick={() =>
                onChange({
                  fontTheme: ft.value,
                  uiFont: FONT_THEME_STACKS[ft.value].ui,
                  editorFont: FONT_THEME_STACKS[ft.value].editor,
                })
              }
              whileTap={enhancedAnimations ? { scale: 0.96, rotate: -0.5 } : { scale: 0.98 }}
              className={cn(
                'flex flex-col items-start gap-1.5 p-3 rounded-[8px] border-2 text-left transition-[colors,box-shadow] fancy-ripple',
                enhancedAnimations && 'ambient-scale',
                active
                  ? 'border-accent bg-accent/10 ring-2 ring-accent ring-offset-1 ring-offset-bg-surface'
                  : 'border-border hover:bg-bg-elevated hover:border-accent/30',
              )}
            >
              <span className={cn('text-base font-medium text-text-primary', ft.previewClass)}>
                {t(ft.labelKey)}
              </span>
              <span className={cn('text-xs text-text-secondary', ft.previewClass)}>
                {t('settings.previewSample')}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FontPicker label={t('settings.uiFont')} value={uiFont} onChange={(v) => onChange({ uiFont: v })} />
        <FontPicker label={t('settings.editorFont')} value={editorFont} onChange={(v) => onChange({ editorFont: v })} />
      </div>
    </div>
  );
}

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
  const matched = useMemo(() => FONT_PRESETS.find((p) => p.value === value), [value]);
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
      <p
        data-testid="font-preview"
        className="text-xs text-text-secondary [font-family:var(--preview-font)]"
        style={{ '--preview-font': value || 'inherit' } as React.CSSProperties}
      >
        {t('settings.previewSample')}
      </p>
    </div>
  );
}
