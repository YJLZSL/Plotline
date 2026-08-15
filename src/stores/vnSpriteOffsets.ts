import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VnSpriteOffset {
  /** 0–100 的横向百分比（相对预览画布）。 */
  x: number;
  /** 0–100 的纵向百分比（相对预览画布，表示立绘底部位置）。 */
  y: number;
}

interface VnSpriteOffsetsState {
  offsets: Record<string, VnSpriteOffset>;
  setOffset: (lineId: string, offset: VnSpriteOffset) => void;
  resetOffset: (lineId: string) => void;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** v4.0 VN 增强：立绘插槽拖拽定位（前端持久化，不修改数据库）。 */
export const useVnSpriteOffsetsStore = create<VnSpriteOffsetsState>()(
  persist(
    (set) => ({
      offsets: {},
      setOffset: (lineId, offset) =>
        set((state) => ({
          offsets: {
            ...state.offsets,
            [lineId]: {
              x: clampPercent(offset.x),
              y: clampPercent(offset.y),
            },
          },
        })),
      resetOffset: (lineId) =>
        set((state) => {
          if (!(lineId in state.offsets)) return state;
          const next = { ...state.offsets };
          delete next[lineId];
          return { offsets: next };
        }),
    }),
    { name: 'plotline:vn-sprite-offsets' },
  ),
);
