import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MotionState {
  animationsEnabled: boolean;
  fancyAnimationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  setFancyAnimationsEnabled: (enabled: boolean) => void;
  applyToDOM: (enabled: boolean) => void;
  applyFancyToDOM: (enabled: boolean) => void;
}

function setMotionCssVar(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--motion-enabled', enabled ? '1' : '0');
}

function setFancyAttr(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-fancy-animations', enabled ? 'true' : 'false');
}

export const useMotionStore = create<MotionState>()(
  persist(
    (set) => ({
      animationsEnabled: true,
      fancyAnimationsEnabled: false,
      setAnimationsEnabled: (enabled) => {
        set({ animationsEnabled: enabled });
        setMotionCssVar(enabled);
      },
      setFancyAnimationsEnabled: (enabled) => {
        set({ fancyAnimationsEnabled: enabled });
        setFancyAttr(enabled);
      },
      applyToDOM: (enabled) => {
        setMotionCssVar(enabled);
      },
      applyFancyToDOM: (enabled) => {
        setFancyAttr(enabled);
      },
    }),
    { name: 'plotline:motion' },
  ),
);
