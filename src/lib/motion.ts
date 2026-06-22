import type { Transition } from 'framer-motion';

export const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

/**
 * 项目动效 token。所有数值与 PRD §5.5 的 200-300ms ease-out 区间保持一致：
 * - `fast`（160ms）用于按钮 tap、Dialog overlay 等微交互
 * - `base`（220ms）用于视图切换、Toast、Sidebar、卡片入场
 * - `slow`（300ms）用于 Splash 退场、骨架屏淡入等需要节奏更舒缓的场景
 */
export interface MotionTokenSpec {
  duration: number;
  ease: typeof EASE_STANDARD;
}

export const MOTION_FAST_SPEC: MotionTokenSpec = {
  duration: 0.16,
  ease: EASE_STANDARD,
};

export const MOTION_BASE_SPEC: MotionTokenSpec = {
  duration: 0.22,
  ease: EASE_STANDARD,
};

export const MOTION_SLOW_SPEC: MotionTokenSpec = {
  duration: 0.3,
  ease: EASE_STANDARD,
};

export const MOTION_FAST: Transition = MOTION_FAST_SPEC;
export const MOTION_BASE: Transition = MOTION_BASE_SPEC;
export const MOTION_SLOW: Transition = MOTION_SLOW_SPEC;

export const MOTION_TOKENS = {
  fast: MOTION_FAST,
  base: MOTION_BASE,
  slow: MOTION_SLOW,
} as const;

export type MotionToken = keyof typeof MOTION_TOKENS;
