import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimelineMigrationState {
  /** 已关闭 v5 迁移提示的工作区 id。 */
  dismissedWorkspaces: string[];
  dismiss: (workspaceId: string) => void;
  reset: () => void;
}

/**
 * v5.0 老用户迁移引导：每个有事件关联的工作区只提示一次，
 * 提示用户新的「关系」视图已把旧连线自动迁移为关系图边。
 */
export const useTimelineMigrationStore = create<TimelineMigrationState>()(
  persist(
    (set) => ({
      dismissedWorkspaces: [],
      dismiss: (workspaceId) =>
        set((state) => ({
          dismissedWorkspaces: state.dismissedWorkspaces.includes(workspaceId)
            ? state.dismissedWorkspaces
            : [...state.dismissedWorkspaces, workspaceId],
        })),
      reset: () => set({ dismissedWorkspaces: [] }),
    }),
    { name: 'plotline:timeline-migration' },
  ),
);

/** 纯函数：计算某工作区是否仍需要展示迁移提示。 */
export function shouldShowMigrationBanner(
  dismissedWorkspaces: string[],
  workspaceId: string,
  connectionCount: number,
): boolean {
  return connectionCount > 0 && !dismissedWorkspaces.includes(workspaceId);
}
