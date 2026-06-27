import { useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

import { MOTION_BASE } from '@/lib/motion';
import { useMotionStore } from '@/stores/motion';

interface AmbientAnimation {
  transition: Transition;
  animate: boolean;
  enabled: boolean;
  fancy: boolean;
}

export function useAmbientAnimation(): AmbientAnimation {
  const animationsEnabled = useMotionStore((s) => s.animationsEnabled);
  const fancyAnimationsEnabled = useMotionStore((s) => s.fancyAnimationsEnabled);
  const reduced = useReducedMotion();

  const enabled = animationsEnabled && !reduced;

  if (enabled) {
    return {
      transition: MOTION_BASE,
      animate: true,
      enabled: true,
      fancy: fancyAnimationsEnabled,
    };
  }

  return {
    transition: { duration: 0 },
    animate: false,
    enabled: false,
    fancy: false,
  };
}
