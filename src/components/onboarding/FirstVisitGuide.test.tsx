import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { FirstVisitGuide } from './FirstVisitGuide';

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object') {
        return `${key}:${Object.values(options).join(':')}`;
      }
      return key;
    },
  }),
}));

function renderGuide(open = true, onClose = vi.fn()) {
  return render(<FirstVisitGuide open={open} onClose={onClose} />);
}

describe('FirstVisitGuide', () => {
  it('should render the guide when open', () => {
    renderGuide();
    expect(screen.getByTestId('first-visit-guide')).toBeInTheDocument();
    expect(screen.getByTestId('guide-step-0')).toBeInTheDocument();
    expect(screen.getByTestId('guide-dot-0')).toBeInTheDocument();
  });

  it('should not render the guide when closed', () => {
    renderGuide(false);
    expect(screen.queryByTestId('first-visit-guide')).not.toBeInTheDocument();
  });

  it('should advance to the next step when clicking next', async () => {
    renderGuide();
    expect(screen.getByTestId('guide-step-0')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('guide-next-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('guide-step-1')).toBeInTheDocument();
    });
  });

  it('should go back to the previous step when clicking prev', async () => {
    renderGuide();
    fireEvent.click(screen.getByTestId('guide-next-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('guide-step-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('guide-prev-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('guide-step-0')).toBeInTheDocument();
    });
  });

  it('should call onClose when clicking skip', () => {
    const onClose = vi.fn();
    renderGuide(true, onClose);
    fireEvent.click(screen.getByTestId('guide-skip-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking finish on the last step', async () => {
    const onClose = vi.fn();
    renderGuide(true, onClose);
    fireEvent.click(screen.getByTestId('guide-next-btn'));
    await waitFor(() => expect(screen.getByTestId('guide-step-1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('guide-next-btn'));
    await waitFor(() => expect(screen.getByTestId('guide-step-2')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('guide-next-btn'));
    await waitFor(() => expect(screen.getByTestId('guide-step-3')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('guide-next-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should jump to a specific step when clicking a progress dot', async () => {
    renderGuide();
    fireEvent.click(screen.getByTestId('guide-dot-2'));
    await waitFor(() => {
      expect(screen.getByTestId('guide-step-2')).toBeInTheDocument();
    });
  });
});
