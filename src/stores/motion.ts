import { create } from 'zustand';

interface MotionState {
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  applyToDOM: (enabled: boolean) => void;
}

function setMotionCssVar(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--motion-enabled', enabled ? '1' : '0');
}

export const useMotionStore = create<MotionState>()((set) => ({
  animationsEnabled: true,
  setAnimationsEnabled: (enabled) => {
    set({ animationsEnabled: enabled });
    setMotionCssVar(enabled);
  },
  applyToDOM: (enabled) => {
    setMotionCssVar(enabled);
  },
}));
