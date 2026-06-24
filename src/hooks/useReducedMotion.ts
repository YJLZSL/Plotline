import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

/**
 * 返回当前系统是否启用了“减少动效”。
 * 包装 framer-motion 的 hook，确保组件级动画也能一致地降级。
 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}
