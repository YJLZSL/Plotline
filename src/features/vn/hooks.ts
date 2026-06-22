import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { VnLine, VnScene } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';

import {
  createVnLine as apiCreateLine,
  createVnScene as apiCreateScene,
  deleteVnLine as apiDeleteLine,
  deleteVnScene as apiDeleteScene,
  exportVnRenpy as apiExportVnRenpy,
  listAllVnLines as apiListAllVnLines,
  listVnLines as apiListLines,
  listVnScenes as apiListScenes,
  updateVnLine as apiUpdateLine,
  updateVnScene as apiUpdateScene,
  uploadVnAsset as apiUploadVnAsset,
} from './api';

export const vnScenesKey = (wsId: string) => ['vnScenes', wsId] as const;
export const vnLinesKey = (sceneId: string) => ['vnLines', sceneId] as const;

export function useVnScenesQuery(workspaceId: string) {
  return useQuery({
    queryKey: vnScenesKey(workspaceId),
    queryFn: () => apiListScenes(workspaceId),
  });
}

export function useCreateVnScene(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiCreateScene,
    onSuccess: (scene) => {
      qc.setQueryData<VnScene[]>(vnScenesKey(workspaceId), (old) => [...(old ?? []), scene]);
      toastSuccess(t('toast.vnSceneCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateVnScene(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiUpdateScene,
    onSuccess: (scene) => {
      qc.setQueryData<VnScene[]>(vnScenesKey(workspaceId), (old) =>
        (old ?? []).map((s) => (s.id === scene.id ? scene : s)),
      );
    },
    onError: toastError,
  });
}

export function useDeleteVnScene(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiDeleteScene,
    onSuccess: (_, id) => {
      qc.setQueryData<VnScene[]>(vnScenesKey(workspaceId), (old) =>
        (old ?? []).filter((s) => s.id !== id),
      );
      toastSuccess(t('toast.vnSceneDeleted'));
    },
    onError: toastError,
  });
}

export function useVnLinesQuery(sceneId: string | null) {
  return useQuery({
    queryKey: vnLinesKey(sceneId ?? ''),
    queryFn: () => apiListLines(sceneId!),
    enabled: sceneId !== null,
  });
}

export const vnAllLinesKey = (wsId: string) => ['vnAllLines', wsId] as const;

export function useVnAllLinesQuery(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: vnAllLinesKey(workspaceId),
    queryFn: () => apiListAllVnLines(workspaceId),
    enabled,
  });
}

export function useCreateVnLine(sceneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiCreateLine,
    onSuccess: (line) => {
      qc.setQueryData<VnLine[]>(vnLinesKey(sceneId), (old) => [...(old ?? []), line]);
    },
    onError: toastError,
  });
}

export function useUpdateVnLine(sceneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiUpdateLine,
    onSuccess: (line) => {
      qc.setQueryData<VnLine[]>(vnLinesKey(sceneId), (old) =>
        (old ?? []).map((l) => (l.id === line.id ? line : l)),
      );
    },
    onError: toastError,
  });
}

export function useDeleteVnLine(sceneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiDeleteLine,
    onSuccess: (_, id) => {
      qc.setQueryData<VnLine[]>(vnLinesKey(sceneId), (old) =>
        (old ?? []).filter((l) => l.id !== id),
      );
    },
    onError: toastError,
  });
}

export function useExportVnRenpy(workspaceId: string) {
  const { t } = useI18n();
  return useMutation({
    mutationFn: () => apiExportVnRenpy(workspaceId),
    onSuccess: () => {
      toastSuccess(t('toast.vnExported'));
    },
    onError: toastError,
  });
}

export function useUploadVnAsset(workspaceId: string) {
  return useMutation({
    mutationFn: (sourcePath: string) => apiUploadVnAsset(workspaceId, sourcePath),
    onError: toastError,
  });
}
