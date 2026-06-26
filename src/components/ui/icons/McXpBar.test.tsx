import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import McXpBar from './McXpBar';

describe('McXpBar', () => {
  it('renders a non-empty svg', () => {
    const { container } = render(<McXpBar progress={50} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(svg).toHaveAttribute('aria-label', 'experience bar');
  });

  it('applies the provided className', () => {
    const { container } = render(<McXpBar progress={25} className="test-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('test-class')).toBe(true);
  });

  it('clamps progress between 0 and 100', () => {
    const { container: over } = render(<McXpBar progress={150} />);
    const { container: under } = render(<McXpBar progress={-20} />);
    expect(over.querySelector('svg')).toBeInTheDocument();
    expect(under.querySelector('svg')).toBeInTheDocument();
  });
});
