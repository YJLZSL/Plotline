import { test, expect, type Page } from '@playwright/test';

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

async function getMajorTick(page: Page, label: string) {
  return page.locator(`[data-testid="timeline-major-tick"][data-tick-label="${label}"]`).first();
}

async function getCard(page: Page, title: string) {
  return page.locator('[data-event-id]').filter({ hasText: title }).first();
}

test.describe('时间轴拖拽吸附', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('拖拽吸附测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await skipOnboardingGuide(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('拖拽时吸附参考线与目标网格线对齐并显示时间提示', async ({ page }) => {
    // 创建 3-28 事件，默认 month 缩放级别下距离 4-1 约 14px，落在吸附阈值内
    await createAbsoluteEvent(page, '对齐事件', '2024-03-28');

    const card = await getCard(page, '对齐事件');
    const tick = await getMajorTick(page, '2024-04');
    await expect(tick).toBeAttached();

    // 等待卡片入场动画完成，避免初始测量时仍有 sub-pixel 位移
    await page.waitForTimeout(300);

    const cardBox = await card.boundingBox();
    const tickBox = await tick.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(tickBox).not.toBeNull();

    // 将卡片左边缘拖到 2024-04 网格线上
    const delta = tickBox!.x - cardBox!.x;
    const startX = cardBox!.x + cardBox!.width / 2;
    const startY = cardBox!.y + cardBox!.height / 2;
    const targetX = startX + delta;
    const targetY = startY;

    // 直接用鼠标事件拖拽，避免 hover 触发 tooltip 遮挡导致 drag 未启动
    await page.mouse.move(0, 0);
    await page.mouse.move(startX, startY, { steps: 3 });
    await page.mouse.down();
    // 先小幅度移动，确保 Framer Motion 识别为 drag 手势
    await page.mouse.move(startX + 4, startY, { steps: 1 });
    await page.mouse.move(targetX, targetY, { steps: 10 });
    // 等待 React 状态、Framer Motion 手势与吸附参考线入场动画稳定
    await page.waitForTimeout(400);

    const hint = page.getByTestId('drag-snap-hint');
    const tooltip = page.getByTestId('drag-snap-tooltip');
    await expect(hint).toBeVisible();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('2024-04');

    // 吸附参考线应与目标网格线对齐；轮询等待位置稳定并重测刻度，
    // 防止不同运行时机下 DOM 布局/滚动未完全收敛导致一次性差值。
    await expect
      .poll(
        async () => {
          const hintBox = await hint.boundingBox();
          const currentTickBox = await tick.boundingBox();
          expect(hintBox).not.toBeNull();
          expect(currentTickBox).not.toBeNull();
          return Math.abs(hintBox!.x - currentTickBox!.x);
        },
        { timeout: 1000, message: '吸附参考线未在 1s 内与目标网格线对齐' },
      )
      .toBeLessThanOrEqual(2);

    await page.mouse.up();
  });

  test('释放后绝对事件时间被吸附到目标网格', async ({ page }) => {
    // 创建 3-28 事件，距离 4-1 约 3-4 天，在默认 month 缩放级别下落在吸附阈值内
    await createAbsoluteEvent(page, '待吸附事件', '2024-03-28');

    const card = await getCard(page, '待吸附事件');
    const tick = await getMajorTick(page, '2024-04');
    await expect(tick).toBeAttached();

    // 等待卡片入场动画完成，避免初始测量时仍有 sub-pixel 位移
    await page.waitForTimeout(300);

    const cardBox = await card.boundingBox();
    const tickBox = await tick.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(tickBox).not.toBeNull();

    // 将卡片左边缘拖到 2024-04 网格线上并释放
    const delta = tickBox!.x - cardBox!.x;
    const startX = cardBox!.x + cardBox!.width / 2;
    const startY = cardBox!.y + cardBox!.height / 2;
    const targetX = startX + delta;
    const targetY = startY;

    // 直接用鼠标事件拖拽，避免 hover 触发 tooltip 遮挡导致 drag 未启动
    await page.mouse.move(0, 0);
    await page.mouse.move(startX, startY, { steps: 3 });
    await page.mouse.down();
    // 先小幅度移动，确保 Framer Motion 识别为 drag 手势
    await page.mouse.move(startX + 4, startY, { steps: 1 });
    await page.mouse.move(targetX, targetY, { steps: 10 });

    // 等待 React 刷新拖拽状态并触发吸附
    await page.waitForTimeout(300);
    await page.mouse.up();

    // 等待后端更新与 UI 重绘，确认卡片日期已变为 2024-04-01
    await expect(card).toContainText('2024-04-01');

    // 打开编辑对话框验证日期已被吸附到 2024-04-01
    await card.dblclick();
    const dateInput = page.locator('input[type="date"]').first();
    await expect(dateInput).toBeVisible();
    await expect(dateInput).toHaveValue('2024-04-01');

    await page.getByRole('button', { name: '取消' }).first().click();
  });
});
