import { describe, it, expect, vi } from 'vitest';

import {
  exportWorkspaceMarkdown,
  exportOutlineMarkdown,
  exportWorkspacePdf,
  exportWorkspaceWord,
  exportWorkspaceEpub,
} from './exportApi';

vi.mock('@/lib/ipc', () => ({
  invoke: vi.fn((command: string) => {
    if (command === 'export_workspace_markdown') return Promise.resolve('# Workspace\n');
    if (command === 'export_outline_markdown') return Promise.resolve('# Outline\n');
    if (command === 'export_workspace_pdf') return Promise.resolve([1, 2, 3]);
    if (command === 'export_workspace_word') return Promise.resolve([4, 5, 6]);
    if (command === 'export_workspace_epub') return Promise.resolve([7, 8, 9]);
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

  it('exports workspace pdf', async () => {
    const bytes = await exportWorkspacePdf('ws');
    expect(bytes).toEqual([1, 2, 3]);
  });

  it('exports workspace word', async () => {
    const bytes = await exportWorkspaceWord('ws');
    expect(bytes).toEqual([4, 5, 6]);
  });

  it('exports workspace epub', async () => {
    const bytes = await exportWorkspaceEpub('ws');
    expect(bytes).toEqual([7, 8, 9]);
  });
});
