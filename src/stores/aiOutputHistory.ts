import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AiOutputVersion {
  id: string;
  sessionId: string;
  content: string;
  createdAt: string;
  label?: string;
}

export interface AiOutputHistoryState {
  versions: AiOutputVersion[];
  recordVersion: (version: AiOutputVersion) => void;
  listBySession: (sessionId: string) => AiOutputVersion[];
  deleteVersion: (id: string) => void;
  clearSession: (sessionId: string) => void;
  clearAll: () => void;
}

export const AI_OUTPUT_HISTORY_LIMIT = 30;
const STORAGE_KEY = 'plotline:ai-output-history';

export function isDuplicateVersion(
  versions: AiOutputVersion[],
  next: AiOutputVersion,
): boolean {
  return versions.some(
    (v) => v.sessionId === next.sessionId && v.content === next.content,
  );
}

export function trimVersions(
  versions: AiOutputVersion[],
  limit = AI_OUTPUT_HISTORY_LIMIT,
): AiOutputVersion[] {
  if (versions.length <= limit) return versions;
  return versions.slice(versions.length - limit);
}

export const useAiOutputHistory = create<AiOutputHistoryState>()(
  persist(
    (set, get) => ({
      versions: [],
      recordVersion: (version) =>
        set((state) => {
          if (isDuplicateVersion(state.versions, version)) return state;
          return {
            versions: trimVersions([...state.versions, version]),
          };
        }),
      listBySession: (sessionId) =>
        get()
          .versions.filter((v) => v.sessionId === sessionId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      deleteVersion: (id) =>
        set((state) => ({
          versions: state.versions.filter((v) => v.id !== id),
        })),
      clearSession: (sessionId) =>
        set((state) => ({
          versions: state.versions.filter((v) => v.sessionId !== sessionId),
        })),
      clearAll: () => set({ versions: [] }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ versions: state.versions }),
    },
  ),
);
