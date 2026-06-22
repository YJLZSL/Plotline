import { test, expect } from '@playwright/test';

test.describe('Plotline v1.1 — 视觉与导航回归', () => {
  test('品牌标记应在工作区选择器顶部渲染', async ({ page }) => {
    await page.goto('/');
    // 等待应用加载
    await expect(page.locator('h2')).toContainText(/工作区/);
    // BrandMark 通过 <title>Plotline</title> 提供无障碍标签
    const brandMarks = page.locator('svg', { has: page.locator('title', { hasText: 'Plotline' }) });
    await expect(brandMarks.first()).toBeVisible();
  });

  test('创建工作区后侧边栏导航应包含 6 个入口', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('Sidebar 测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);

    const navLinks = page.locator('nav a');
    await expect(navLinks).toHaveCount(6);
  });

  test('设置 → 关于 应显示 v1.3.0 与"检查更新"按钮', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('Settings 测试');
    await page.getByTestId('workspace-submit').click();

    // 通过侧边栏跳到设置
    await page.locator('nav a[title], nav a').filter({ hasText: '设置' }).click();
    // 切换到 "关于" 标签
    await page.getByRole('button', { name: '关于' }).click();
    await expect(page.locator('text=v1.3.0').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /立即检查/ })).toBeVisible();
  });
});
