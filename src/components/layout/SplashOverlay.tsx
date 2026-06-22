import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

import { BrandMark } from '@/components/ui';
import { EASE_STANDARD } from '@/lib/motion';
import { useSettingsQuery } from '@/features/settings/hooks';

const DEFAULT_DURATION = 2500;
const EXIT_DURATION_S = 0.4;
const BASE_ANIMATION_MS = 2000;

function useScaledDurations(totalMs: number) {
  const scale = Math.max(
    0.15,
    Math.min(1.8, (totalMs - EXIT_DURATION_S * 1000) / BASE_ANIMATION_MS),
  );
  return (ms: number) => (ms * scale) / 1000;
}

/** 应用启动屏：暖色渐变背景 + Logo/羽毛笔/时间线编排动画。 */
export function SplashOverlay() {
  const { data: settings } = useSettingsQuery();
  const [visible, setVisible] = useState(true);
  const reduced = useReducedMotion();

  const enabled = settings?.splashEnabled ?? true;
  const duration = settings?.splashDurationMs ?? DEFAULT_DURATION;
  const t = useScaledDurations(duration);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [enabled, duration]);

  const handleSkip = () => setVisible(false);

  if (!enabled) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: EXIT_DURATION_S, ease: EASE_STANDARD }}
          className="fixed inset-0 z-[200] grid place-items-center bg-bg-base"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, var(--accent-soft) 0%, var(--bg-base) 60%)',
          }}
          onClick={handleSkip}
          role="button"
          aria-label="点击跳过启动动画"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSkip();
            }
          }}
        >
          {reduced ? (
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-[14px] bg-accent/15 grid place-items-center shadow-[var(--shadow-elevated)]">
                <BrandMark size={48} className="text-accent" />
              </div>
              <div className="flex flex-col items-center">
                <h1 className="text-2xl font-bold text-text-primary leading-tight">Plotline</h1>
                <p className="text-xs text-text-secondary">叙事创作工作台</p>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: t(600), ease: EASE_STANDARD }}
                className="flex items-center gap-3"
              >
                <div className="h-16 w-16 rounded-[14px] bg-accent/15 grid place-items-center shadow-[var(--shadow-elevated)]">
                  <BrandMark size={48} className="text-accent" />
                </div>
                <div className="flex flex-col">
                  <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: t(500), ease: EASE_STANDARD, delay: t(700) }}
                    className="text-2xl font-bold text-text-primary leading-tight"
                  >
                    Plotline
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: t(500), ease: EASE_STANDARD, delay: t(900) }}
                    className="text-xs text-text-secondary"
                  >
                    叙事创作工作台
                  </motion.p>
                </div>
              </motion.div>

              <div className="relative w-48 h-10">
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 192 40"
                  fill="none"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M 8 20 L 184 20"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: t(900),
                      ease: EASE_STANDARD,
                      delay: t(300),
                    }}
                  />
                  {[40, 96, 152].map((cx, i) => (
                    <motion.circle
                      key={i}
                      cx={cx}
                      cy={20}
                      r={4}
                      fill="var(--accent)"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        duration: t(300),
                        ease: EASE_STANDARD,
                        delay: t(900) + i * t(120),
                      }}
                    />
                  ))}
                </svg>
                <motion.div
                  className="absolute top-1/2 left-2 -translate-y-1/2"
                  initial={{ x: 0, opacity: 0 }}
                  animate={{ x: 168, opacity: 1 }}
                  transition={{
                    duration: t(900),
                    ease: EASE_STANDARD,
                    delay: t(300),
                  }}
                >
                  <BrandMark size={20} className="text-accent -rotate-45" />
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: t(400), ease: EASE_STANDARD, delay: t(1300) }}
                className="text-[11px] text-text-secondary/70"
              >
                正在准备你的故事…
              </motion.p>

              <div className="w-48 h-0.5 bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: t(800),
                    ease: EASE_STANDARD,
                    delay: t(1100),
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
