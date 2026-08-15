import { test, expect } from '@playwright/test';

test.describe('番茄钟 × 写作闭环', () => {
  test('设置每日目标后番茄钟展示写作目标进度', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('写作闭环测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);

    const skipGuide = page.getByTestId('guide-skip-btn');
    if (await skipGuide.isVisible().catch(() => false)) {
      await skipGuide.click();
    }

    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/settings/);
    await page.getByTestId('settings-tab-data').click();
    await page.getByTestId('daily-writing-target-input').fill('1200');
    await page.getByTestId('weekly-writing-target-input').fill('8400');

    await page.getByRole('button', { name: /番茄钟/ }).click();
    const goal = page.getByTestId('pomodoro-writing-goal');
    await expect(goal).toBeVisible();
    await expect(goal).toContainText('1200');
    await expect(goal).toContainText('0 / 1200');
  });
});
