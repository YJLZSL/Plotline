import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useDragControls } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, X, Timer, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { MOTION_BASE, MOTION_FAST } from '@/lib/motion';
import { useI18n } from '@/hooks/useI18n';
import { useAmbientAnimation } from '@/hooks/useAmbientAnimation';
import { playSoundIfEnabled } from '@/lib/sound';
import { toastInfo, toastSuccess } from '@/stores/toast';
import {
  usePomodoroStore,
  formatPomodoroTime,
  getDefaultPomodoroPosition,
  type PomodoroPhase,
  type PomodoroTheme,
} from '@/stores/pomodoro';
import { Button } from './Button';
import McHeart from './icons/McHeart';
import McHunger from './icons/McHunger';
import { PixelBlock } from './PomodoroTimerBlocks';
import {
  getBlockType,
  getAchievementBlockType,
} from './PomodoroTimer.utils';

const THEMES: Array<{ value: PomodoroTheme; labelKey: string }> = [
  { value: 'warm', labelKey: 'pomodoro.themeWarm' },
  { value: 'mc', labelKey: 'pomodoro.themeMc' },
  { value: 'minimal', labelKey: 'pomodoro.themeMinimal' },
];

const BLOCK_COUNT = 10;

interface PomodoroTimerProps {
  open: boolean;
  onClose: () => void;
  workspaceName?: string;
}

export function PomodoroTimer({ open, onClose, workspaceName }: PomodoroTimerProps) {
  const { t } = useI18n();
  const ambient = useAmbientAnimation();
  const {
    phase,
    theme,
    secondsLeft,
    isRunning,
    completedFocusSessions,
    position,
    minimized,
    setTheme,
    setPhase,
    setPosition,
    toggleMinimized,
    start,
    pause,
    reset,
    tick,
    skip,
  } = usePomodoroStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSecondsRef = useRef(secondsLeft);
  const prevPhaseRef = useRef(phase);
  const [showConfetti, setShowConfetti] = useState(false);
  const breakParticles = useMemo(() => makeBreakParticles(6), []);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const initialPosition = position ?? getDefaultPomodoroPosition();
  const x = useMotionValue(initialPosition.x);
  const y = useMotionValue(initialPosition.y);

  useEffect(() => {
    if (!position) {
      setPosition(getDefaultPomodoroPosition());
    }
  }, [position, setPosition]);

  const handleDragEnd = () => {
    setPosition({ x: x.get(), y: y.get() });
  };

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
      if (phase === 'focus') {
        toastSuccess(t('pomodoro.focusComplete'));
      } else {
        toastInfo(t('pomodoro.breakComplete'));
      }
    }
    prevSecondsRef.current = secondsLeft;
  }, [secondsLeft, theme, phase, t]);

  useEffect(() => {
    if (prevPhaseRef.current === phase) return;
    playSoundIfEnabled(theme === 'mc' ? 'place' : 'switch');
    prevPhaseRef.current = phase;
    if (!ambient.animate) return;
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 1200);
    return () => clearTimeout(timer);
  }, [phase, theme, ambient.animate]);

  const totalSeconds = phase === 'focus' ? 25 * 60 : phase === 'shortBreak' ? 5 * 60 : 15 * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;

  const themeClasses = THEME_CLASSES[theme];
  const isPixel = theme === 'mc';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={constraintsRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={MOTION_BASE}
          className="fixed inset-0 z-[99] pointer-events-none"
        >
          <AnimatePresence mode="wait">
            {minimized ? (
              <motion.button
                key="pomodoro-chip"
                style={{ x, y }}
                drag
                dragMomentum={false}
                dragConstraints={constraintsRef}
                onDragEnd={handleDragEnd}
                onClick={() => toggleMinimized()}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={MOTION_BASE}
                className={cn(
                  'absolute top-0 left-0 z-[100] pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-[var(--shadow-elevated)] text-sm font-semibold',
                  themeClasses.chip,
                )}
                aria-label={t('pomodoro.restore')}
                title={t('pomodoro.restore')}
              >
                <Timer className="h-3.5 w-3.5" />
                <span className="tabular-nums">{formatPomodoroTime(secondsLeft)}</span>
              </motion.button>
            ) : (
              <motion.div
                key="pomodoro-panel"
                style={{ x, y }}
                drag
                dragControls={dragControls}
                dragListener={false}
                dragMomentum={false}
                dragConstraints={constraintsRef}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={MOTION_BASE}
                className={cn(
                  'absolute top-0 left-0 z-[100] w-80 rounded-[12px] border shadow-[var(--shadow-elevated)] overflow-hidden relative pointer-events-auto',
                  themeClasses.container,
                )}
              >
                {ambient.animate && phase !== 'focus' && (
                  <div
                    data-testid="pomodoro-particles"
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    aria-hidden="true"
                  >
                    {breakParticles.map((p) => (
                      <motion.div
                        key={p.id}
                        className="absolute rounded-[2px] bg-accent/25"
                        style={{
                          left: p.left,
                          top: p.top,
                          width: p.size,
                          height: p.size,
                        }}
                        animate={{
                          y: [0, p.distance],
                          opacity: [0.2, 0.6, 0.2],
                        }}
                        transition={{
                          duration: p.duration,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: p.delay,
                        }}
                      />
                    ))}
                  </div>
                )}

                <AnimatePresence>
                  {ambient.animate && showConfetti && (
                    <motion.div
                      key="confetti"
                      data-testid="pomodoro-confetti"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 overflow-hidden pointer-events-none"
                      aria-hidden="true"
                    >
                      {CONFETTI_SQUARES.map((s) => (
                        <motion.div
                          key={s.id}
                          className="absolute left-1/2 top-1/2 rounded-[1px]"
                          style={{
                            width: s.size,
                            height: s.size,
                            backgroundColor: s.color,
                          }}
                          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                          animate={{
                            x: s.x,
                            y: s.y,
                            opacity: 0,
                            scale: 0,
                            rotate: s.rotate,
                          }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  onPointerDown={(e) => dragControls.start(e)}
                  className="flex items-center justify-between px-4 h-12 border-b border-black/5 cursor-move"
                >
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{t('pomodoro.title')}</span>
                      {workspaceName && (
                        <span className="text-[10px] opacity-60 truncate max-w-[120px]">{workspaceName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleMinimized()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="text-current/60 hover:text-current p-1 rounded transition-colors"
                      aria-label={t('pomodoro.minimize')}
                      title={t('pomodoro.minimize')}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={onClose}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="text-current/60 hover:text-current p-1 rounded transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

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
                          th.value === 'mc' && 'font-pixel',
                        )}
                      >
                        {t(th.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

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

                <div className="px-4 py-5 flex flex-col items-center">
                  <div
                    className={cn(
                      'text-5xl font-bold tracking-tight tabular-nums',
                      isPixel && 'font-pixel tracking-widest',
                    )}
                  >
                    {formatPomodoroTime(secondsLeft)}
                  </div>
                  <p className="mt-1.5 text-xs opacity-70">{t(`pomodoro.phaseHint.${phase}`)}</p>

                  {theme !== 'mc' && (
                    <div className="w-full mt-4 h-2 rounded-full bg-black/10 overflow-hidden">
                      <motion.div
                        className="h-full bg-current opacity-80"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={MOTION_FAST}
                      />
                    </div>
                  )}

                  {theme === 'mc' && (
                    <>
                      <div
                        data-testid="mc-session-health"
                        className="w-full mt-4 flex items-center justify-center gap-2"
                        aria-label={t('pomodoro.sessionHealth')}
                      >
                        <McHeart className="h-5 w-5" />
                        <span className="text-[10px] font-pixel opacity-80">
                          {t('pomodoro.sessionHealth')}
                        </span>
                        <McHunger className="h-5 w-5" />
                      </div>
                      <div
                        data-testid="mc-block-progress"
                        className="w-full mt-2 flex items-center justify-between gap-1"
                      >
                        {Array.from({ length: BLOCK_COUNT }).map((_, i) => (
                          <PixelBlock
                            key={i}
                            blockType={getBlockType(i, BLOCK_COUNT, progress)}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {theme === 'mc' && progress >= 1 && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-3 relative h-14 w-full flex items-center justify-center"
                    >
                      <div className="mc-explosion absolute">
                        <div className="mc-creeper-shake">
                          <CreeperFace />
                        </div>
                      </div>
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="relative z-10 text-xl font-pixel text-red-500 drop-shadow-sm"
                      >
                        {t('pomodoro.boom')}
                      </motion.span>
                    </motion.div>
                  )}

                  {theme === 'mc' && progress >= 0.9 && progress < 1 && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-3"
                    >
                      <CreeperFace />
                    </motion.div>
                  )}

                  {theme === 'mc' && completedFocusSessions > 0 && (
                    <div data-testid="mc-achievements" className="mt-3 flex items-center gap-1.5">
                      <span className="text-[10px] opacity-60 font-pixel">成就:</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: Math.min(completedFocusSessions, 10) }).map((_, i) => (
                          <AchievementBlock key={i} index={i} />
                        ))}
                        {completedFocusSessions > 10 && (
                          <span className="text-[10px] font-pixel opacity-80">+{completedFocusSessions - 10}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="mt-3 text-[11px] opacity-60">
                    {t('pomodoro.completedSessions', { count: completedFocusSessions })}
                  </p>
                </div>

                <div className="px-4 pb-4 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      playSoundIfEnabled(theme === 'mc' ? 'mine' : 'click');
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
                    aria-label={t('pomodoro.reset')}
                    onClick={() => {
                      playSoundIfEnabled(theme === 'mc' ? 'place' : 'switch');
                      reset();
                    }}
                    className="gap-1.5 px-2.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t('pomodoro.skip')}
                    onClick={() => {
                      playSoundIfEnabled(theme === 'mc' ? 'place' : 'switch');
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AchievementBlock({ index }: { index: number }) {
  const type = getAchievementBlockType(index + 1);
  return <PixelBlock blockType={type} size={12} />;
}

function CreeperFace() {
  return (
    <svg width="48" height="48" viewBox="0 0 8 8" className="block" aria-label="creeper" role="img">
      <rect width="8" height="8" fill="#6BA04A" />
      <rect x="1" y="2" width="2" height="2" fill="#2F2418" />
      <rect x="5" y="2" width="2" height="2" fill="#2F2418" />
      <rect x="2" y="4" width="1" height="2" fill="#2F2418" />
      <rect x="5" y="4" width="1" height="2" fill="#2F2418" />
      <rect x="3" y="5" width="2" height="1" fill="#2F2418" />
    </svg>
  );
}

const CONFETTI_COLORS = [
  '#F4B6C2',
  '#B6D4F4',
  '#B6F4C8',
  '#F4E4B6',
  '#D8B6F4',
  '#F4CBB6',
  '#C68A3E',
];

const CONFETTI_SQUARES = Array.from({ length: 16 }).map((_, i) => ({
  id: i,
  size: 6 + (i % 3) * 2,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
  x: (Math.random() - 0.5) * 120,
  y: (Math.random() - 1) * 100,
  rotate: (Math.random() - 0.5) * 360,
}));

interface BreakParticle {
  id: number;
  left: string;
  top: string;
  size: number;
  distance: number;
  duration: number;
  delay: number;
}

function makeBreakParticles(count: number): BreakParticle[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: `${10 + Math.random() * 80}%`,
    top: `${20 + Math.random() * 60}%`,
    size: 3 + Math.round(Math.random() * 4),
    distance: -20 - Math.random() * 40,
    duration: 3 + Math.random() * 2,
    delay: Math.random() * 2,
  }));
}

const THEME_CLASSES: Record<
  PomodoroTheme,
  { container: string; chip: string; button: string }
> = {
  warm: {
    container:
      'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900 border-amber-200',
    chip:
      'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900 border-amber-200',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  mc: {
    container:
      'bg-bg-surface text-text-primary border-border font-pixel mc-plank mc-block mc-shadow',
    chip:
      'bg-bg-surface text-text-primary border-border font-pixel mc-plank mc-block mc-shadow',
    button: 'bg-accent hover:brightness-110 text-white mc-block',
  },
  minimal: {
    container: 'bg-bg-surface text-text-primary border-border',
    chip: 'bg-bg-surface text-text-primary border-border',
    button: 'bg-text-primary hover:bg-text-primary/90 text-bg-surface',
  },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
