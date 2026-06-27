import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PixelBlock } from './PomodoroTimerBlocks';
import { BLOCK_COLORS } from './PomodoroTimer.utils';

describe('PixelBlock', () => {
  it('renders an empty block with 3D bevel when blockType is null', () => {
    render(<PixelBlock blockType={null} data-testid="empty-block" />);
    const block = screen.getByTestId('empty-block');
    expect(block).toBeInTheDocument();
    expect(block.tagName.toLowerCase()).toBe('div');
    const svg = block.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Top/left highlight and bottom/right shadow should exist
    expect(svg?.querySelectorAll('rect[fill="#FFFFFF"]')).toHaveLength(2);
    expect(svg?.querySelectorAll('rect[fill="#000000"]')).toHaveLength(2);
  });

  it('renders a dirt block with correct colors and bevel', () => {
    render(<PixelBlock blockType="dirt" data-testid="dirt-block" />);
    const block = screen.getByTestId('dirt-block');
    const svg = block.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const bgRect = svg?.querySelector('rect[width="10"]');
    expect(bgRect).toHaveAttribute('fill', BLOCK_COLORS.dirt.bg);
  });

  it('renders sparkle overlay for rare animated blocks', () => {
    render(<PixelBlock blockType="diamond" animated data-testid="diamond-block" />);
    const block = screen.getByTestId('diamond-block');
    expect(block.querySelector('[data-testid="block-sparkle"]')).toBeInTheDocument();
    const svg = block.querySelector('svg');
    expect(svg).toHaveClass('mc-block-glint');
  });

  it('does not render sparkle when not animated', () => {
    render(<PixelBlock blockType="diamond" data-testid="diamond-block" />);
    const block = screen.getByTestId('diamond-block');
    expect(block.querySelector('[data-testid="block-sparkle"]')).not.toBeInTheDocument();
    const svg = block.querySelector('svg');
    expect(svg).not.toHaveClass('mc-block-glint');
  });
});
