import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';

import '@/i18n';
import { PomodoroTimer } from './PomodoroTimer';
import {
  getBlockType,
  getRandomRareBlockType,
  getRandomRareFilledBlockIndex,
  type BlockType,
} from './PomodoroTimer.utils';
import { usePomodoroStore, getDefaultPomodoroPosition } from '@/stores/pomodoro';
import { useMotionStore } from '@/stores/motion';
import * as sound from '@/lib/sound';

describe('PomodoroTimer', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem(
      'plotline:motion',
      JSON.stringify({ state: { animationsEnabled: true, fancyAnimationsEnabled: true } }),
    );
    await useMotionStore.persist.rehydrate();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    usePomodoroStore.setState({
      phase: 'focus',
      theme: 'warm',
      secondsLeft: 25 * 60,
      isRunning: false,
      completedFocusSessions: 0,
      position: null,
      minimized: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it('renders floating particles during break phases when animations are enabled', () => {
    usePomodoroStore.setState({ phase: 'shortBreak' });
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(screen.getByTestId('pomodoro-particles')).toBeInTheDocument();
  });

  it('does not render break particles during focus phase', () => {
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(screen.queryByTestId('pomodoro-particles')).not.toBeInTheDocument();
  });

  it('does not render break particles when animations are disabled', () => {
    useMotionStore.setState({ animationsEnabled: false });
    usePomodoroStore.setState({ phase: 'shortBreak' });
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(screen.queryByTestId('pomodoro-particles')).not.toBeInTheDocument();
  });

  it('does not render break particles when fancy animations are disabled', () => {
    useMotionStore.setState({ fancyAnimationsEnabled: false });
    usePomodoroStore.setState({ phase: 'shortBreak' });
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(screen.queryByTestId('pomodoro-particles')).not.toBeInTheDocument();
  });

  it('renders confetti burst on phase change when animations are enabled', () => {
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('跳过'));
    expect(screen.getByTestId('pomodoro-confetti')).toBeInTheDocument();
  });

  it('does not render confetti when animations are disabled', () => {
    useMotionStore.setState({ animationsEnabled: false });
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('跳过'));
    expect(screen.queryByTestId('pomodoro-confetti')).not.toBeInTheDocument();
  });

  it('does not render confetti when fancy animations are disabled', () => {
    useMotionStore.setState({ fancyAnimationsEnabled: false });
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('跳过'));
    expect(screen.queryByTestId('pomodoro-confetti')).not.toBeInTheDocument();
  });

  it('minimizes when header button is clicked', () => {
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('最小化'));
    expect(usePomodoroStore.getState().minimized).toBe(true);
  });

  it('shows a minimized chip with remaining time instead of the full panel', () => {
    usePomodoroStore.setState({ minimized: true });
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(screen.queryByText('番茄钟')).not.toBeInTheDocument();
    expect(screen.getByLabelText('恢复')).toHaveTextContent('25:00');
  });

  it('restores from the minimized chip when clicked', () => {
    usePomodoroStore.setState({ minimized: true });
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText('恢复'));
    expect(usePomodoroStore.getState().minimized).toBe(false);
  });

  it('sets default position on first render when position is null', () => {
    usePomodoroStore.setState({ position: null });
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(usePomodoroStore.getState().position).toEqual(getDefaultPomodoroPosition());
  });

  it('shows reset achievements button when there are completed sessions', () => {
    usePomodoroStore.setState({ completedFocusSessions: 3 });
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(screen.getByTestId('pomodoro-reset-achievements')).toBeInTheDocument();
  });

  it('hides reset achievements button when there are no completed sessions', () => {
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(screen.queryByTestId('pomodoro-reset-achievements')).not.toBeInTheDocument();
  });

  it('shows confirmation dialog before resetting achievements', () => {
    usePomodoroStore.setState({ completedFocusSessions: 5 });
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('pomodoro-reset-achievements'));
    expect(screen.getByText('重置成就？')).toBeInTheDocument();
    expect(screen.getByText('这将清空所有已完成的番茄数和成就方块，且不可撤销。')).toBeInTheDocument();
  });

  it('resets achievements after confirming the dialog', () => {
    usePomodoroStore.setState({ completedFocusSessions: 5, phase: 'shortBreak', secondsLeft: 5 * 60 });
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('pomodoro-reset-achievements'));
    fireEvent.click(screen.getByText('确认'));
    const state = usePomodoroStore.getState();
    expect(state.completedFocusSessions).toBe(0);
    expect(state.phase).toBe('focus');
    expect(state.secondsLeft).toBe(25 * 60);
    expect(screen.queryByTestId('pomodoro-reset-achievements')).not.toBeInTheDocument();
  });

  it('plays a creeper surprise easter egg when starting MC theme with low random roll', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.04);
    usePomodoroStore.setState({ theme: 'mc' });
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByText('开始'));
    expect(screen.getByTestId('mc-creeper-surprise')).toBeInTheDocument();
    randomSpy.mockRestore();
  });

  it('shows celebration overlay when a focus session completes', async () => {
    usePomodoroStore.setState({ secondsLeft: 1, isRunning: true });
    render(<PomodoroTimer open onClose={() => {}} />);
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByTestId('pomodoro-celebration')).toBeInTheDocument();
  });

  it('plays explosion sound when MC creeper boom appears', () => {
    const soundSpy = vi.spyOn(sound, 'playSoundIfEnabled');
    usePomodoroStore.setState({ theme: 'mc', secondsLeft: 0 });
    render(<PomodoroTimer open onClose={() => {}} />);
    expect(screen.getByText('Boom!')).toBeInTheDocument();
    expect(soundSpy).toHaveBeenCalledWith('explosion');
    soundSpy.mockRestore();
  });

  it('shows block sparkle easter egg when starting MC theme with medium random roll', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    // 90% progress fills blocks 0-8; block 8 is diamond (rare) and will sparkle.
    usePomodoroStore.setState({ theme: 'mc', secondsLeft: 25 * 60 * 0.1 });
    render(<PomodoroTimer open onClose={() => {}} />);
    fireEvent.click(screen.getByText('开始'));
    expect(screen.getByTestId('block-sparkle')).toBeInTheDocument();
    randomSpy.mockRestore();
  });

  it('returns rare block types with weighted probabilities', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i += 1) {
      const type = getRandomRareBlockType();
      counts[type] = (counts[type] ?? 0) + 1;
    }
    // All rare types should appear at least once in 1000 rolls
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(5);
    // Enchanted should be the rarest
    expect((counts.enchanted ?? 0)).toBeLessThan(counts.diamond ?? 0);
  });
});

describe('PomodoroTimer.utils', () => {
  it('returns null for rare filled block index when no blocks are rare', () => {
    expect(getRandomRareFilledBlockIndex(10, 0.1)).toBeNull();
    expect(getRandomRareFilledBlockIndex(10, 0.5)).toBeNull();
  });

  it('picks a rare filled block index at high progress', () => {
    const index = getRandomRareFilledBlockIndex(10, 0.9);
    expect(index).toBeGreaterThanOrEqual(8);
    expect(index).toBeLessThan(9);
  });

  it('uses the injected random function to pick among rare blocks', () => {
    const index = getRandomRareFilledBlockIndex(10, 0.95, () => 0.99);
    // At 95% progress filled blocks are 0-8; rare blocks are 8 (diamond).
    expect(index).toBe(8);
  });
});
