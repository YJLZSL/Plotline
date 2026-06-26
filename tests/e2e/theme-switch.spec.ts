import { test, expect } from '@playwright/test';

test.describe('主题切换视觉回归', () => {
  test('设置页主题卡片切换后应渲染对应主题', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('Theme 测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);

    await page.locator('nav a[title], nav a').filter({ hasText: /设置|Settings/ }).click();
    await page.getByRole('button', { name: /外观|Appearance/ }).click();

    const themes = ['light', 'dark', 'sepia', 'mc'] as const;
    for (const theme of themes) {
      await page.getByTestId(`theme-${theme}`).click();
      await expect(page.getByTestId(`theme-${theme}`)).toHaveAttribute('class', /border-accent/);
      await page.screenshot({
        path: `tests/e2e/__screenshots__/settings-theme-${theme}.png`,
        fullPage: false,
      });
    }
  });
});
