import { describe, it, expect, beforeEach } from 'vitest';

import { usePomodoroStore, formatPomodoroTime } from './pomodoro';

describe('pomodoro store', () => {
  beforeEach(() => {
    usePomodoroStore.setState({
      phase: 'focus',
      theme: 'warm',
      secondsLeft: 25 * 60,
      isRunning: false,
      phaseCompleted: false,
      completedFocusSessions: 0,
      achievements: { date: new Date().toISOString().slice(0, 10), count: 0, streak: 0 },
      mcEasterEggsEnabled: true,
      mcEasterEggTriggeredThisSession: false,
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

  it('should mark phase as completed when focus reaches zero', () => {
    usePomodoroStore.setState({ secondsLeft: 1, isRunning: true });
    usePomodoroStore.getState().tick();
    const state = usePomodoroStore.getState();
    expect(state.phase).toBe('focus');
    expect(state.secondsLeft).toBe(0);
    expect(state.isRunning).toBe(false);
    expect(state.phaseCompleted).toBe(true);
    expect(state.completedFocusSessions).toBe(1);
  });

  it('should switch to short break after finishing a focus phase', () => {
    usePomodoroStore.setState({
      completedFocusSessions: 1,
      secondsLeft: 0,
      isRunning: false,
      phaseCompleted: true,
    });
    usePomodoroStore.getState().finishPhase();
    const state = usePomodoroStore.getState();
    expect(state.phase).toBe('shortBreak');
    expect(state.secondsLeft).toBe(5 * 60);
    expect(state.phaseCompleted).toBe(false);
  });

  it('should switch to long break after every 4 focus sessions', () => {
    usePomodoroStore.setState({
      completedFocusSessions: 4,
      secondsLeft: 0,
      isRunning: false,
      phaseCompleted: true,
    });
    usePomodoroStore.getState().finishPhase();
    const state = usePomodoroStore.getState();
    expect(state.phase).toBe('longBreak');
    expect(state.secondsLeft).toBe(15 * 60);
    expect(state.completedFocusSessions).toBe(4);
  });

  it('should mark break phase as completed when break reaches zero', () => {
    usePomodoroStore.setState({ phase: 'shortBreak', secondsLeft: 1, isRunning: true });
    usePomodoroStore.getState().tick();
    const state = usePomodoroStore.getState();
    expect(state.phase).toBe('shortBreak');
    expect(state.secondsLeft).toBe(0);
    expect(state.phaseCompleted).toBe(true);
  });

  it('should return to focus after finishing a break phase', () => {
    usePomodoroStore.setState({
      phase: 'shortBreak',
      secondsLeft: 0,
      isRunning: false,
      phaseCompleted: true,
    });
    usePomodoroStore.getState().finishPhase();
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

  it('should reset achievements without changing timer phase or time', () => {
    usePomodoroStore.setState({
      phase: 'shortBreak',
      secondsLeft: 5 * 60,
      isRunning: true,
      completedFocusSessions: 7,
      achievements: { date: '2024-01-01', count: 7, streak: 3 },
    });
    usePomodoroStore.getState().resetAchievements();
    const state = usePomodoroStore.getState();
    expect(state.phase).toBe('shortBreak');
    expect(state.secondsLeft).toBe(5 * 60);
    expect(state.isRunning).toBe(true);
    expect(state.completedFocusSessions).toBe(0);
    expect(state.achievements.count).toBe(0);
    expect(state.achievements.streak).toBe(0);
    expect(state.achievements.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it('should reset timer to focus phase', () => {
    usePomodoroStore.setState({
      phase: 'longBreak',
      secondsLeft: 15 * 60,
      isRunning: true,
      phaseCompleted: true,
      completedFocusSessions: 3,
    });
    usePomodoroStore.getState().resetTimer();
    const state = usePomodoroStore.getState();
    expect(state.phase).toBe('focus');
    expect(state.secondsLeft).toBe(25 * 60);
    expect(state.isRunning).toBe(false);
    expect(state.phaseCompleted).toBe(false);
  });

  it('should track today focus count and streak on completion', () => {
    usePomodoroStore.setState({ secondsLeft: 1, isRunning: true });
    usePomodoroStore.getState().tick();
    const state = usePomodoroStore.getState();
    expect(state.completedFocusSessions).toBe(1);
    expect(state.achievements.count).toBe(1);
    expect(state.achievements.streak).toBe(1);
    expect(state.achievements.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it('should increment today count when completing another focus on the same day', () => {
    const today = new Date().toISOString().slice(0, 10);
    usePomodoroStore.setState({
      secondsLeft: 1,
      isRunning: true,
      completedFocusSessions: 2,
      achievements: { date: today, count: 2, streak: 1 },
    });
    usePomodoroStore.getState().tick();
    const state = usePomodoroStore.getState();
    expect(state.achievements.count).toBe(3);
    expect(state.achievements.streak).toBe(1);
  });

  it('should increment streak when completing focus the day after', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    usePomodoroStore.setState({
      secondsLeft: 1,
      isRunning: true,
      completedFocusSessions: 1,
      achievements: { date: yesterday, count: 1, streak: 2 },
    });
    usePomodoroStore.getState().tick();
    const state = usePomodoroStore.getState();
    expect(state.achievements.count).toBe(1);
    expect(state.achievements.streak).toBe(3);
  });

  it('should break streak when focus day is missed', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    usePomodoroStore.setState({
      secondsLeft: 1,
      isRunning: true,
      completedFocusSessions: 5,
      achievements: { date: twoDaysAgo, count: 5, streak: 4 },
    });
    usePomodoroStore.getState().tick();
    const state = usePomodoroStore.getState();
    expect(state.achievements.count).toBe(1);
    expect(state.achievements.streak).toBe(1);
  });

  it('should not update achievements when a break phase completes', () => {
    const today = new Date().toISOString().slice(0, 10);
    usePomodoroStore.setState({
      phase: 'shortBreak',
      secondsLeft: 1,
      isRunning: true,
      completedFocusSessions: 2,
      achievements: { date: today, count: 2, streak: 1 },
    });
    usePomodoroStore.getState().tick();
    const state = usePomodoroStore.getState();
    expect(state.completedFocusSessions).toBe(2);
    expect(state.achievements.count).toBe(2);
  });

  it('should persist mc easter eggs preference', () => {
    usePomodoroStore.getState().setMcEasterEggsEnabled(false);
    expect(usePomodoroStore.getState().mcEasterEggsEnabled).toBe(false);
    usePomodoroStore.getState().setMcEasterEggsEnabled(true);
    expect(usePomodoroStore.getState().mcEasterEggsEnabled).toBe(true);
  });

  it('should reset mc easter egg triggered flag when starting a new focus session', () => {
    usePomodoroStore.setState({
      phase: 'shortBreak',
      secondsLeft: 0,
      phaseCompleted: true,
      mcEasterEggTriggeredThisSession: true,
    });
    usePomodoroStore.getState().finishPhase();
    expect(usePomodoroStore.getState().phase).toBe('focus');
    expect(usePomodoroStore.getState().mcEasterEggTriggeredThisSession).toBe(false);
  });

  it('should format time as mm:ss', () => {
    expect(formatPomodoroTime(0)).toBe('00:00');
    expect(formatPomodoroTime(65)).toBe('01:05');
    expect(formatPomodoroTime(25 * 60)).toBe('25:00');
  });
});
