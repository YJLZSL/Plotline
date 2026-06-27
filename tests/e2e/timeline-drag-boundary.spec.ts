import { test, expect } from '@playwright/test';

test.describe('时间轴拖拽边界', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('拖拽边界测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
  });

  test('事件卡片不能被拖到画布左边缘之外', async ({ page }) => {
    // 添加一个事件
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('可拖拽事件');
    await page.getByTestId('event-save-btn').click();

    const card = page.locator('[data-event-id]').first();
    await expect(card).toBeVisible();

    const canvas = page.getByTestId('timeline-canvas');
    const canvasBox = await canvas.boundingBox();
    const initialBox = await card.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(initialBox).not.toBeNull();

    // 将卡片向左拖拽，超出画布左边缘
    await card.hover();
    await page.mouse.down();
    await page.mouse.move(canvasBox!.x - 200, initialBox!.y + initialBox!.height / 2, { steps: 10 });
    await page.mouse.up();

    // 等待 Framer Motion 完成拖拽回弹
    await page.waitForTimeout(300);

    const finalBox = await card.boundingBox();
    expect(finalBox).not.toBeNull();
    // 卡片左侧不应越过画布可视区域的左边缘（允许 2px 浮点误差）
    expect(finalBox!.x).toBeGreaterThanOrEqual(canvasBox!.x - 2);
  });

  test('画布水平滚动不会被滚到负值', async ({ page }) => {
    const canvas = page.getByTestId('timeline-canvas');
    await canvas.evaluate((el) => {
      el.scrollLeft = -100;
    });
    const scrollLeft = await canvas.evaluate((el) => el.scrollLeft);
    expect(scrollLeft).toBe(0);
  });
});
