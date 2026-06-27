import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TimelineEmptyIllustration } from './TimelineEmptyIllustration';

describe('TimelineEmptyIllustration', () => {
  it('renders an accessible SVG timeline illustration', () => {
    const { container } = render(<TimelineEmptyIllustration className="test-illustration" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('test-illustration');
    expect(svg?.querySelectorAll('rect').length).toBeGreaterThanOrEqual(7);
  });
});
