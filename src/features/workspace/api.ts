import { invoke } from '@/lib/ipc';
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceBundle,
} from '@/types';

export function listWorkspaces(): Promise<Workspace[]> {
  return invoke<Workspace[]>('list_workspaces');
}

export function getWorkspace(id: string): Promise<Workspace> {
  return invoke<Workspace>('get_workspace', { id });
}

export function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  return invoke<Workspace>('create_workspace', { input });
}

export function updateWorkspace(input: UpdateWorkspaceInput): Promise<Workspace> {
  return invoke<Workspace>('update_workspace', { input });
}

export function deleteWorkspace(id: string): Promise<void> {
  return invoke<void>('delete_workspace', { id });
}

export function exportWorkspace(id: string): Promise<WorkspaceBundle> {
  return invoke<WorkspaceBundle>('export_workspace', { id });
}

export function importWorkspace(bundle: WorkspaceBundle): Promise<Workspace> {
  return invoke<Workspace>('import_workspace', { bundle });
}
