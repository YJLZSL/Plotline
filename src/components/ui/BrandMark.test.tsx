import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('renders an SVG with accessible title', () => {
    const { container, getByTitle } = render(<BrandMark title="Plotline" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(getByTitle('Plotline')).toBeInTheDocument();
  });

  it('honors the size prop on width/height', () => {
    const { container } = render(<BrandMark size={48} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('48');
    expect(svg?.getAttribute('height')).toBe('48');
  });

  it('falls back to a default title and size', () => {
    const { container, getByTitle } = render(<BrandMark />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(getByTitle('Plotline')).toBeInTheDocument();
  });
});
