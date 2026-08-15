import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

import { BrandMark } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
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

/**
 * 应用启动屏：暖色渐变背景 + Logo/羽毛笔/时间线编排动画。
 *
 * - 点击任意位置 / Enter / Space / Esc 或点击"跳过"按钮均可立即跳过。
 * - 内容区不再 stopPropagation（修复 web 模式下点击中央区域无法跳过的问题）。
 * - 尊重 `prefers-reduced-motion` 与设置中的"增强动效"开关。
 */
export function SplashOverlay() {
  const { data: settings } = useSettingsQuery();
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);
  const reduced = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);

  const enabled = settings?.splashEnabled ?? true;
  const duration = settings?.splashDurationMs ?? DEFAULT_DURATION;
  const enhanced = settings?.animationsEnabled !== false && reduced !== true;
  const tMs = useScaledDurations(duration);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(timer);
  }, [enabled, duration]);

  // 打开时自动获得焦点，确保键盘跳过立即可用。
  useEffect(() => {
    if (enabled && visible) overlayRef.current?.focus();
  }, [enabled, visible]);

  const handleSkip = () => setVisible(false);

  if (!enabled) return null;

  const keyLabel = t('splash.skipAria');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          ref={overlayRef}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: EXIT_DURATION_S, ease: EASE_STANDARD }}
          className="fixed inset-0 z-[200] grid place-items-center bg-bg-base outline-none"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, var(--accent-soft) 0%, var(--bg-base) 60%)',
          }}
          onClick={handleSkip}
          role="button"
          aria-label={keyLabel}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
              e.preventDefault();
              handleSkip();
            }
          }}
          data-testid="splash-overlay"
        >
          <div className="flex flex-col items-center gap-5 px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={enhanced ? { opacity: 1, scale: 1 } : { opacity: 1 }}
              transition={{ duration: tMs(600), ease: EASE_STANDARD }}
              className="flex items-center gap-3"
            >
              <div className="h-16 w-16 rounded-[14px] bg-accent/15 grid place-items-center shadow-[var(--shadow-elevated)]">
                <BrandMark size={48} className="text-accent" />
              </div>
              <div className="flex flex-col">
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={enhanced ? { opacity: 1, y: 0 } : { opacity: 1 }}
                  transition={{ duration: tMs(500), ease: EASE_STANDARD, delay: tMs(700) }}
                  className="text-2xl font-bold text-text-primary leading-tight"
                >
                  Plotline
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={enhanced ? { opacity: 1, y: 0 } : { opacity: 1 }}
                  transition={{ duration: tMs(500), ease: EASE_STANDARD, delay: tMs(900) }}
                  className="text-xs text-text-secondary"
                >
                  {t('splash.tagline')}
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
                  initial={{ pathLength: enhanced ? 0 : 1 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: tMs(900),
                    ease: EASE_STANDARD,
                    delay: tMs(300),
                  }}
                />
                {[40, 96, 152].map((cx, i) => (
                  <motion.circle
                    key={i}
                    cx={cx}
                    cy={20}
                    r={4}
                    fill="var(--accent)"
                    initial={enhanced ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 0.9 }}
                    animate={{ scale: 1, opacity: 0.9 }}
                    transition={{
                      duration: tMs(300),
                      ease: EASE_STANDARD,
                      delay: tMs(900) + i * tMs(120),
                    }}
                  />
                ))}
              </svg>
              <motion.div
                className="absolute top-1/2 left-2 -translate-y-1/2"
                initial={enhanced ? { x: 0, opacity: 0 } : { x: 168, opacity: 1 }}
                animate={{ x: 168, opacity: 1 }}
                transition={{
                  duration: tMs(900),
                  ease: EASE_STANDARD,
                  delay: tMs(300),
                }}
              >
                <BrandMark size={20} className="text-accent -rotate-45" />
              </motion.div>
            </div>

            {settings?.theme === 'mc' ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: tMs(400), ease: EASE_STANDARD, delay: tMs(1300) }}
                className="flex flex-col items-center gap-3"
              >
                <PixelGrassBlock />
                <p className="text-[11px] text-text-secondary/70 font-pixel">{t('splash.mcLine')}</p>
              </motion.div>
            ) : (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: tMs(400), ease: EASE_STANDARD, delay: tMs(1300) }}
                className="text-[11px] text-text-secondary/70"
              >
                {t('splash.preparing')}
              </motion.p>
            )}

            <div className="w-48 h-0.5 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: tMs(800),
                  ease: EASE_STANDARD,
                  delay: tMs(1100),
                }}
              />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip();
              }}
              data-testid="splash-skip"
              className="px-3 py-1 rounded-[6px] border border-border bg-bg-surface/70 text-xs text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
            >
              {t('splash.skip')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PixelGrassBlock() {
  return (
    <motion.svg
      width="64"
      height="64"
      viewBox="0 0 8 8"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE_STANDARD }}
    >
      {/* grass top */}
      <rect y="0" width="8" height="3" fill="#5b8c39" />
      <rect x="0" y="0" width="1" height="1" fill="#6ba845" />
      <rect x="2" y="1" width="1" height="1" fill="#6ba845" />
      <rect x="4" y="0" width="1" height="1" fill="#6ba845" />
      <rect x="6" y="1" width="1" height="1" fill="#6ba845" />
      {/* dirt body */}
      <rect y="3" width="8" height="5" fill="#8b5a2b" />
      <rect x="1" y="4" width="1" height="1" fill="#7a4e25" />
      <rect x="5" y="5" width="1" height="1" fill="#7a4e25" />
      <rect x="3" y="6" width="1" height="1" fill="#7a4e25" />
    </motion.svg>
  );
}
