import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PomodoroTheme = 'warm' | 'mc' | 'minimal';
export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroAchievements {
  /** ISO 8601 date string (YYYY-MM-DD) for the last recorded focus day. */
  date: string;
  /** Focus sessions completed today. */
  count: number;
  /** Consecutive days with at least one focus session. */
  streak: number;
}

const PHASE_MINUTES: Record<PomodoroPhase, number> = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

interface PomodoroState {
  phase: PomodoroPhase;
  theme: PomodoroTheme;
  secondsLeft: number;
  isRunning: boolean;
  /** True when the current phase just reached 0 and is waiting for the completion animation. */
  phaseCompleted: boolean;
  completedFocusSessions: number;
  achievements: PomodoroAchievements;
  position: { x: number; y: number } | null;
  minimized: boolean;
  mcEasterEggsEnabled: boolean;
  mcEasterEggTriggeredThisSession: boolean;
  setTheme: (theme: PomodoroTheme) => void;
  setPhase: (phase: PomodoroPhase) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  finishPhase: () => void;
  skip: () => void;
  setPosition: (position: { x: number; y: number } | null) => void;
  setMinimized: (minimized: boolean) => void;
  toggleMinimized: () => void;
  resetAchievements: () => void;
  resetTimer: () => void;
  setMcEasterEggsEnabled: (enabled: boolean) => void;
  setMcEasterEggTriggeredThisSession: (triggered: boolean) => void;
}

function phaseSeconds(phase: PomodoroPhase): number {
  return PHASE_MINUTES[phase] * 60;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getDefaultPomodoroPosition(): { x: number; y: number } {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const height = typeof window !== 'undefined' ? window.innerHeight : 768;
  return {
    x: width - 336,
    y: height - 420,
  };
}

function computeNextAchievements(current: PomodoroAchievements): PomodoroAchievements {
  const today = todayISO();
  if (current.date === today) {
    return { date: today, count: current.count + 1, streak: Math.max(current.streak, 1) };
  }
  const streak = current.date === yesterdayISO() ? current.streak + 1 : 1;
  return { date: today, count: 1, streak };
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      phase: 'focus',
      theme: 'warm',
      secondsLeft: phaseSeconds('focus'),
      isRunning: false,
      phaseCompleted: false,
      completedFocusSessions: 0,
      achievements: { date: todayISO(), count: 0, streak: 0 },
      position: null,
      minimized: false,
      mcEasterEggsEnabled: true,
      mcEasterEggTriggeredThisSession: false,
      setTheme: (theme) => set({ theme }),
      setPhase: (phase) =>
        set({
          phase,
          secondsLeft: phaseSeconds(phase),
          isRunning: false,
          phaseCompleted: false,
          mcEasterEggTriggeredThisSession: phase === 'focus' ? false : get().mcEasterEggTriggeredThisSession,
        }),
      start: () => set({ isRunning: true }),
      pause: () => set({ isRunning: false }),
      reset: () => set({ secondsLeft: phaseSeconds(get().phase), isRunning: false }),
      tick: () => {
        const { secondsLeft, isRunning, phase, completedFocusSessions, achievements } = get();
        if (!isRunning || secondsLeft <= 0) return;
        const next = secondsLeft - 1;
        if (next === 0) {
          let nextCompleted = completedFocusSessions;
          let nextAchievements = achievements;
          if (phase === 'focus') {
            nextCompleted += 1;
            nextAchievements = computeNextAchievements(achievements);
          }
          set({
            secondsLeft: 0,
            isRunning: false,
            phaseCompleted: true,
            completedFocusSessions: nextCompleted,
            achievements: nextAchievements,
          });
        } else {
          set({ secondsLeft: next });
        }
      },
      finishPhase: () => {
        const { phase, completedFocusSessions, phaseCompleted } = get();
        if (!phaseCompleted) return;
        const nextPhase: PomodoroPhase =
          phase === 'focus'
            ? completedFocusSessions % 4 === 0
              ? 'longBreak'
              : 'shortBreak'
            : 'focus';
        set({
          phase: nextPhase,
          secondsLeft: phaseSeconds(nextPhase),
          isRunning: false,
          phaseCompleted: false,
          mcEasterEggTriggeredThisSession: nextPhase === 'focus' ? false : get().mcEasterEggTriggeredThisSession,
        });
      },
      skip: () => {
        const { phase, completedFocusSessions } = get();
        let nextPhase: PomodoroPhase;
        let nextCompleted = completedFocusSessions;
        if (phase === 'focus') {
          nextCompleted += 1;
          nextPhase = nextCompleted % 4 === 0 ? 'longBreak' : 'shortBreak';
        } else {
          nextPhase = 'focus';
        }
        set({
          phase: nextPhase,
          secondsLeft: phaseSeconds(nextPhase),
          isRunning: false,
          phaseCompleted: false,
          completedFocusSessions: nextCompleted,
          mcEasterEggTriggeredThisSession: nextPhase === 'focus' ? false : get().mcEasterEggTriggeredThisSession,
        });
      },
      setPosition: (position) => set({ position }),
      setMinimized: (minimized) => set({ minimized }),
      toggleMinimized: () => set((state) => ({ minimized: !state.minimized })),
      resetAchievements: () =>
        set({
          completedFocusSessions: 0,
          achievements: { date: todayISO(), count: 0, streak: 0 },
        }),
      resetTimer: () =>
        set({
          phase: 'focus',
          secondsLeft: phaseSeconds('focus'),
          isRunning: false,
          phaseCompleted: false,
          mcEasterEggTriggeredThisSession: false,
        }),
      setMcEasterEggsEnabled: (mcEasterEggsEnabled) => set({ mcEasterEggsEnabled }),
      setMcEasterEggTriggeredThisSession: (mcEasterEggTriggeredThisSession) =>
        set({ mcEasterEggTriggeredThisSession }),
    }),
    {
      name: 'plotline:pomodoro',
      partialize: (state) => ({
        theme: state.theme,
        completedFocusSessions: state.completedFocusSessions,
        achievements: state.achievements,
        position: state.position,
        minimized: state.minimized,
        mcEasterEggsEnabled: state.mcEasterEggsEnabled,
        mcEasterEggTriggeredThisSession: state.mcEasterEggTriggeredThisSession,
      }),
    },
  ),
);

export function formatPomodoroTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
