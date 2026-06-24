import { useIsMutating } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';

export function SaveStatus() {
  const { t } = useI18n();
  const isMutating = useIsMutating();
  const saving = isMutating > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-[11px] transition-colors',
        saving ? 'text-accent' : 'text-text-secondary/70',
      )}
      aria-live="polite"
    >
      {saving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t('common.saving')}</span>
        </>
      ) : (
        <>
          <Check className="h-3 w-3" />
          <span>{t('common.saved')}</span>
        </>
      )}
    </div>
  );
}
