import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import '@/i18n';
import { PomodoroTimer } from './PomodoroTimer';
import { getBlockType, type BlockType } from './PomodoroTimer.utils';
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
    const progress = screen.getByTestId('mc-block-progress');
    expect(progress.querySelectorAll('svg')).toHaveLength(10);
  });

  it('renders McHeart and McHunger icons in MC theme', () => {
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByText('MC'));
    expect(screen.getByLabelText('heart')).toBeInTheDocument();
    expect(screen.getByLabelText('hunger')).toBeInTheDocument();
    expect(screen.getByTestId('mc-session-health')).toHaveTextContent('专注值');
  });

  it('shows boom text and creeper face when MC focus completes', () => {
    usePomodoroStore.setState({ theme: 'mc', secondsLeft: 0 });
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(screen.getByText('Boom!')).toBeInTheDocument();
    expect(screen.getByLabelText('creeper')).toBeInTheDocument();
  });

  it('renders emerald and enchanted achievement blocks', () => {
    usePomodoroStore.setState({ theme: 'mc', completedFocusSessions: 8 });
    render(<PomodoroTimer open onClose={() => {}} />);
    const achievements = screen.getByTestId('mc-achievements');
    const blocks = achievements.querySelectorAll('svg');
    expect(blocks).toHaveLength(8);
    const session4Rect = blocks.item(3)!.querySelector('rect');
    const session8Rect = blocks.item(7)!.querySelector('rect');
    expect(session4Rect).toHaveAttribute('fill', '#3E9E5C');
    expect(session8Rect).toHaveAttribute('fill', '#1A1030');
  });

  it('returns correct block type progression', () => {
    const typeAt = (index: number, progress: number): BlockType | null =>
      getBlockType(index, 10, progress);

    expect(typeAt(0, 0)).toBeNull();
    expect(typeAt(0, 0.1)).toBe('dirt');
    expect(typeAt(1, 0.2)).toBe('dirt');
    expect(typeAt(2, 0.3)).toBe('cobble');
    expect(typeAt(3, 0.4)).toBe('coal');
    expect(typeAt(4, 0.5)).toBe('coal');
    expect(typeAt(5, 0.6)).toBe('iron');
    expect(typeAt(6, 0.7)).toBe('gold');
    expect(typeAt(7, 0.8)).toBe('gold');
    expect(typeAt(8, 0.9)).toBe('diamond');
    expect(typeAt(9, 1)).toBe('obsidian');
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
