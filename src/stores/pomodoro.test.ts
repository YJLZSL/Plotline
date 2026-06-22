import { describe, it, expect, beforeEach } from 'vitest';

import { usePomodoroStore, formatPomodoroTime } from './pomodoro';

describe('pomodoro store', () => {
  beforeEach(() => {
    usePomodoroStore.setState({
      phase: 'focus',
      theme: 'warm',
      secondsLeft: 25 * 60,
      isRunning: false,
      completedFocusSessions: 0,
    });
  });

  it('should initialize with focus phase and warm theme', () => {
    const state = usePomodoroStore.getState();
    expect(state.phase).toBe('focus');
    expect(state.theme).toBe('warm');
    expect(state.secondsLeft).toBe(25 * 60);
    expect(state.isRunning).toBe(false);
  });

  it('should switch theme', () => {
    usePomodoroStore.getState().setTheme('mc');
    expect(usePomodoroStore.getState().theme).toBe('mc');
  });

  it('should set phase and reset timer', () => {
    usePomodoroStore.getState().setPhase('shortBreak');
    const state = usePomodoroStore.getState();
    expect(state.phase).toBe('shortBreak');
    expect(state.secondsLeft).toBe(5 * 60);
    expect(state.isRunning).toBe(false);
  });

  it('should start and pause', () => {
    const { start, pause } = usePomodoroStore.getState();
    start();
    expect(usePomodoroStore.getState().isRunning).toBe(true);
    pause();
    expect(usePomodoroStore.getState().isRunning).toBe(false);
  });

  it('should tick only when running', () => {
    usePomodoroStore.getState().tick();
    expect(usePomodoroStore.getState().secondsLeft).toBe(25 * 60);

    usePomodoroStore.setState({ isRunning: true });
    usePomodoroStore.getState().tick();
    expect(usePomodoroStore.getState().secondsLeft).toBe(25 * 60 - 1);
  });

  it('should auto-switch to short break after focus', () => {
    usePomodoroStore.setState({ secondsLeft: 1, isRunning: true });
    usePomodoroStore.getState().tick();
    const state = usePomodoroStore.getState();
    expect(state.phase).toBe('shortBreak');
    expect(state.secondsLeft).toBe(5 * 60);
    expect(state.isRunning).toBe(false);
    expect(state.completedFocusSessions).toBe(1);
  });

  it('should auto-switch to long break after every 4 focus sessions', () => {
    usePomodoroStore.setState({ completedFocusSessions: 3, secondsLeft: 1, isRunning: true });
    usePomodoroStore.getState().tick();
    const state = usePomodoroStore.getState();
    expect(state.phase).toBe('longBreak');
    expect(state.secondsLeft).toBe(15 * 60);
    expect(state.completedFocusSessions).toBe(4);
  });

  it('should return to focus after break', () => {
    usePomodoroStore.setState({ phase: 'shortBreak', secondsLeft: 1, isRunning: true });
    usePomodoroStore.getState().tick();
    expect(usePomodoroStore.getState().phase).toBe('focus');
  });

  it('should skip phase manually', () => {
    usePomodoroStore.getState().skip();
    expect(usePomodoroStore.getState().phase).toBe('shortBreak');
  });

  it('should reset current phase timer', () => {
    usePomodoroStore.setState({ secondsLeft: 100, isRunning: true });
    usePomodoroStore.getState().reset();
    const state = usePomodoroStore.getState();
    expect(state.secondsLeft).toBe(25 * 60);
    expect(state.isRunning).toBe(false);
  });

  it('should format time as mm:ss', () => {
    expect(formatPomodoroTime(0)).toBe('00:00');
    expect(formatPomodoroTime(65)).toBe('01:05');
    expect(formatPomodoroTime(25 * 60)).toBe('25:00');
  });
});
