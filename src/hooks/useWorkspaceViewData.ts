import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getWorkspace } from '@/features/workspace/api';

/** 获取当前工作区 ID 和名称（用于视图标题）。 */
export function useWorkspaceViewData(): { workspaceId: string; workspaceName?: string } {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
  return {
    workspaceId: workspaceId ?? '',
    workspaceName: data?.name,
  };
}
