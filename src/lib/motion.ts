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

/** 时间轴卡片拖拽释放后的归位动画：200ms，与 MOTION_SLOW 同参但语义独立。 */
export const MOTION_DRAG_RETURN_SPEC: MotionTokenSpec = {
  duration: 0.2,
  ease: EASE_STANDARD,
};

/**
 * 主视图切换等场景使用的自然弹簧动画。
 * 参数经过临界阻尼校验（damping ratio ≈ 1），避免弹性/弹跳感。
 */
export const MOTION_SPRING: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 32,
  mass: 0.8,
};

/**
 * 专用于 Framer Motion `layout` 属性的弹簧过渡。
 * 低张力、高阻尼，确保位置/尺寸变化顺滑且不会抖动回弹。
 */
export const MOTION_LAYOUT: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 28,
  mass: 0.8,
};

export const MOTION_FAST = MOTION_FAST_SPEC;
export const MOTION_BASE = MOTION_BASE_SPEC;
export const MOTION_SLOW = MOTION_SLOW_SPEC;
export const MOTION_DRAG_RETURN = MOTION_DRAG_RETURN_SPEC;

/** 设置页等标签/分组切换的专用 token：180ms 标准缓动。 */
export const MOTION_TAB = MOTION_BASE_SPEC;

export const MOTION_TOKENS = {
  fast: MOTION_FAST,
  base: MOTION_BASE,
  slow: MOTION_SLOW,
  tab: MOTION_TAB,
  spring: MOTION_SPRING,
  layout: MOTION_LAYOUT,
} as const;

export type MotionToken = keyof typeof MOTION_TOKENS;

/**
 * 场景级动效 token（与 motionOrchestrator 的场景预设对应）。
 * 供仅需单个 duration+ease 的调用点直接消费；完整 stagger / delay / exit
 * 编排请使用 `getScenePreset`（@/lib/motionOrchestrator）。
 * 新增常量不替换旧 token，仅作为场景预设的便捷快捷方式。
 */
export const MOTION_SCENE_VIEW_SWITCH: MotionTokenSpec = {
  duration: 0.18,
  ease: EASE_STANDARD,
};

export const MOTION_SCENE_CARD_BATCH_ENTER: MotionTokenSpec = {
  duration: 0.18,
  ease: EASE_STANDARD,
};

export const MOTION_SCENE_DRAG_RETURN: MotionTokenSpec = {
  duration: 0.2,
  ease: EASE_STANDARD,
};

export const MOTION_SCENE_AI_PANEL_EXPAND: MotionTokenSpec = {
  duration: 0.22,
  ease: EASE_STANDARD,
};

export const MOTION_SCENE_SIDEBAR_NAV: MotionTokenSpec = {
  duration: 0.12,
  ease: EASE_STANDARD,
};
