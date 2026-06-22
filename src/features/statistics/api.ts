import { invoke } from '@/lib/ipc';
import type { Statistics } from '@/types';

export function getStatistics(workspaceId: string): Promise<Statistics> {
  return invoke<Statistics>('get_statistics', { workspaceId });
}
