import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { EmptyStateIllustration } from './EmptyStateIllustration';

describe('EmptyStateIllustration', () => {
  it('should render an accessible story variant by default', () => {
    const { container } = render(<EmptyStateIllustration className="test-cls" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('test-cls');
    expect(svg).toHaveAttribute('data-testid', 'empty-state-illustration');
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(3);
  });

  it('should render network variant', () => {
    const { container } = render(<EmptyStateIllustration variant="network" />);
    expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(4);
  });
});
