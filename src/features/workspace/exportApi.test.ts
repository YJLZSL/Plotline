import { describe, it, expect, vi } from 'vitest';

import { exportWorkspaceMarkdown, exportOutlineMarkdown } from './exportApi';

vi.mock('@/lib/ipc', () => ({
  invoke: vi.fn((command: string) => {
    if (command === 'export_workspace_markdown') return Promise.resolve('# Workspace\n');
    if (command === 'export_outline_markdown') return Promise.resolve('# Outline\n');
    return Promise.reject(new Error('unknown'));
  }),
}));

describe('exportApi', () => {
  it('exports workspace markdown', async () => {
    const md = await exportWorkspaceMarkdown('ws');
    expect(md).toContain('# Workspace');
  });

  it('exports outline markdown', async () => {
    const md = await exportOutlineMarkdown('ws');
    expect(md).toContain('# Outline');
  });
});
