import { create } from 'zustand';

import type { AppError } from '@/lib/ipc';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const AUTO_DISMISS_MS = 3500;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** 便捷调用：成功提示。 */
export const toastSuccess = (msg: string): void => useToastStore.getState().push('success', msg);

/** 便捷调用：错误提示，自动识别 AppError 结构。 */
export const toastError = (err: unknown): void => {
  if (err && typeof err === 'object' && 'message' in err) {
    useToastStore.getState().push('error', (err as AppError).message);
  } else if (err instanceof Error) {
    useToastStore.getState().push('error', err.message);
  } else {
    useToastStore.getState().push('error', '未知错误');
  }
};

export const toastInfo = (msg: string): void => useToastStore.getState().push('info', msg);
export const toastWarning = (msg: string): void => useToastStore.getState().push('warning', msg);
