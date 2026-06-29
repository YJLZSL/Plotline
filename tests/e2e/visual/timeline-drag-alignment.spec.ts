import { test, expect } from '@playwright/test';
import {
  createAbsoluteEvent,
  createWorkspaceAndGoToTimeline,
  getCard,
  getMajorTick,
} from '../helpers/timeline';

/**
 * 时间轴拖拽吸附视觉回归测试。
 *
 * 截图对比拖动前、拖动中（显示吸附参考线）、释放后的状态，
 * 并验证吸附参考线与卡片左边缘重合（差值 ≤ 1px）。
 *
 * 如后端 dev server 不可用，测试自动 skip 而非 fail。
 */

let backendAvailable = false;

test.beforeAll(async ({ request }) => {
  try {
    const response = await request.get('/', { timeout: 5000 });
    backendAvailable = response.ok();
  } catch {
    backendAvailable = false;
  }
});

test.beforeEach(async () => {
  test.skip(!backendAvailable, '后端 dev server 不可用，跳过拖拽吸附视觉测试');
});

const SNAP_TOLERANCE = 1;

test.describe('时间轴拖拽吸附视觉对齐', () => {
  test.beforeEach(async ({ page }) => {
    await createWorkspaceAndGoToTimeline(page, '拖拽吸附视觉测试');
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('should 吸附参考线与卡片左边缘在拖动中、释放后均像素级对齐', async ({ page }, testInfo) => {
    await createAbsoluteEvent(page, '视觉吸附事件', '2024-03-28');

    const card = await getCard(page, '视觉吸附事件');
    const tick = await getMajorTick(page, '2024-04');
    await expect(tick).toBeAttached();

    // 等待卡片入场动画完成，避免测量时仍有 sub-pixel 位移
    await page.waitForTimeout(300);

    const cardBox = await card.boundingBox();
    const tickBox = await tick.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(tickBox).not.toBeNull();

    // 帧 1：拖动前
    await page.screenshot({
      path: 'test-results/visual/timeline-drag-alignment-1-before.png',
      fullPage: true,
    });

    // 开始拖拽：将卡片左边缘对齐到目标刻度线
    const startX = cardBox!.x + cardBox!.width / 2;
    const startY = cardBox!.y + cardBox!.height / 2;
    const targetX = startX + (tickBox!.x - cardBox!.x);
    const targetY = startY;

    await page.mouse.move(0, 0);
    await page.mouse.move(startX, startY, { steps: 3 });
    await page.mouse.down();
    await page.mouse.move(startX + 4, startY, { steps: 1 });
    await page.mouse.move(targetX, targetY, { steps: 10 });
    // 等待 React 状态与 Framer Motion 手势稳定后再测量参考线
    await page.waitForTimeout(400);

    // 帧 2：拖动中，吸附参考线应可见
    const hint = page.getByTestId('drag-snap-hint');
    await expect(hint).toBeVisible();
    const hintBox = await hint.boundingBox();
    expect(hintBox).not.toBeNull();
    expect(Math.abs(hintBox!.x - tickBox!.x)).toBeLessThanOrEqual(SNAP_TOLERANCE);

    await page.screenshot({
      path: 'test-results/visual/timeline-drag-alignment-2-dragging.png',
      fullPage: true,
    });

    // 释放
    await page.mouse.up();
    await page.waitForTimeout(400);

    // 帧 3：释放后
    await page.screenshot({
      path: 'test-results/visual/timeline-drag-alignment-3-after.png',
      fullPage: true,
    });

    // 释放后卡片应吸附到目标网格
    await expect(card).toContainText('2024-04-01');
    const finalBox = await card.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(Math.abs(finalBox!.x - tickBox!.x)).toBeLessThanOrEqual(SNAP_TOLERANCE);

    await testInfo.attach('timeline-drag-alignment', {
      body: '拖拽对齐三帧截图已保存到 test-results/visual/timeline-drag-alignment-*.png',
      contentType: 'text/plain',
    });
  });

  test('should 拖拽前后时间轴画布视觉无错位 when 事件吸附到网格', async ({ page }) => {
    await createAbsoluteEvent(page, '截图回归事件', '2024-03-28');

    const card = await getCard(page, '截图回归事件');
    const tick = await getMajorTick(page, '2024-04');
    await expect(tick).toBeAttached();

    const cardBox = await card.boundingBox();
    const tickBox = await tick.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(tickBox).not.toBeNull();

    const canvas = page.getByTestId('timeline-canvas');
    await expect(canvas).toHaveScreenshot('timeline-drag-alignment-before.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });

    const startX = cardBox!.x + cardBox!.width / 2;
    const startY = cardBox!.y + cardBox!.height / 2;
    const targetX = startX + (tickBox!.x - cardBox!.x);
    const targetY = startY;

    await page.mouse.move(0, 0);
    await page.mouse.move(startX, startY, { steps: 3 });
    await page.mouse.down();
    await page.mouse.move(startX + 4, startY, { steps: 1 });
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(300);

    await expect(canvas).toHaveScreenshot('timeline-drag-alignment-after.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });
});
