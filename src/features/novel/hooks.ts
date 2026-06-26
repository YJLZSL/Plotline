import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { NovelChapter } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';

import {
  createNovelChapter as apiCreate,
  deleteNovelChapter as apiDelete,
  listNovelChapters as apiList,
  updateNovelChapter as apiUpdate,
  reorderNovelChapters as apiReorder,
} from './api';

export const novelChaptersKey = (wsId: string) => ['novelChapters', wsId] as const;

export function useNovelChaptersQuery(workspaceId: string) {
  return useQuery({ queryKey: novelChaptersKey(workspaceId), queryFn: () => apiList(workspaceId) });
}

export function useCreateNovelChapter(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (n) => {
      qc.setQueryData<NovelChapter[]>(novelChaptersKey(workspaceId), (old) => {
        const arr = [...(old ?? []), n];
        arr.sort((a, b) => a.sortOrder - b.sortOrder);
        return arr;
      });
      toastSuccess(t('toast.novelChapterCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateNovelChapter(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiUpdate,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: novelChaptersKey(workspaceId) });
      const previous = qc.getQueryData<NovelChapter[]>(novelChaptersKey(workspaceId));
      const oldChapter = previous?.find((n) => n.id === input.id);
      return { oldChapter };
    },
    onSuccess: (n) => {
      qc.setQueryData<NovelChapter[]>(novelChaptersKey(workspaceId), (old) =>
        (old ?? []).map((x) => (x.id === n.id ? n : x)),
      );
      toastSuccess(t('toast.novelChapterUpdated'));
    },
    onError: toastError,
  });
}

export function useDeleteNovelChapter(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiDelete,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: novelChaptersKey(workspaceId) });
      const previous = qc.getQueryData<NovelChapter[]>(novelChaptersKey(workspaceId));
      const oldChapter = previous?.find((n) => n.id === id);
      return { oldChapter };
    },
    onSuccess: (_, id) => {
      qc.setQueryData<NovelChapter[]>(novelChaptersKey(workspaceId), (old) =>
        (old ?? []).filter((n) => n.id !== id),
      );
      toastSuccess(t('toast.novelChapterDeleted'));
    },
    onError: toastError,
  });
}

export function useReorderNovelChapters(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiReorder,
    onSuccess: (chapters) => {
      qc.setQueryData<NovelChapter[]>(novelChaptersKey(workspaceId), chapters);
    },
    onError: toastError,
  });
}
