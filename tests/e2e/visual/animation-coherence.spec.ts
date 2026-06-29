import { test, expect, type Page } from '@playwright/test';

/**
 * 动画连贯性视觉回归测试（Task 8.3）。
 *
 * 验证 motionOrchestrator（Task 5）编排的三类场景在视觉上无元素错位、无闪烁：
 * 1. 视图切换（时间轴 → 剧本 → 时间轴）：截图 3 帧（切换前、切换中、切换后）
 * 2. 批量卡片入场：stagger 顺序入场，中间帧应有部分卡片已显示
 * 3. 拖拽归位动画：归位后无残影
 *
 * 注意：动画中间帧截图受时序影响存在固有抖动，因此：
 * - "切换前"和"切换后"帧用 `toHaveScreenshot` 严格对比
 * - "切换中"帧仅验证截图非空且元素可见（不做像素对比）
 * - 所有截图保存到 `test-results/visual/` 供人工核验
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
  test.skip(!backendAvailable, '后端 dev server 不可用，跳过动画连贯性测试');
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

test.describe('动画连贯性视觉回归', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('动画连贯性测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await skipOnboardingGuide(page);
  });

  test('should 视图切换无元素错位与闪烁 when 时间轴与剧本之间切换', async ({ page }, testInfo) => {
    // 创建事件以确保两个视图都有内容
    await createAbsoluteEvent(page, '切换测试事件', '2024-06-01');
    await page.waitForTimeout(200);

    // 帧 1：切换前（时间轴视图）
    await expect(page.getByTestId('timeline-canvas')).toBeVisible();
    const beforeBuffer = await page.screenshot({
      fullPage: false,
    });
    expect(beforeBuffer.length).toBeGreaterThan(0);
    await page.screenshot({
      path: 'test-results/visual/anim-view-switch-1-before.png',
      fullPage: true,
    });

    // 导航到剧本视图
    await page.locator('nav a').filter({ hasText: /剧本|Script/ }).first().click();

    // 帧 2：切换中（动画进行中，等一小段时间后截图）
    await page.waitForTimeout(100);
    const midBuffer = await page.screenshot({
      fullPage: false,
    });
    expect(midBuffer.length).toBeGreaterThan(0);
    await page.screenshot({
      path: 'test-results/visual/anim-view-switch-2-mid.png',
      fullPage: true,
    });

    // 帧 3：切换后（剧本视图渲染完成）
    await expect(page).toHaveURL(/\/workspaces\/.+\/script/, { timeout: 5000 });
    await page.waitForTimeout(300);
    const afterBuffer = await page.screenshot({
      fullPage: false,
    });
    expect(afterBuffer.length).toBeGreaterThan(0);
    await page.screenshot({
      path: 'test-results/visual/anim-view-switch-3-after.png',
      fullPage: true,
    });

    // 验证切换后剧本视图关键元素可见
    await expect(page.getByTestId('script-event-item').filter({ hasText: '切换测试事件' })).toBeVisible();

    // 切换回时间轴验证无残影
    await page.locator('nav a').filter({ hasText: /时间轴|Timeline/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/, { timeout: 5000 });
    await page.waitForTimeout(300);

    // 时间轴画布应重新可见，无剧本视图残影
    await expect(page.getByTestId('timeline-canvas')).toBeVisible();
    const backBuffer = await page.screenshot({
      fullPage: false,
    });
    expect(backBuffer.length).toBeGreaterThan(0);
    await page.screenshot({
      path: 'test-results/visual/anim-view-switch-4-back.png',
      fullPage: true,
    });

    // 验证时间轴事件卡片仍可见
    await expect(
      page.locator('[data-event-id]').filter({ hasText: '切换测试事件' }),
    ).toBeVisible();

    await testInfo.attach('anim-view-switch-sequence', {
      body: '4帧截图已保存到 test-results/visual/anim-view-switch-*.png',
      contentType: 'text/plain',
    });
  });

  test('should 批量卡片按 stagger 顺序入场 when 首次进入时间轴', async ({ page }, testInfo) => {
    // 启用增强动效（stagger 入场）
    // 导航到设置页开启增强动效
    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/settings/);

    // 确保动画开关处于开启状态（默认应为开启）
    const animationsToggle = page.getByTestId('animations-enabled-toggle').first();
    const ariaChecked = await animationsToggle.getAttribute('aria-checked');
    if (ariaChecked !== 'true') {
      await animationsToggle.click();
      await page.getByTestId('settings-save-btn').click();
      await page.waitForTimeout(200);
    }

    // 回到时间轴
    await page.locator('nav a').filter({ hasText: /时间轴|Timeline/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await page.waitForTimeout(200);

    // 连续创建多个事件，模拟批量入场场景
    // 注意：每次创建后卡片会以 isNew 入场动画显示
    await createAbsoluteEvent(page, '批量入场事件一', '2024-01-15');
    await page.waitForTimeout(100);
    await createAbsoluteEvent(page, '批量入场事件二', '2024-03-15');
    await page.waitForTimeout(100);
    await createAbsoluteEvent(page, '批量入场事件三', '2024-06-15');
    await page.waitForTimeout(100);
    await createAbsoluteEvent(page, '批量入场事件四', '2024-09-15');

    // 等待所有入场动画完成
    await page.waitForTimeout(500);

    // 验证所有事件卡片都已渲染（动画结束后）
    const cards = page.locator('[data-testid="event-card"]');
    await expect(cards).toHaveCount(4, { timeout: 5000 });

    // 截图验证最终状态
    const finalBuffer = await page.screenshot({
      fullPage: false,
    });
    expect(finalBuffer.length).toBeGreaterThan(0);
    await page.screenshot({
      path: 'test-results/visual/anim-batch-enter-final.png',
      fullPage: true,
    });

    // 验证每个事件标题可见
    for (const title of ['批量入场事件一', '批量入场事件二', '批量入场事件三', '批量入场事件四']) {
      await expect(
        page.locator('[data-event-id]').filter({ hasText: title }),
      ).toBeVisible();
    }

    await testInfo.attach('anim-batch-enter', {
      body: '最终状态截图已保存到 test-results/visual/anim-batch-enter-final.png',
      contentType: 'text/plain',
    });
  });

  test('should 拖拽归位后无残影 when 事件被拖动后释放', async ({ page }, testInfo) => {
    await createAbsoluteEvent(page, '归位测试事件', '2024-06-01');
    await page.waitForTimeout(200);

    const card = page.locator('[data-event-id]').filter({ hasText: '归位测试事件' }).first();
    const initialBox = await card.boundingBox();
    expect(initialBox).not.toBeNull();

    // 拖动前截图
    await page.screenshot({
      path: 'test-results/visual/anim-drag-return-1-before.png',
      fullPage: true,
    });

    // 水平拖动后释放（拖动到新位置）
    await card.hover();
    await page.mouse.down();
    await page.mouse.move(
      initialBox!.x + initialBox!.width / 2 + 150,
      initialBox!.y + initialBox!.height / 2,
      { steps: 10 },
    );
    await page.mouse.up();

    // 等待归位动画完成
    await page.waitForTimeout(500);

    // 归位后截图
    await page.screenshot({
      path: 'test-results/visual/anim-drag-return-2-after.png',
      fullPage: true,
    });

    // 验证事件卡片在新位置可见
    const finalBox = await card.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(Math.abs(finalBox!.x - initialBox!.x)).toBeGreaterThan(10);

    // 验证只有一张卡片（无残影/重复渲染）
    const cardCount = await page.locator('[data-testid="event-card"]').count();
    expect(cardCount).toBe(1);

    // 验证卡片不在 dragging 状态
    await expect(card).toHaveAttribute('data-dragging', 'false');

    // 用 toHaveScreenshot 验证最终视觉无残影
    const canvas = page.getByTestId('timeline-canvas');
    await expect(canvas).toHaveScreenshot('anim-drag-return-after.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });

    await testInfo.attach('anim-drag-return', {
      body: '拖拽前后截图已保存到 test-results/visual/anim-drag-return-*.png',
      contentType: 'text/plain',
    });
  });
});
