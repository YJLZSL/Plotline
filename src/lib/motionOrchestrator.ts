import { EASE_STANDARD } from './motion';

/**
 * 场景级过渡参数（Tween 变体的子集），可赋值给 Framer Motion 的 Transition。
 */
export interface SceneTransitionSpec {
  duration: number;
  ease: typeof EASE_STANDARD;
  delay: number;
}

/** 缓动函数类型别名，统一为项目标准 cubic-bezier(0.16, 1, 0.3, 1)。 */
export type EasingFunction = typeof EASE_STANDARD;

/**
 * 动画编排层 —— 场景级动效预设。
 *
 * 为多元素动画（视图切换、批量卡片入场、拖拽归位+连线、AI 面板展开、
 * 侧栏导航入场、时间轴拖拽吸附）提供统一的 stagger / delay / duration / exit timing，
 * 避免各组件各自为政导致视觉割裂。
 *
 * 所有缓动均使用 `cubic-bezier(0.16, 1, 0.3, 1)`（EASE_STANDARD），
 * 时长落在 PRD §5 的 120–300ms 窗口内，禁止弹性 / 弹跳 / 闪烁。
 */

export type MotionScene =
  | 'viewSwitch'
  | 'cardBatchEnter'
  | 'dragReturnWithConnections'
  | 'aiPanelExpand'
  | 'sidebarNavEnter'
  | 'dragSnap';

export interface MotionSceneOptions {
  /** "增强动效"开关值（来自 useUIStore.enhancedAnimations）。 */
  enhanced: boolean;
}

/** 单批元素的 stagger 配置（入场或退场）。 */
export interface SceneStaggerConfig {
  /** 相邻元素之间的延迟（秒）；退化模式下为 0。 */
  step: number;
  /** 单个元素的动画时长（秒）。 */
  duration: number;
  /** 缓动曲线，恒为 EASE_STANDARD。 */
  ease: typeof EASE_STANDARD;
}

/** 连接线绘制配置。 */
export interface SceneConnectionConfig {
  /** opacity 动画时长（秒）。 */
  opacityDuration: number;
  /** pathLength 动画时长（秒）；退化模式下为 0（不绘制）。 */
  pathLengthDuration: number;
  /** 连接线动画起播延迟（秒）。 */
  delay: number;
}

/** 次级内容（如 AI 面板内部内容）的淡入配置。 */
export interface SceneContentConfig {
  duration: number;
  delay: number;
  ease: typeof EASE_STANDARD;
}

/** 时间轴拖拽吸附场景的分段动效配置。 */
export interface DragSnapPreset {
  lift: { duration: number; ease: EasingFunction; scale: number };
  snap: { duration: number; ease: EasingFunction };
  land: { duration: number; ease: EasingFunction };
  connections: { opacityDuration: number; pathLengthDuration: number };
  trackHeight: { duration: number; ease: EasingFunction };
}

export interface MotionPreset {
  scene: MotionScene;
  /** 最终是否启用增强效果（reduced motion 时强制为 false）。 */
  enhanced: boolean;
  /** 是否检测到 prefers-reduced-motion。 */
  reduced: boolean;
  /** 入场批次配置。 */
  enter: SceneStaggerConfig;
  /** 退场批次配置；无退场动画的场景为 undefined。 */
  exit?: SceneStaggerConfig;
  /** 退场与入场的重叠时间（秒）；正值表示入场在退场结束前开始。 */
  overlap: number;
  /** 连接线配置；无连线的场景为 undefined。 */
  connection?: SceneConnectionConfig;
  /** 次级内容配置；无次级内容的场景为 undefined。 */
  content?: SceneContentConfig;
  /** 整个场景的预期总时长（秒）。 */
  totalDuration: number;
  /** 拖拽吸附场景专属配置；仅 dragSnap 场景返回。 */
  dragSnap?: DragSnapPreset;
}

/**
 * 纯函数：根据元素索引与 stagger 步长计算 per-element delay。
 * 公式：delay = max(0, index) * staggerStep。
 */
export function getElementDelay(index: number, staggerStep: number): number {
  if (index <= 0) return 0;
  return index * staggerStep;
}

/**
 * 检测 prefers-reduced-motion。SSR / 非浏览器环境安全返回 false。
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 根据预设构建入场 Transition（Framer Motion）。 */
export function buildEnterTransition(preset: MotionPreset, index: number): SceneTransitionSpec {
  return {
    duration: preset.enter.duration,
    ease: preset.enter.ease,
    delay: getElementDelay(index, preset.enter.step),
  };
}

/** 根据预设构建退场 Transition（Framer Motion）；无退场配置时返回 undefined。 */
export function buildExitTransition(preset: MotionPreset, index: number): SceneTransitionSpec | undefined {
  if (!preset.exit) return undefined;
  return {
    duration: preset.exit.duration,
    ease: preset.exit.ease,
    delay: getElementDelay(index, preset.exit.step),
  };
}

interface SceneSpec {
  enter: SceneStaggerConfig;
  exit?: SceneStaggerConfig;
  overlap?: number;
  connection?: SceneConnectionConfig;
  content?: SceneContentConfig;
  totalDuration: number;
}

const SCENE_SPECS: Record<Exclude<MotionScene, 'dragSnap'>, SceneSpec> = {
  viewSwitch: {
    exit: { step: 0.03, duration: 0.12, ease: EASE_STANDARD },
    enter: { step: 0.04, duration: 0.18, ease: EASE_STANDARD },
    overlap: 0.06,
    totalDuration: 0.48,
  },
  cardBatchEnter: {
    enter: { step: 0.012, duration: 0.18, ease: EASE_STANDARD },
    connection: { opacityDuration: 0.18, pathLengthDuration: 0.22, delay: 0 },
    totalDuration: 0.6,
  },
  dragReturnWithConnections: {
    enter: { step: 0, duration: 0.2, ease: EASE_STANDARD },
    connection: { opacityDuration: 0.18, pathLengthDuration: 0.22, delay: 0 },
    totalDuration: 0.22,
  },
  aiPanelExpand: {
    enter: { step: 0, duration: 0.22, ease: EASE_STANDARD },
    content: { duration: 0.18, delay: 0.04, ease: EASE_STANDARD },
    totalDuration: 0.26,
  },
  sidebarNavEnter: {
    enter: { step: 0.008, duration: 0.12, ease: EASE_STANDARD },
    totalDuration: 0.18,
  },
};

const DRAG_SNAP_ENHANCED: DragSnapPreset = {
  lift: { duration: 0.12, ease: EASE_STANDARD, scale: 1.02 },
  snap: { duration: 0.08, ease: EASE_STANDARD },
  land: { duration: 0.2, ease: EASE_STANDARD },
  connections: { opacityDuration: 0.18, pathLengthDuration: 0.22 },
  trackHeight: { duration: 0.24, ease: EASE_STANDARD },
};

const DRAG_SNAP_DEGRADED: DragSnapPreset = {
  lift: { duration: 0.12, ease: EASE_STANDARD, scale: 1 },
  snap: { duration: 0.12, ease: EASE_STANDARD },
  land: { duration: 0.12, ease: EASE_STANDARD },
  connections: { opacityDuration: 0.12, pathLengthDuration: 0 },
  trackHeight: { duration: 0.12, ease: EASE_STANDARD },
};

const DEGRADED_SPEC: SceneSpec = {
  enter: { step: 0, duration: 0.2, ease: EASE_STANDARD },
  exit: { step: 0, duration: 0.2, ease: EASE_STANDARD },
  overlap: 0,
  connection: { opacityDuration: 0.2, pathLengthDuration: 0, delay: 0 },
  content: { duration: 0.2, delay: 0, ease: EASE_STANDARD },
  totalDuration: 0.2,
};

/**
 * 获取场景预设。
 *
 * 当 `prefers-reduced-motion` 被检测到、或"增强动效"开关关闭时，
 * 返回退化版预设：所有元素同步 200ms 淡入，无 stagger，无 pathLength。
 *
 * 对于 `dragSnap` 场景，返回分段配置（lift / snap / land / connections / trackHeight）；
 * 退化模式下所有子 token 退化为 120ms opacity 淡入淡出，无 scale/pathLength。
 */
export function getScenePreset(scene: MotionScene, options: MotionSceneOptions): MotionPreset {
  const reduced = prefersReducedMotion();
  const enhanced = options.enhanced && !reduced;

  if (scene === 'dragSnap') {
    const dragSnap = enhanced ? DRAG_SNAP_ENHANCED : DRAG_SNAP_DEGRADED;
    return {
      scene,
      enhanced,
      reduced,
      enter: DEGRADED_SPEC.enter,
      exit: DEGRADED_SPEC.exit,
      overlap: 0,
      connection: { ...dragSnap.connections, delay: 0 },
      totalDuration: enhanced ? 0.4 : 0.12,
      dragSnap,
    };
  }

  const spec = enhanced ? SCENE_SPECS[scene] : DEGRADED_SPEC;
  return {
    scene,
    enhanced,
    reduced,
    enter: spec.enter,
    exit: spec.exit,
    overlap: spec.overlap ?? 0,
    connection: spec.connection,
    content: spec.content,
    totalDuration: spec.totalDuration,
  };
}
