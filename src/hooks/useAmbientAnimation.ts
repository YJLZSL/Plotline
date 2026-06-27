import { useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

import { MOTION_BASE } from '@/lib/motion';
import { useMotionStore } from '@/stores/motion';
import { useUIStore } from '@/stores/ui';

interface AmbientAnimation {
  transition: Transition;
  animate: boolean;
  enabled: boolean;
  fancy: boolean;
}

export function useAmbientAnimation(): AmbientAnimation {
  const animationsEnabled = useMotionStore((s) => s.animationsEnabled);
  const enhancedAnimations = useUIStore((s) => s.enhancedAnimations);
  const reduced = useReducedMotion();

  const enabled = animationsEnabled && !reduced;

  if (enabled) {
    return {
      transition: MOTION_BASE,
      animate: true,
      enabled: true,
      fancy: enhancedAnimations,
    };
  }

  return {
    transition: { duration: 0 },
    animate: false,
    enabled: false,
    fancy: false,
  };
}
