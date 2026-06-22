import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

import { useToastStore, type ToastKind } from '@/stores/toast';
import { cn } from '@/lib/utils';

const iconMap: Record<ToastKind, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styleMap: Record<ToastKind, string> = {
  success: 'border-status-done/40 bg-status-done/10 text-status-done',
  error: 'border-red-500/40 bg-red-500/10 text-red-500',
  info: 'border-accent/40 bg-accent/10 text-accent',
  warning: 'border-status-revise/40 bg-status-revise/10 text-status-revise',
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm',
        'pointer-events-none',
      )}
      role="region"
      aria-label="通知"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = iconMap[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-3 pr-2',
                'border rounded-[8px] shadow-[var(--shadow-card)] bg-bg-surface',
                styleMap[t.kind],
              )}
              role="alert"
            >
              <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-text-primary flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
                aria-label="关闭通知"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
