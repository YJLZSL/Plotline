import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SplashOverlay } from './SplashOverlay';
import { useSettingsQuery } from '@/features/settings/hooks';

vi.mock('@/features/settings/hooks', () => ({
  useSettingsQuery: vi.fn(),
}));

const mockedUseSettingsQuery = vi.mocked(useSettingsQuery);

describe('SplashOverlay', () => {
  beforeEach(() => {
    mockedUseSettingsQuery.mockReturnValue({
      data: {
        splashEnabled: true,
        splashDurationMs: 2500,
      },
    } as ReturnType<typeof useSettingsQuery>);
  });

  it('renders the splash screen by default', () => {
    render(<SplashOverlay />);
    expect(screen.getByRole('heading', { name: 'Plotline' })).toBeInTheDocument();
    expect(screen.getByText('叙事创作工作台')).toBeInTheDocument();
    expect(screen.getByText('正在准备你的故事…')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /点击跳过启动动画/ }),
    ).toBeInTheDocument();
  });

  it('does not render when splash is disabled', () => {
    mockedUseSettingsQuery.mockReturnValue({
      data: {
        splashEnabled: false,
        splashDurationMs: 2500,
      },
    } as ReturnType<typeof useSettingsQuery>);

    const { container } = render(<SplashOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('can be skipped by clicking', async () => {
    const user = userEvent.setup();
    render(<SplashOverlay />);

    const splash = screen.getByRole('button', { name: /点击跳过启动动画/ });
    await user.click(splash);

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /点击跳过启动动画/ }),
      ).not.toBeInTheDocument();
    });
  });
});
