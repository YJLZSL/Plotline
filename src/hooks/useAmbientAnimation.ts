import type { Transition } from 'framer-motion';

import { MOTION_BASE } from '@/lib/motion';
import { useMotionStore } from '@/stores/motion';

interface AmbientAnimation {
  transition: Transition;
  animate: boolean;
  enabled: boolean;
}

export function useAmbientAnimation(): AmbientAnimation {
  const animationsEnabled = useMotionStore((s) => s.animationsEnabled);

  if (animationsEnabled) {
    return { transition: MOTION_BASE, animate: true, enabled: true };
  }

  return { transition: { duration: 0 }, animate: false, enabled: false };
}
