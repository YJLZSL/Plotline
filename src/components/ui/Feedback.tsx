import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import type { Transition } from 'framer-motion';

/** 骨架屏：用于加载状态。 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('skeleton rounded-[6px]', className)}
      aria-hidden="true"
    />
  );
}

/** 全屏加载脉冲（不使用旋转 spinner）。 */
export function LoadingVeil({ label = '加载中' }: { label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={MOTION_BASE}
      className="flex flex-col items-center justify-center gap-3 py-12 text-text-secondary"
      role="status"
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-current opacity-60"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <p className="text-xs">{label}</p>
    </motion.div>
  );
}

/** 空状态：引导文案 + 可选 CTA 按钮（支持单个或多个）。 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  actions,
  transition: transitionProp,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actions?: React.ReactNode[];
  transition?: Transition;
}) {
  const reduced = useReducedMotion();
  const transition = reduced ? { duration: 0 } : (transitionProp ?? MOTION_BASE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className="flex flex-col items-center justify-center text-center py-12 px-6"
    >
      {icon && (
        <div className="text-text-secondary mb-3 opacity-60">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary mt-1 max-w-sm">{description}</p>
      )}
      {(action || (actions && actions.length > 0)) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action}
          {actions}
        </div>
      )}
    </motion.div>
  );
}
