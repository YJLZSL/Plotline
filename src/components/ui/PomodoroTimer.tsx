import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, X, Timer } from 'lucide-react';

import { cn } from '@/lib/utils';
import { MOTION_BASE, MOTION_FAST } from '@/lib/motion';
import { useI18n } from '@/hooks/useI18n';
import { playSoundIfEnabled } from '@/lib/sound';
import {
  usePomodoroStore,
  formatPomodoroTime,
  type PomodoroPhase,
  type PomodoroTheme,
} from '@/stores/pomodoro';
import { Button } from './Button';

const THEMES: Array<{ value: PomodoroTheme; labelKey: string }> = [
  { value: 'warm', labelKey: 'pomodoro.themeWarm' },
  { value: 'mc', labelKey: 'pomodoro.themeMc' },
  { value: 'minimal', labelKey: 'pomodoro.themeMinimal' },
];

interface PomodoroTimerProps {
  open: boolean;
  onClose: () => void;
}

export function PomodoroTimer({ open, onClose }: PomodoroTimerProps) {
  const { t } = useI18n();
  const {
    phase,
    theme,
    secondsLeft,
    isRunning,
    completedFocusSessions,
    setTheme,
    setPhase,
    start,
    pause,
    reset,
    tick,
    skip,
  } = usePomodoroStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSecondsRef = useRef(secondsLeft);
  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => tick(), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, tick]);

  useEffect(() => {
    if (prevSecondsRef.current === 1 && secondsLeft === 0) {
      playSoundIfEnabled(theme === 'mc' ? 'explosion' : 'complete');
    }
    prevSecondsRef.current = secondsLeft;
  }, [secondsLeft, theme]);

  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      playSoundIfEnabled(theme === 'mc' ? 'switch' : 'click');
      prevPhaseRef.current = phase;
    }
  }, [phase, theme]);

  const totalSeconds = phase === 'focus' ? 25 * 60 : phase === 'shortBreak' ? 5 * 60 : 15 * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;

  const themeClasses = THEME_CLASSES[theme];
  const isPixel = theme === 'mc';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={MOTION_BASE}
          className={cn(
            'fixed bottom-4 right-4 z-[100] w-80 rounded-[12px] border shadow-[var(--shadow-elevated)] overflow-hidden',
            themeClasses.container,
          )}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-black/5">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span className="text-sm font-semibold">{t('pomodoro.title')}</span>
            </div>
            <button
              onClick={onClose}
              className="text-current/60 hover:text-current p-1 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 主题切换 */}
          <div className="px-4 pt-3">
            <div className="flex items-center gap-1.5 p-1 rounded-[6px] bg-black/5">
              {THEMES.map((th) => (
                <button
                  key={th.value}
                  onClick={() => setTheme(th.value)}
                  className={cn(
                    'flex-1 h-7 text-xs rounded-[4px] transition-colors',
                    theme === th.value
                      ? 'bg-bg-surface text-text-primary shadow-sm'
                      : 'text-current/70 hover:text-current',
                  )}
                  style={{ fontFamily: th.value === 'mc' ? 'var(--font-pixel)' : undefined }}
                >
                  {t(th.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* 阶段切换 */}
          <div className="px-4 pt-3">
            <div className="flex items-center gap-1.5">
              {(['focus', 'shortBreak', 'longBreak'] as PomodoroPhase[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className={cn(
                    'flex-1 h-8 text-xs rounded-[6px] border transition-colors',
                    phase === p
                      ? 'border-current bg-current/10'
                      : 'border-transparent hover:bg-black/5',
                  )}
                >
                  {t(`pomodoro.phase${capitalize(p)}`)}
                </button>
              ))}
            </div>
          </div>

          {/* 计时显示 */}
          <div className="px-4 py-5 flex flex-col items-center">
            <div
              className={cn(
                'text-5xl font-bold tracking-tight tabular-nums',
                isPixel && 'font-pixel',
              )}
            >
              {formatPomodoroTime(secondsLeft)}
            </div>
            <p className="mt-1.5 text-xs opacity-70">{t(`pomodoro.phaseHint.${phase}`)}</p>

            {/* 进度条 */}
            <div className="w-full mt-4 h-2 rounded-full bg-black/10 overflow-hidden">
              <motion.div
                className={cn('h-full', theme === 'mc' ? 'bg-emerald-600' : 'bg-current')}
                initial={{ width: '0%' }}
                animate={{ width: `${progress * 100}%` }}
                transition={MOTION_FAST}
                style={theme === 'mc' ? {} : { opacity: 0.8 }}
              />
            </div>

            {/* MC 主题方块进度 */}
            {theme === 'mc' && (
              <div className="w-full mt-3 flex items-center justify-between gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <PixelHeart key={i} filled={i / 10 < progress} />
                ))}
              </div>
            )}

            {theme === 'mc' && progress >= 0.9 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-3"
              >
                <CreeperFace />
              </motion.div>
            )}

            <p className="mt-3 text-[11px] opacity-60">
              {t('pomodoro.completedSessions', { count: completedFocusSessions })}
            </p>
          </div>

          {/* 控制按钮 */}
          <div className="px-4 pb-4 flex items-center justify-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                playSoundIfEnabled('click');
                if (isRunning) {
                  pause();
                } else {
                  start();
                }
              }}
              className={cn('gap-1.5 min-w-[88px]', themeClasses.button)}
            >
              {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isRunning ? t('pomodoro.pause') : t('pomodoro.start')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                playSoundIfEnabled(theme === 'mc' ? 'switch' : 'switch');
                reset();
              }}
              className="gap-1.5 px-2.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                playSoundIfEnabled(theme === 'mc' ? 'switch' : 'switch');
                skip();
              }}
              className="gap-1.5 px-2.5"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PixelHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 8 8" className="block">
      {filled ? (
        <path
          d="M1 2 h1 v-1 h1 v1 h1 v1 h1 v1 h-1 v1 h-1 v1 h-1 v-1 h-1 v-1 h-1 v-1 h1 z"
          fill="#e03e3e"
        />
      ) : (
        <path
          d="M1 2 h1 v-1 h1 v1 h1 v1 h1 v1 h-1 v1 h-1 v1 h-1 v-1 h-1 v-1 h-1 v-1 h1 z"
          fill="none"
          stroke="#3b4a2b"
          strokeWidth="0.5"
          opacity="0.3"
        />
      )}
    </svg>
  );
}

function CreeperFace() {
  return (
    <svg width="48" height="48" viewBox="0 0 8 8" className="block">
      <rect width="8" height="8" fill="#5b8c39" />
      <rect x="1" y="2" width="2" height="2" fill="#2f2418" />
      <rect x="5" y="2" width="2" height="2" fill="#2f2418" />
      <rect x="2" y="4" width="1" height="2" fill="#2f2418" />
      <rect x="5" y="4" width="1" height="2" fill="#2f2418" />
      <rect x="3" y="5" width="2" height="1" fill="#2f2418" />
    </svg>
  );
}

const THEME_CLASSES: Record<
  PomodoroTheme,
  { container: string; button: string }
> = {
  warm: {
    container:
      'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900 border-amber-200',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  mc: {
    container: 'bg-bg-surface text-text-primary border-border font-pixel',
    button: 'bg-accent hover:brightness-110 text-white',
  },
  minimal: {
    container: 'bg-bg-surface text-text-primary border-border',
    button: 'bg-text-primary hover:bg-text-primary/90 text-bg-surface',
  },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
