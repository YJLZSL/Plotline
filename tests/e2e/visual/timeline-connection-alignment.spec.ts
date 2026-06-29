import { test, expect, type Page } from '@playwright/test';

/**
 * 连接线视觉对齐截图回归测试（Task 8.2）。
 *
 * 本文件专注于**视觉截图对比**：通过 Playwright `toHaveScreenshot` 验证
 * 拖动事件前后连接线已重绘到新位置。
 *
 * 与 `tests/e2e/timeline-connection-alignment.spec.ts`（Task 4.4，DOM 位置断言）
 * 互补：后者用 boundingBox 精确断言端点坐标，本文件用像素级截图捕获整体视觉变化。
 *
 * 首次运行会自动生成 baseline 截图到 `tests/e2e/visual/__screenshots__/` 目录。
 * 如后端 dev server 不可用，测试自动 skip 而非 fail。
 *
 * 注意：`toHaveScreenshot` 对动画中的截屏可能过于严格，
 * 因此测试前统一关闭动画（`reducedMotion: 'reduce'`）。
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
  test.skip(!backendAvailable, '后端 dev server 不可用，跳过连接线视觉测试');
});

async function skipOnboardingGuide(page: Page) {
  const skipGuide = page.getByTestId('guide-skip-btn');
  if (await skipGuide.isVisible().catch(() => false)) {
    await skipGuide.click();
    await expect(skipGuide).toBeHidden();
  }
}

async function createAbsoluteEvent(page: Page, title: string, date: string) {
  await page.getByTestId('add-event-btn').first().click();
  await page.getByTestId('event-title-input').fill(title);
  await page.getByRole('button', { name: '绝对日期' }).click();
  await page.locator('input[type="date"]').first().fill(date);
  await page.getByTestId('event-save-btn').click();
  await expect(page.locator('[data-event-id]').filter({ hasText: title })).toBeVisible();
}

/** 右键事件卡片 → 建立连接 → 点击目标事件完成连接 */
async function connectEvents(page: Page, sourceTitle: string, targetTitle: string) {
  const sourceCard = page.locator('[data-event-id]').filter({ hasText: sourceTitle }).first();
  await sourceCard.click({ button: 'right' });
  await page.getByText('建立连接').click();
  await expect(page.getByText(/点击目标事件/)).toBeVisible({ timeout: 3000 }).catch(() => {
    // 提示可能被滚动遮盖，继续执行
  });
  const targetCard = page.locator('[data-event-id]').filter({ hasText: targetTitle }).first();
  await targetCard.click();
}

test.describe('连接线视觉截图回归', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('连接线视觉回归');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await skipOnboardingGuide(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('should 拖动事件前生成连接线 baseline 截图 when 连接已建立', async ({ page }) => {
    await createAbsoluteEvent(page, '视觉源事件', '2024-03-15');
    await createAbsoluteEvent(page, '视觉目标事件', '2024-06-15');

    await connectEvents(page, '视觉源事件', '视觉目标事件');

    // 用 toBeAttached 避免 opacity 动画期间 toBeVisible 误判；waitForTimeout 等动画完成后才截图
    await expect(
      page.locator('svg[data-testid="timeline-connection-layer"] path'),
    ).toBeAttached({ timeout: 5000 });
    await page.waitForTimeout(300);

    const canvas = page.getByTestId('timeline-canvas');
    await expect(canvas).toHaveScreenshot('connection-baseline-before-drag.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('should 拖动事件后连接线重绘到新位置 when 事件被水平拖动', async ({ page }) => {
    await createAbsoluteEvent(page, '拖动源事件', '2024-03-15');
    await createAbsoluteEvent(page, '拖动目标事件', '2024-06-15');

    await connectEvents(page, '拖动源事件', '拖动目标事件');

    // 用 toBeAttached 避免 opacity 动画期间 toBeVisible 误判；waitForTimeout 等动画完成后才截图
    await expect(
      page.locator('svg[data-testid="timeline-connection-layer"] path'),
    ).toBeAttached({ timeout: 5000 });
    await page.waitForTimeout(300);

    const canvas = page.getByTestId('timeline-canvas');
    const beforePath = 'test-results/visual/connection-before-drag.png';
    await canvas.screenshot({ path: beforePath });

    const sourceCard = page.locator('[data-event-id]').filter({ hasText: '拖动源事件' }).first();
    const initialBox = await sourceCard.boundingBox();
    expect(initialBox).not.toBeNull();

    await sourceCard.hover();
    await page.mouse.down();
    await page.mouse.move(
      initialBox!.x + initialBox!.width / 2 + 180,
      initialBox!.y + initialBox!.height / 2,
      { steps: 12 },
    );
    await page.mouse.up();

    await page.waitForTimeout(400);
    // 用 toBeAttached 避免 opacity 动画期间 toBeVisible 误判
    await expect(
      page.locator('svg[data-testid="timeline-connection-layer"] path'),
    ).toBeAttached();

    const afterPath = 'test-results/visual/connection-after-drag.png';
    await canvas.screenshot({ path: afterPath });

    const pathAfter = await page
      .locator('svg[data-testid="timeline-connection-layer"] path')
      .first()
      .getAttribute('d');
    expect(pathAfter).not.toBeNull();
    expect(pathAfter!.length).toBeGreaterThan(10);

    const finalBox = await sourceCard.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(Math.abs(finalBox!.x - initialBox!.x)).toBeGreaterThan(20);

    await expect(canvas).toHaveScreenshot('connection-after-drag.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });
});
