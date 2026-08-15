import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { RenpyTransition } from '@/features/vn/renpyEnhance';

interface RenpyPreferencesState {
  /** 导出时插入的转场类型。 */
  transition: RenpyTransition;
  /** 变量多行文本，每行一条 `name = value`。 */
  variablesText: string;
  setTransition: (transition: RenpyTransition) => void;
  setVariablesText: (text: string) => void;
  reset: () => void;
}

const DEFAULT_TRANSITION: RenpyTransition = 'dissolve';

/** VN Ren'Py 导出偏好（前端持久化，不修改数据库）。 */
export const useRenpyPreferencesStore = create<RenpyPreferencesState>()(
  persist(
    (set) => ({
      transition: DEFAULT_TRANSITION,
      variablesText: '',
      setTransition: (transition) => set({ transition }),
      setVariablesText: (variablesText) => set({ variablesText }),
      reset: () => set({ transition: DEFAULT_TRANSITION, variablesText: '' }),
    }),
    {
      name: 'plotline:renpy-export',
      partialize: (state) => ({
        transition: state.transition,
        variablesText: state.variablesText,
      }),
    },
  ),
);
