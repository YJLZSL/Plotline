import { invoke } from '@/lib/ipc';

export function exportWorkspaceMarkdown(workspaceId: string): Promise<string> {
  return invoke<string>('export_workspace_markdown', { workspaceId });
}

export function exportOutlineMarkdown(workspaceId: string): Promise<string> {
  return invoke<string>('export_outline_markdown', { workspaceId });
}
