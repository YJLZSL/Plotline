import { invoke } from '@/lib/ipc';

export function exportWorkspaceMarkdown(workspaceId: string): Promise<string> {
  return invoke<string>('export_workspace_markdown', { workspaceId });
}

export function exportOutlineMarkdown(workspaceId: string): Promise<string> {
  return invoke<string>('export_outline_markdown', { workspaceId });
}

export function exportWorkspacePdf(workspaceId: string): Promise<number[]> {
  return invoke<number[]>('export_workspace_pdf', { workspaceId });
}

export function exportWorkspaceWord(workspaceId: string): Promise<number[]> {
  return invoke<number[]>('export_workspace_word', { workspaceId });
}

export function exportWorkspaceEpub(workspaceId: string): Promise<number[]> {
  return invoke<number[]>('export_workspace_epub', { workspaceId });
}
