import { useQuery } from '@tanstack/react-query';

import { getStatistics as apiGet } from './api';

export function useStatisticsQuery(workspaceId: string) {
  return useQuery({
    queryKey: ['statistics', workspaceId] as const,
    queryFn: () => apiGet(workspaceId),
  });
}
