import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import McHunger from './McHunger';

describe('McHunger', () => {
  it('renders a non-empty svg', () => {
    const { container } = render(<McHunger className="h-4 w-4" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(svg).toHaveAttribute('aria-label', 'hunger');
  });

  it('applies the provided className', () => {
    const { container } = render(<McHunger className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('test-class')).toBe(true);
  });
});
