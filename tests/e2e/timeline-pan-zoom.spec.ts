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

async function createTrack(page: Page, name: string) {
  await page.getByPlaceholder('添加轨道').fill(name);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('track-row').filter({ hasText: name })).toBeVisible();
}

async function getCardTrackId(page: Page, cardLocator: ReturnType<typeof page['locator']>) {
  return cardLocator.evaluate((el) => el.closest('[data-track-id]')?.getAttribute('data-track-id') ?? null);
}

test.describe('时间轴平移与缩放', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('平移缩放测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await skipOnboardingGuide(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('在时间轴标尺上按下并水平拖动可平移画布', async ({ page }) => {
    // 创建间隔足够远的事件，使画布可滚动
    await createAbsoluteEvent(page, '早期事件', '2024-01-15');
    await createAbsoluteEvent(page, '晚期事件', '2024-12-15');

    const ruler = page.getByTestId('timeline-ruler');
    const canvas = page.getByTestId('timeline-canvas');
    const rulerBox = await ruler.boundingBox();
    expect(rulerBox).not.toBeNull();

    const beforeScroll = await canvas.evaluate((el) => el.scrollLeft);

    // 在标尺左侧按下并向右拖动
    await ruler.hover({ position: { x: 20, y: 10 } });
    await page.mouse.down();
    await page.mouse.move(rulerBox!.x + rulerBox!.width - 40, rulerBox!.y + 10, { steps: 10 });
    await page.mouse.up();

    // 平移结束后 data-panning 应恢复 false
    await expect(canvas).toHaveAttribute('data-panning', 'false');

    const afterScroll = await canvas.evaluate((el) => el.scrollLeft);
    expect(afterScroll).toBeGreaterThan(beforeScroll + 10);
  });

  test('在画布空白处按下并水平拖动可平移画布且不触发事件选择', async ({ page }) => {
    await createAbsoluteEvent(page, '占位事件', '2024-06-01');
    await createAbsoluteEvent(page, '远端占位事件', '2024-12-31');

    const canvas = page.getByTestId('timeline-canvas');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    const beforeScroll = await canvas.evaluate((el) => el.scrollLeft);

    // 在画布空白处（轨道下方）按下并向右拖动
    const startX = canvasBox!.x + 60;
    const startY = canvasBox!.y + canvasBox!.height - 40;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 120, startY, { steps: 8 });
    await page.mouse.up();

    await expect(canvas).toHaveAttribute('data-panning', 'false');

    const afterScroll = await canvas.evaluate((el) => el.scrollLeft);
    expect(afterScroll).toBeGreaterThan(beforeScroll + 10);
  });

  test('滚轮配合 Ctrl 以鼠标位置为锚点缩放时间轴', async ({ page }) => {
    await createAbsoluteEvent(page, '锚点事件', '2024-03-15');
    await createAbsoluteEvent(page, '右侧事件', '2024-12-15');

    const canvas = page.getByTestId('timeline-canvas');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    const cards = page.locator('[data-event-id]');
    const [anchorCard, rightCard] = await cards.all();
    expect(anchorCard).toBeDefined();
    expect(rightCard).toBeDefined();

    const anchorBoxBefore = await anchorCard!.boundingBox();
    const rightBoxBefore = await rightCard!.boundingBox();
    expect(anchorBoxBefore).not.toBeNull();
    expect(rightBoxBefore).not.toBeNull();

    const beforeScrollWidth = await canvas.evaluate((el) => el.scrollWidth);
    const beforeScrollLeft = await canvas.evaluate((el) => el.scrollLeft);

    // 以左侧事件为中心进行放大（deltaY > 0 为放大）
    const anchorX = anchorBoxBefore!.x + anchorBoxBefore!.width / 2;
    const anchorY = anchorBoxBefore!.y + anchorBoxBefore!.height / 2;
    await canvas.evaluate(
      (el, { x, y }) => {
        el.dispatchEvent(
          new WheelEvent('wheel', {
            clientX: x,
            clientY: y,
            deltaY: 120,
            ctrlKey: true,
            bubbles: true,
          }),
        );
      },
      { x: anchorX, y: anchorY },
    );

    await page.waitForTimeout(150);

    const afterScrollWidth = await canvas.evaluate((el) => el.scrollWidth);
    const afterScrollLeft = await canvas.evaluate((el) => el.scrollLeft);
    expect(afterScrollWidth).toBeGreaterThan(beforeScrollWidth);
    expect(afterScrollLeft).not.toBe(beforeScrollLeft);

    // 锚点附近的卡片应保持大致位置，右侧卡片应明显右移，体现以锚点为中心的缩放
    const anchorBoxAfter = await anchorCard!.boundingBox();
    const rightBoxAfter = await rightCard!.boundingBox();
    expect(anchorBoxAfter).not.toBeNull();
    expect(rightBoxAfter).not.toBeNull();
    expect(Math.abs(anchorBoxAfter!.x - anchorBoxBefore!.x)).toBeLessThan(30);
    expect(rightBoxAfter!.x - rightBoxBefore!.x).toBeGreaterThan(10);
  });

  test('触摸板水平滑动手势可平移画布', async ({ page }) => {
    // 创建间隔足够大的绝对事件，确保画布存在有效水平滚动范围；
    // 终点日期不要太靠年末，避免卡片超出渲染缓冲区导致 createAbsoluteEvent 可见性断言失败
    await createAbsoluteEvent(page, '早期事件', '2024-01-01');
    await createAbsoluteEvent(page, '晚期事件', '2024-12-15');

    const canvas = page.getByTestId('timeline-canvas');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    const beforeScroll = await canvas.evaluate((el) => el.scrollLeft);
    const maxScroll = await canvas.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(maxScroll).toBeGreaterThan(100);

    await canvas.evaluate(
      (el, { x, y }) => {
        el.dispatchEvent(
          new WheelEvent('wheel', {
            clientX: x,
            clientY: y,
            deltaX: 200,
            deltaY: 0,
            bubbles: true,
            cancelable: true,
          }),
        );
      },
      { x: canvasBox!.x + 50, y: canvasBox!.y + 50 },
    );

    const afterScroll = await canvas.evaluate((el) => el.scrollLeft);
    expect(afterScroll).toBeGreaterThan(beforeScroll + 50);
  });

  test('水平拖拽绝对事件卡片可更新其日期', async ({ page }) => {
    const originalDate = '2024-03-15';
    await createAbsoluteEvent(page, '锚定事件', '2024-01-01');
    await createAbsoluteEvent(page, '可移动事件', originalDate);

    // 明确选择目标卡片，避免 DOM 顺序依赖
    const card = page.locator('[data-event-id]').filter({ hasText: '可移动事件' });
    await expect(card).toBeVisible();

    const initialBox = await card.boundingBox();
    expect(initialBox).not.toBeNull();

    await card.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + initialBox!.width / 2 + 160, initialBox!.y + initialBox!.height / 2, { steps: 10 });
    await page.mouse.up();

    // 等待后端更新与布局重算
    await expect
      .poll(async () => (await card.boundingBox())?.x ?? 0)
      .toBeGreaterThan(initialBox!.x + 20);

    // 打开编辑对话框，验证日期已改变
    await card.dblclick();
    const dateInput = page.locator('input[type="date"]').first();
    await expect(dateInput).toBeVisible();
    const updatedDate = await dateInput.inputValue();
    expect(updatedDate).not.toBe(originalDate);
  });

  test('事件卡片可拖拽到另一轨道', async ({ page }) => {
    await createTrack(page, '支线');
    await createAbsoluteEvent(page, '跨轨道事件', '2024-05-01');

    const card = page.locator('[data-event-id]').first();
    await expect(card).toBeVisible();

    const beforeTrackId = await getCardTrackId(page, card);
    expect(beforeTrackId).not.toBeNull();

    const targetLane = page.getByTestId('track-lane').nth(1);
    const laneBox = await targetLane.boundingBox();
    expect(laneBox).not.toBeNull();

    await card.hover();
    await page.mouse.down();
    // 垂直移动到目标轨道中心并稍作停顿后释放
    const targetX = laneBox!.x + laneBox!.width / 2;
    const targetY = laneBox!.y + laneBox!.height / 2;
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    // 等待拖拽/退出动画结束，确保 DOM 中只剩一张卡片
    await expect.poll(async () => page.locator('[data-event-id]').count()).toBe(1);

    // 等待后端更新并断言轨道已变更
    await expect.poll(async () => getCardTrackId(page, card)).not.toBe(beforeTrackId);
  });
});
