import { test, expect } from '@playwright/test';

test.describe('Plotline UI 回归', () => {
  test('品牌标记应在工作区选择器顶部渲染', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2')).toContainText(/工作区|Workspace/);
    const brandMarks = page.locator('svg', { has: page.locator('title', { hasText: 'Plotline' }) });
    await expect(brandMarks.first()).toBeVisible();
  });

  test('创建工作区后侧边栏导航应包含全部入口', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('Sidebar 测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);

    const navLinks = page.locator('nav a');
    await expect(navLinks).toHaveCount(12);
    await expect(page.locator('nav a').filter({ hasText: /AI 创作|AI Studio/ })).toBeVisible();
  });

  test('设置 → 关于 应显示当前版本号与"检查更新"按钮', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('Settings 测试');
    await page.getByTestId('workspace-submit').click();

    await page.locator('nav a[title], nav a').filter({ hasText: /设置|Settings/ }).click();
    await page.getByRole('button', { name: /关于|About/ }).click();
    await expect(page.locator('text=/v\\d+\\.\\d+\\.\\d+/').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /立即检查|Check Now/ })).toBeVisible();
  });
});
