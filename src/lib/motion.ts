import type { Transition } from 'framer-motion';

export const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

/**
 * 项目动效 token。v2.7.1 将时长压缩到 120-200ms：
 * - `fast`（120ms）用于按钮 tap、Dialog overlay 等微交互
 * - `base`（180ms）用于视图切换、Toast、Sidebar、卡片入场
 * - `slow`（200ms）用于 Splash 退场、骨架屏淡入等需要节奏更舒缓的场景
 */
export interface MotionTokenSpec {
  duration: number;
  ease: typeof EASE_STANDARD;
}

export const MOTION_FAST_SPEC: MotionTokenSpec = {
  duration: 0.12,
  ease: EASE_STANDARD,
};

export const MOTION_BASE_SPEC: MotionTokenSpec = {
  duration: 0.18,
  ease: EASE_STANDARD,
};

export const MOTION_SLOW_SPEC: MotionTokenSpec = {
  duration: 0.2,
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
