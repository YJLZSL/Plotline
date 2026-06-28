import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import '@/i18n';
import { EmptyState } from './Feedback';

describe('EmptyState', () => {
  it('wraps the icon in a muted style container', () => {
    render(<EmptyState icon={<span data-testid="empty-icon">icon</span>} title="No data" />);
    const wrapper = screen.getByTestId('empty-icon').parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass('text-text-secondary', 'opacity-60');
  });
});
