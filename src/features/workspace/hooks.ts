import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Workspace } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';

import {
  createWorkspace as apiCreate,
  deleteWorkspace as apiDelete,
  exportWorkspace as apiExport,
  importWorkspace as apiImport,
  listWorkspaces as apiList,
  updateWorkspace as apiUpdate,
} from './api';
import {
  exportWorkspaceMarkdown as apiExportWorkspaceMarkdown,
  exportOutlineMarkdown as apiExportOutlineMarkdown,
  exportWorkspacePdf as apiExportWorkspacePdf,
  exportWorkspaceWord as apiExportWorkspaceWord,
  exportWorkspaceEpub as apiExportWorkspaceEpub,
} from './exportApi';

const KEY = ['workspaces'] as const;

export function useWorkspacesQuery() {
  return useQuery({ queryKey: KEY, queryFn: apiList });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (ws) => {
      qc.setQueryData<Workspace[]>(KEY, (old) => [ws, ...(old ?? [])]);
      toastSuccess(t('toast.workspaceCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiUpdate,
    onSuccess: (ws) => {
      qc.setQueryData<Workspace[]>(KEY, (old) =>
        (old ?? []).map((w) => (w.id === ws.id ? ws : w)),
      );
      qc.setQueryData(['workspace', ws.id], ws);
    },
    onError: toastError,
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiDelete,
    onSuccess: (_, id) => {
      qc.setQueryData<Workspace[]>(KEY, (old) => (old ?? []).filter((w) => w.id !== id));
      toastSuccess(t('toast.workspaceDeleted'));
    },
    onError: toastError,
  });
}

export function useExportWorkspace() {
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiExport,
    onSuccess: () => toastSuccess(t('toast.workspaceExported')),
    onError: toastError,
  });
}

export function useImportWorkspace() {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiImport,
    onSuccess: (ws) => {
      qc.setQueryData<Workspace[]>(KEY, (old) => [ws, ...(old ?? [])]);
      toastSuccess(t('toast.workspaceImported'));
    },
    onError: toastError,
  });
}

export function useExportWorkspaceMarkdown() {
  return useMutation({
    mutationFn: apiExportWorkspaceMarkdown,
    onError: toastError,
  });
}

export function useExportOutlineMarkdown() {
  return useMutation({
    mutationFn: apiExportOutlineMarkdown,
    onError: toastError,
  });
}

export function useExportWorkspacePdf() {
  return useMutation({
    mutationFn: apiExportWorkspacePdf,
    onError: toastError,
  });
}

export function useExportWorkspaceWord() {
  return useMutation({
    mutationFn: apiExportWorkspaceWord,
    onError: toastError,
  });
}

export function useExportWorkspaceEpub() {
  return useMutation({
    mutationFn: apiExportWorkspaceEpub,
    onError: toastError,
  });
}
