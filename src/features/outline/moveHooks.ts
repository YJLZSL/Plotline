import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toastError } from '@/stores/toast';

import { moveOutlineNode as apiMove } from './api';
import type { MoveOutlineNodeInput } from '@/types';

export function useMoveOutlineNode(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveOutlineNodeInput) => apiMove(input),
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['outline', workspaceId] });
      void n;
    },
    onError: toastError,
  });
}
