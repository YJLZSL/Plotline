import { motion } from 'framer-motion';
import { BookOpen, Box, Check, Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';
import { useUIStore } from '@/stores/ui';
import type { Theme } from '@/types';

const THEMES: Array<{
  value: Theme;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'light', labelKey: 'settings.themeLight', icon: Sun },
  { value: 'dark', labelKey: 'settings.themeDark', icon: Moon },
  { value: 'sepia', labelKey: 'settings.themeSepia', icon: BookOpen },
  { value: 'mc', labelKey: 'settings.themeMc', icon: Box },
];

interface ThemeSelectorProps {
  value: Theme;
  accentColor: string;
  onChange: (theme: Theme) => void;
}

export function ThemeSelector({ value, accentColor, onChange }: ThemeSelectorProps) {
  const { t } = useI18n();
  const enhancedAnimations = useUIStore((s) => s.enhancedAnimations);

  return (
    <div className="grid grid-cols-2 gap-3">
      {THEMES.map((th) => {
        const Icon = th.icon;
        const active = value === th.value;
        return (
          <motion.button
            key={th.value}
            data-testid={`theme-${th.value}`}
            onClick={() => onChange(th.value)}
            whileTap={enhancedAnimations ? { scale: 0.96, rotate: -0.5 } : { scale: 0.98 }}
            className={cn(
              'group relative flex flex-col items-center gap-2 p-4 rounded-[8px] border-2 transition-[colors,box-shadow] overflow-hidden fancy-ripple',
              enhancedAnimations && 'ambient-scale',
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
              <span className="text-[10px] font-medium text-text-primary">Aa</span>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: th.value === 'mc' ? undefined : accentColor }}
              />
            </div>
            <Icon className="h-4 w-4 text-text-secondary" />
            <span className="text-xs font-medium text-text-primary">{t(th.labelKey)}</span>
            {active && (
              <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
                <Check className="h-2.5 w-2.5" />
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
