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

test.describe('时间轴与剧本视图双向同步', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('剧本同步测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await skipOnboardingGuide(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('剧本视图按时间顺序列出事件并可跳转回时间轴选中该事件', async ({ page }) => {
    await createAbsoluteEvent(page, '早期事件', '2024-03-15');
    await createAbsoluteEvent(page, '晚期事件', '2024-09-20');

    // 导航到剧本视图
    await page.locator('nav a').filter({ hasText: /剧本|Script/ }).click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/script/);

    const items = page.getByTestId('script-event-item');
    await expect(items).toHaveCount(2);

    // 点击第二个事件，应跳转回时间轴并选中它
    const lateItem = items.filter({ hasText: '晚期事件' });
    await lateItem.click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);

    const selectedCard = page.locator('[data-event-id]').filter({ hasText: '晚期事件' });
    await expect(selectedCard).toBeVisible();
    await expect(selectedCard).toHaveAttribute('data-selected', 'true');
  });

  test('时间轴选中事件后切换到剧本视图应保持高亮', async ({ page }) => {
    await createAbsoluteEvent(page, '目标事件', '2024-06-01');

    const card = page.locator('[data-event-id]').filter({ hasText: '目标事件' });
    await card.click();
    await expect(card).toHaveAttribute('data-selected', 'true');

    await page.locator('nav a').filter({ hasText: /剧本|Script/ }).click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/script/);

    const item = page.getByTestId('script-event-item').filter({ hasText: '目标事件' });
    await expect(item).toBeVisible();
    await expect(item).toHaveAttribute('data-selected', 'true');
  });
});
