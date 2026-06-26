import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import McSword from './McSword';

describe('McSword', () => {
  it('renders a non-empty svg', () => {
    const { container } = render(<McSword className="h-4 w-4" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(svg).toHaveAttribute('aria-label', 'sword');
  });

  it('applies the provided className', () => {
    const { container } = render(<McSword className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('test-class')).toBe(true);
  });
});
