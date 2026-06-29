import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  getScenePreset,
  getElementDelay,
  prefersReducedMotion,
  buildEnterTransition,
  buildExitTransition,
  type MotionScene,
} from './motionOrchestrator';
import { EASE_STANDARD } from './motion';

const ALL_SCENES: MotionScene[] = [
  'viewSwitch',
  'cardBatchEnter',
  'dragReturnWithConnections',
  'aiPanelExpand',
  'sidebarNavEnter',
];

describe('motionOrchestrator', () => {
  describe('getElementDelay', () => {
    it('should return 0 when index is 0', () => {
      expect(getElementDelay(0, 0.012)).toBe(0);
    });

    it('should return 0 when index is negative', () => {
      expect(getElementDelay(-3, 0.012)).toBe(0);
    });

    it('should return index * staggerStep when index is positive', () => {
      expect(getElementDelay(1, 0.012)).toBeCloseTo(0.012);
      expect(getElementDelay(3, 0.008)).toBeCloseTo(0.024);
      expect(getElementDelay(5, 0.04)).toBeCloseTo(0.2);
    });

    it('should return 0 for any index when staggerStep is 0', () => {
      expect(getElementDelay(0, 0)).toBe(0);
      expect(getElementDelay(5, 0)).toBe(0);
      expect(getElementDelay(100, 0)).toBe(0);
    });
  });

  describe('prefersReducedMotion', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return false when matchMedia reports no reduce preference', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      expect(prefersReducedMotion()).toBe(false);
    });

    it('should return true when matchMedia reports reduce preference', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      expect(prefersReducedMotion()).toBe(true);
    });
  });

  describe('getScenePreset - enhanced gating', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return enhanced preset when enhanced=true and no reduced motion', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      const preset = getScenePreset('viewSwitch', { enhanced: true });
      expect(preset.enhanced).toBe(true);
      expect(preset.reduced).toBe(false);
    });

    it('should return degraded preset when enhanced=false', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      const preset = getScenePreset('viewSwitch', { enhanced: false });
      expect(preset.enhanced).toBe(false);
      expect(preset.enter.duration).toBeCloseTo(0.2);
      expect(preset.enter.step).toBe(0);
    });

    it('should return degraded preset when prefers-reduced-motion is active even if enhanced=true', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      const preset = getScenePreset('cardBatchEnter', { enhanced: true });
      expect(preset.enhanced).toBe(false);
      expect(preset.reduced).toBe(true);
      expect(preset.enter.step).toBe(0);
      expect(preset.enter.duration).toBeCloseTo(0.2);
    });

    it('should force pathLengthDuration to 0 in degraded mode for connection scenes', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      const preset = getScenePreset('cardBatchEnter', { enhanced: false });
      expect(preset.connection).toBeDefined();
      expect(preset.connection?.pathLengthDuration).toBe(0);
    });
  });

  describe('getScenePreset - per-scene enhanced specs', () => {
    beforeEach(() => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should configure viewSwitch with exit+enter stagger and overlap', () => {
      const preset = getScenePreset('viewSwitch', { enhanced: true });
      expect(preset.exit).toBeDefined();
      expect(preset.exit?.duration).toBeCloseTo(0.12);
      expect(preset.exit?.step).toBeCloseTo(0.03);
      expect(preset.enter.duration).toBeCloseTo(0.18);
      expect(preset.enter.step).toBeCloseTo(0.04);
      expect(preset.overlap).toBeCloseTo(0.06);
      expect(preset.enter.ease).toEqual(EASE_STANDARD);
    });

    it('should configure cardBatchEnter with connection (opacity 180ms + pathLength 220ms)', () => {
      const preset = getScenePreset('cardBatchEnter', { enhanced: true });
      expect(preset.enter.duration).toBeCloseTo(0.18);
      expect(preset.enter.step).toBeCloseTo(0.012);
      expect(preset.connection).toBeDefined();
      expect(preset.connection?.opacityDuration).toBeCloseTo(0.18);
      expect(preset.connection?.pathLengthDuration).toBeCloseTo(0.22);
      expect(preset.connection?.delay).toBeCloseTo(0);
      expect(preset.exit).toBeUndefined();
    });

    it('should configure dragReturnWithConnections with 200ms enter and connection config', () => {
      const preset = getScenePreset('dragReturnWithConnections', { enhanced: true });
      expect(preset.enter.duration).toBeCloseTo(0.2);
      expect(preset.enter.step).toBe(0);
      expect(preset.connection).toBeDefined();
      expect(preset.connection?.opacityDuration).toBeCloseTo(0.18);
      expect(preset.connection?.pathLengthDuration).toBeCloseTo(0.22);
    });

    it('should configure aiPanelExpand with 220ms enter and content fade (180ms delay 40ms)', () => {
      const preset = getScenePreset('aiPanelExpand', { enhanced: true });
      expect(preset.enter.duration).toBeCloseTo(0.22);
      expect(preset.content).toBeDefined();
      expect(preset.content?.duration).toBeCloseTo(0.18);
      expect(preset.content?.delay).toBeCloseTo(0.04);
      expect(preset.content?.ease).toEqual(EASE_STANDARD);
    });

    it('should configure sidebarNavEnter with 8ms stagger and 120ms duration', () => {
      const preset = getScenePreset('sidebarNavEnter', { enhanced: true });
      expect(preset.enter.duration).toBeCloseTo(0.12);
      expect(preset.enter.step).toBeCloseTo(0.008);
      expect(preset.exit).toBeUndefined();
      expect(preset.connection).toBeUndefined();
      expect(preset.content).toBeUndefined();
    });

    it('should preserve scene name and easing curve across all scenes', () => {
      for (const scene of ALL_SCENES) {
        const preset = getScenePreset(scene, { enhanced: true });
        expect(preset.scene).toBe(scene);
        expect(preset.enter.ease).toEqual(EASE_STANDARD);
      }
    });

    it('should keep all enhanced durations within the 120-300ms PRD window', () => {
      for (const scene of ALL_SCENES) {
        const preset = getScenePreset(scene, { enhanced: true });
        expect(preset.enter.duration).toBeGreaterThanOrEqual(0.12);
        expect(preset.enter.duration).toBeLessThanOrEqual(0.3);
        if (preset.exit) {
          expect(preset.exit.duration).toBeGreaterThanOrEqual(0.12);
          expect(preset.exit.duration).toBeLessThanOrEqual(0.3);
        }
        if (preset.content) {
          expect(preset.content.duration).toBeGreaterThanOrEqual(0.12);
          expect(preset.content.duration).toBeLessThanOrEqual(0.3);
        }
      }
    });

    it('should keep stagger steps non-negative across all scenes', () => {
      for (const scene of ALL_SCENES) {
        const preset = getScenePreset(scene, { enhanced: true });
        expect(preset.enter.step).toBeGreaterThanOrEqual(0);
        if (preset.exit) {
          expect(preset.exit.step).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('getScenePreset - degraded spec uniformity', () => {
    beforeEach(() => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return the same degraded enter config for all scenes when enhanced=false', () => {
      const presets = ALL_SCENES.map((scene) => getScenePreset(scene, { enhanced: false }));
      const firstDuration = presets[0]?.enter.duration;
      expect(firstDuration).toBeDefined();
      for (const preset of presets) {
        expect(preset.enter.duration).toBe(firstDuration);
        expect(preset.enter.step).toBe(0);
        expect(preset.enhanced).toBe(false);
      }
    });

    it('should disable pathLength in degraded mode for all connection scenes', () => {
      const connectionScenes: MotionScene[] = ['cardBatchEnter', 'dragReturnWithConnections'];
      for (const scene of connectionScenes) {
        const preset = getScenePreset(scene, { enhanced: false });
        expect(preset.connection).toBeDefined();
        expect(preset.connection?.pathLengthDuration).toBe(0);
      }
    });

    it('should zero content delay in degraded mode', () => {
      const preset = getScenePreset('aiPanelExpand', { enhanced: false });
      expect(preset.content).toBeDefined();
      expect(preset.content?.delay).toBe(0);
    });
  });

  describe('buildEnterTransition', () => {
    beforeEach(() => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should compose duration, ease, and per-element delay', () => {
      const preset = getScenePreset('sidebarNavEnter', { enhanced: true });
      const transition = buildEnterTransition(preset, 3);
      expect(transition.duration).toBeCloseTo(0.12);
      expect(transition.ease).toEqual(EASE_STANDARD);
      expect(transition.delay).toBeCloseTo(0.024);
    });

    it('should return 0 delay for the first element', () => {
      const preset = getScenePreset('cardBatchEnter', { enhanced: true });
      const transition = buildEnterTransition(preset, 0);
      expect(transition.delay).toBe(0);
    });
  });

  describe('buildExitTransition', () => {
    beforeEach(() => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should build exit transition for scenes with exit config', () => {
      const preset = getScenePreset('viewSwitch', { enhanced: true });
      const transition = buildExitTransition(preset, 2);
      expect(transition).toBeDefined();
      expect(transition?.duration).toBeCloseTo(0.12);
      expect(transition?.delay).toBeCloseTo(0.06);
    });

    it('should return undefined for scenes without exit config', () => {
      const preset = getScenePreset('cardBatchEnter', { enhanced: true });
      const transition = buildExitTransition(preset, 0);
      expect(transition).toBeUndefined();
    });
  });
});
