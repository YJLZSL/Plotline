import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import '@/i18n';
import { PomodoroTimer } from './PomodoroTimer';
import { usePomodoroStore } from '@/stores/pomodoro';

describe('PomodoroTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePomodoroStore.setState({
      phase: 'focus',
      theme: 'warm',
      secondsLeft: 25 * 60,
      isRunning: false,
      completedFocusSessions: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<PomodoroTimer open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders timer and controls when open', () => {
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(screen.getByText('番茄钟')).toBeInTheDocument();
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('开始')).toBeInTheDocument();
  });

  it('switches to MC theme and renders block progress', () => {
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByText('MC'));
    expect(usePomodoroStore.getState().theme).toBe('mc');
    // MC 主题下方块进度为 10 个 svg
    const progress = screen.getByTestId('mc-block-progress');
    expect(progress.querySelectorAll('svg')).toHaveLength(10);
  });

  it('toggles start and pause', () => {
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByText('开始'));
    expect(usePomodoroStore.getState().isRunning).toBe(true);
    fireEvent.click(screen.getByText('暂停'));
    expect(usePomodoroStore.getState().isRunning).toBe(false);
  });

  it('resets timer', () => {
    usePomodoroStore.setState({ secondsLeft: 100, isRunning: true });
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('重置'));
    expect(usePomodoroStore.getState().secondsLeft).toBe(25 * 60);
    expect(usePomodoroStore.getState().isRunning).toBe(false);
  });

  it('skips phase', () => {
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('跳过'));
    expect(usePomodoroStore.getState().phase).toBe('shortBreak');
  });
});
