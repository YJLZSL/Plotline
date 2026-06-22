import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';
import { useThemeStore } from '@/stores/ui';

import { getSettings as apiGet, updateSettings as apiUpdate } from './api';

const KEY = ['settings'] as const;

export function useSettingsQuery() {
  return useQuery({ queryKey: KEY, queryFn: apiGet });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const applyToDOM = useThemeStore((s) => s.applyToDOM);
  return useMutation({
    mutationFn: apiUpdate,
    onSuccess: (s) => {
      qc.setQueryData(KEY, s);
      applyToDOM(s);
      toastSuccess(t('toast.settingsSaved'));
    },
    onError: toastError,
  });
}
