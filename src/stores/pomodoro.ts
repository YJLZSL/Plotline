import { create } from 'zustand';

export type PomodoroTheme = 'warm' | 'mc' | 'minimal';
export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

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
  completedFocusSessions: number;
  setTheme: (theme: PomodoroTheme) => void;
  setPhase: (phase: PomodoroPhase) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  skip: () => void;
}

function phaseSeconds(phase: PomodoroPhase): number {
  return PHASE_MINUTES[phase] * 60;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  phase: 'focus',
  theme: 'warm',
  secondsLeft: phaseSeconds('focus'),
  isRunning: false,
  completedFocusSessions: 0,
  setTheme: (theme) => set({ theme }),
  setPhase: (phase) =>
    set({ phase, secondsLeft: phaseSeconds(phase), isRunning: false }),
  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),
  reset: () => set({ secondsLeft: phaseSeconds(get().phase), isRunning: false }),
  tick: () => {
    const { secondsLeft, isRunning, phase, completedFocusSessions } = get();
    if (!isRunning || secondsLeft <= 0) return;
    const next = secondsLeft - 1;
    if (next === 0) {
      // Auto-switch phase
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
        completedFocusSessions: nextCompleted,
      });
    } else {
      set({ secondsLeft: next });
    }
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
      completedFocusSessions: nextCompleted,
    });
  },
}));

export function formatPomodoroTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
