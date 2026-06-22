import { invoke } from '@/lib/ipc';
import type {
  CreateOutlineNodeInput,
  MoveOutlineNodeInput,
  OutlineNode,
  UpdateOutlineNodeInput,
} from '@/types';

export function listOutlineNodes(workspaceId: string): Promise<OutlineNode[]> {
  return invoke<OutlineNode[]>('list_outline_nodes', { workspaceId });
}

export function createOutlineNode(input: CreateOutlineNodeInput): Promise<OutlineNode> {
  return invoke<OutlineNode>('create_outline_node', { input });
}

export function updateOutlineNode(input: UpdateOutlineNodeInput): Promise<OutlineNode> {
  return invoke<OutlineNode>('update_outline_node', { input });
}

export function deleteOutlineNode(id: string): Promise<void> {
  return invoke<void>('delete_outline_node', { id });
}

export function moveOutlineNode(input: MoveOutlineNodeInput): Promise<OutlineNode> {
  return invoke<OutlineNode>('move_outline_node', { input });
}
