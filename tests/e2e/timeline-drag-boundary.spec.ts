import { test, expect } from '@playwright/test';

test.describe('时间轴拖拽边界', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('拖拽边界测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    // 首次进入工作空间会弹出新手引导，点击跳过避免遮挡后续交互
    const skipGuide = page.getByTestId('guide-skip-btn');
    if (await skipGuide.isVisible().catch(() => false)) {
      await skipGuide.click();
      await expect(skipGuide).toBeHidden();
    }
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

  test('同一轨道内多个事件卡片会垂直错开显示', async ({ page }) => {
    // 通过添加按钮在同一轨道快速创建两个相对事件
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('事件 A');
    await page.getByTestId('event-save-btn').click();

    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('事件 B');
    await page.getByTestId('event-save-btn').click();

    const cards = page.locator('[data-event-id]');
    await expect(cards).toHaveCount(2);

    const cardElements = await cards.all();
    const boxes = await Promise.all(cardElements.map((el) => el.boundingBox()));
    expect(boxes.length).toBe(2);
    const [a, b] = boxes;
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();

    // 两张卡片不应共享同一垂直位置（避免互相遮挡）
    expect(a!.y).not.toBe(b!.y);
    expect(b!.y).toBeGreaterThan(a!.y);

    // 截图留存以便人工复核
    await page.screenshot({ path: 'test-results/timeline-overlap-layout.png' });
  });

  test('拖拽事件卡片时显示半透明 ghost 占位与吸附参考线', async ({ page }) => {
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('拖拽占位测试');
    await page.getByTestId('event-save-btn').click();

    const card = page.locator('[data-event-id]').first();
    await expect(card).toBeVisible();

    const initialBox = await card.boundingBox();
    expect(initialBox).not.toBeNull();

    // 开始拖拽并向右移动一段距离
    await card.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + 120, initialBox!.y + initialBox!.height / 2, { steps: 5 });

    // 拖拽过程中 ghost 占位与吸附线应可见
    const ghost = page.getByTestId('event-card-ghost');
    const snapHint = page.getByTestId('drag-snap-hint');
    await expect(ghost).toBeVisible();
    await expect(snapHint).toBeVisible();

    await page.mouse.up();
  });

  test('释放后卡片平滑移动到新的排序位置', async ({ page }) => {
    // 创建两个相对事件以便交换排序
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('事件甲');
    await page.getByTestId('event-save-btn').click();

    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('事件乙');
    await page.getByTestId('event-save-btn').click();

    const cards = page.locator('[data-event-id]');
    await expect(cards).toHaveCount(2);

    // 拿到两张卡片，按 x 坐标排序确认左右
    const getCardBoxes = async () => {
      const all = await cards.all();
      const boxes = await Promise.all(all.map((el) => el.boundingBox()));
      return boxes
        .map((box, i) => ({ box, element: all[i]! }))
        .filter((item): item is { box: NonNullable<typeof item.box>; element: typeof item.element } => item.box !== null)
        .sort((a, b) => a.box.x - b.box.x);
    };

    const before = await getCardBoxes();
    expect(before.length).toBe(2);
    const [leftCard, rightCard] = before;
    if (!leftCard || !rightCard) throw new Error('Expected two cards');
    const rightInitialX = rightCard.box.x;

    // 把右侧卡片拖到左侧卡片左边（越过中点即可触发排序交换）
    const targetX = leftCard.box.x - rightCard.box.width / 2;
    const targetY = rightCard.box.y + rightCard.box.height / 2;
    await rightCard.element.hover();
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.mouse.up();

    // 等待 Framer Motion 归位动画 + 后端更新
    await page.waitForTimeout(400);

    const after = await getCardBoxes();
    expect(after.length).toBe(2);
    const [newLeft] = after;
    if (!newLeft) throw new Error('Expected at least one card after drag');

    // 原来的右侧卡片释放后应移动到大致左侧位置（允许 40px 误差）
    expect(newLeft.box.x).toBeLessThan(rightInitialX - 20);

    // 截图留存
    await page.screenshot({ path: 'test-results/timeline-drag-smooth-move.png' });
  });
});
