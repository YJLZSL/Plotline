import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AppIcon } from './AppIcon';

describe('AppIcon', () => {
  it('renders children inside the container', () => {
    render(
      <AppIcon>
        <svg data-testid="inner-icon" />
      </AppIcon>,
    );
    expect(screen.getByTestId('inner-icon')).toBeInTheDocument();
  });

  it('applies size and tone classes', () => {
    const { container } = render(
      <AppIcon size="lg" tone="accent">
        <svg />
      </AppIcon>,
    );
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.className).toMatch(/h-12/);
    expect(span?.className).toMatch(/text-accent/);
  });

  it('defaults to md/neutral when no props given', () => {
    const { container } = render(
      <AppIcon>
        <svg />
      </AppIcon>,
    );
    const span = container.querySelector('span');
    expect(span?.className).toMatch(/h-8/);
    expect(span?.className).toMatch(/bg-bg-elevated/);
  });
});
