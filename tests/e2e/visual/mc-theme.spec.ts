import { test, expect } from '@playwright/test';

/**
 * MC 主题视觉回归。
 * - 覆盖番茄钟默认/MC/运行状态、设置页 MC 全局主题、时间轴 MC 主题。
 * - 截图保存到 test-results/visual/，并通过 testInfo 附件附加。
 */

test.describe('MC 主题视觉回归', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('MC 主题视觉回归');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
  });

  test('番茄钟：默认状态截图', async ({ page }, testInfo) => {
    await page.getByTitle('番茄钟').click();
    await expect(page.locator('text=25:00')).toBeVisible();
    await page.waitForTimeout(300);

    const path = 'test-results/visual/16-pomodoro-default.png';
    await page.screenshot({ path });
    await testInfo.attach('pomodoro-default', { path, contentType: 'image/png' });
  });

  test('番茄钟：切换为 MC 主题截图', async ({ page }, testInfo) => {
    await page.getByTitle('番茄钟').click();
    await page.getByRole('button', { name: 'MC' }).click();
    await expect(page.getByTestId('mc-block-progress')).toBeVisible();
    await page.waitForTimeout(300);

    const path = 'test-results/visual/17-pomodoro-mc-theme.png';
    await page.screenshot({ path });
    await testInfo.attach('pomodoro-mc-theme', { path, contentType: 'image/png' });
  });

  test('番茄钟：运行 1.5 秒后截图', async ({ page }, testInfo) => {
    await page.getByTitle('番茄钟').click();
    await page.getByRole('button', { name: 'MC' }).click();
    await page.getByRole('button', { name: /开始|Start/ }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByRole('button', { name: /暂停|Pause/ })).toBeVisible();

    const path = 'test-results/visual/18-pomodoro-running.png';
    await page.screenshot({ path });
    await testInfo.attach('pomodoro-running', { path, contentType: 'image/png' });
  });

  test('设置页：切换为 MC 全局主题截图', async ({ page }, testInfo) => {
    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/settings/);

    await page.getByTestId('theme-mc').click();
    await page.getByTestId('settings-save-btn').click();
    await page.waitForTimeout(400);

    const path = 'test-results/visual/19-settings-mc-theme.png';
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach('settings-mc-theme', { path, contentType: 'image/png' });
  });

  test('时间轴：MC 全局主题下截图', async ({ page }, testInfo) => {
    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).first().click();
    await page.getByTestId('theme-mc').click();
    await page.getByTestId('settings-save-btn').click();

    await page.locator('nav a').filter({ hasText: /时间轴|Timeline/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await page.waitForTimeout(400);

    const path = 'test-results/visual/20-timeline-mc-theme.png';
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach('timeline-mc-theme', { path, contentType: 'image/png' });
  });
});
