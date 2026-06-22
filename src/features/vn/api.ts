import { invoke } from '@/lib/ipc';
import type {
  CreateVnLineInput,
  CreateVnSceneInput,
  UpdateVnLineInput,
  UpdateVnSceneInput,
  VnLine,
  VnScene,
} from '@/types';

export function listVnScenes(workspaceId: string): Promise<VnScene[]> {
  return invoke<VnScene[]>('list_vn_scenes', { workspaceId });
}

export function createVnScene(input: CreateVnSceneInput): Promise<VnScene> {
  return invoke<VnScene>('create_vn_scene', { input });
}

export function updateVnScene(input: UpdateVnSceneInput): Promise<VnScene> {
  return invoke<VnScene>('update_vn_scene', { input });
}

export function deleteVnScene(id: string): Promise<void> {
  return invoke<void>('delete_vn_scene', { id });
}

export function listVnLines(sceneId: string): Promise<VnLine[]> {
  return invoke<VnLine[]>('list_vn_lines', { sceneId });
}

export function createVnLine(input: CreateVnLineInput): Promise<VnLine> {
  return invoke<VnLine>('create_vn_line', { input });
}

export function updateVnLine(input: UpdateVnLineInput): Promise<VnLine> {
  return invoke<VnLine>('update_vn_line', { input });
}

export function deleteVnLine(id: string): Promise<void> {
  return invoke<void>('delete_vn_line', { id });
}
