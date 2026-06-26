import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import McPickaxe from './McPickaxe';

describe('McPickaxe', () => {
  it('renders a non-empty svg', () => {
    const { container } = render(<McPickaxe className="h-4 w-4" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(svg).toHaveAttribute('aria-label', 'pickaxe');
  });

  it('applies the provided className', () => {
    const { container } = render(<McPickaxe className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('test-class')).toBe(true);
  });
});
