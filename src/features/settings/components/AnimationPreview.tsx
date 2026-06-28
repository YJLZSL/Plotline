import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { Label, Switch } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import { useUIStore } from '@/stores/ui';

interface AnimationPreviewProps {
  animationsEnabled: boolean;
  onAnimationsChange: (enabled: boolean) => void;
}

export function AnimationPreview({ animationsEnabled, onAnimationsChange }: AnimationPreviewProps) {
  const { t } = useI18n();
  const enhancedAnimations = useUIStore((s) => s.enhancedAnimations);
  const setEnhancedAnimations = useUIStore((s) => s.setEnhancedAnimations);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    setPreviewKey((k) => k + 1);
  }, [animationsEnabled, enhancedAnimations]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Switch
            checked={animationsEnabled}
            onCheckedChange={(checked) => onAnimationsChange(checked)}
            data-testid="animations-enabled-toggle"
          />
          <div className="text-xs text-text-secondary -mt-0.5">
            <p className="font-medium text-text-primary">{t('settings.animationsEnabled')}</p>
            <p>{t('settings.animationsEnabledDescription')}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Switch
            checked={enhancedAnimations && animationsEnabled}
            onCheckedChange={(checked) => setEnhancedAnimations(checked)}
            disabled={!animationsEnabled}
            data-testid="enhanced-animations-toggle"
          />
          <div className="text-xs text-text-secondary -mt-0.5">
            <p className="font-medium text-text-primary">{t('settings.enhancedAnimations')}</p>
            <p>{t('settings.enhancedAnimationsDescription')}</p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'rounded-[8px] border border-border bg-bg-elevated/50 p-4',
          !animationsEnabled && 'opacity-70',
        )}
      >
        <Label className="text-xs font-medium text-text-secondary">{t('settings.animationPreviewLabel')}</Label>
        <div className="mt-3 flex items-center gap-3">
          <motion.div
            key={previewKey}
            initial={{ opacity: 0, x: -16, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={animationsEnabled ? MOTION_BASE : { duration: 0 }}
            className={cn(
              'h-9 px-3 rounded-[6px] flex items-center text-sm font-medium',
              'bg-accent text-white shadow-[var(--shadow-card)]',
              enhancedAnimations && animationsEnabled && 'ambient-scale',
            )}
          >
            {t('settings.previewTitle')}
          </motion.div>
          <motion.div
            key={`${previewKey}-dot`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={animationsEnabled ? { ...MOTION_BASE, delay: 0.08 } : { duration: 0 }}
            className="h-3 w-3 rounded-full bg-accent-soft"
          />
        </div>
      </div>
    </div>
  );
}
