import { test, expect } from '@playwright/test';

/**
 * 发布前可视化点击回归。
 * - 真实启动 Chromium，按用户视角依次操作：欢迎页 → 创建工作区 → 切换 4 个主视图 →
 *   打开设置关于页 → 点击"立即检查"。
 * - 每一步落盘一张全屏截图到 `test-results/visual/`，便于人工核验。
 */

test.describe('Plotline v1.1 — 发布前可视化点击回归', () => {
  test('完整用户旅程：欢迎 → 工作区 → 四视图 → 设置 → 检查更新', async ({ page }) => {
    // 步骤 1：欢迎页（工作区选择器）
    await page.goto('/');
    await expect(page.locator('h2')).toContainText(/工作区/);
    await page.screenshot({
      path: 'test-results/visual/01-welcome.png',
      fullPage: true,
    });

    // 步骤 2：创建工作区
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('发布回归 v1.1');
    await page.screenshot({
      path: 'test-results/visual/02-create-dialog.png',
      fullPage: true,
    });
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);

    // 步骤 3：时间线视图
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/visual/03-timeline.png',
      fullPage: true,
    });

    // 步骤 4：角色视图
    await page.locator('nav a').filter({ hasText: '角色' }).click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/visual/04-characters.png',
      fullPage: true,
    });

    // 步骤 5：大纲视图
    await page.locator('nav a').filter({ hasText: '大纲' }).click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/visual/05-outline.png',
      fullPage: true,
    });

    // 步骤 6：统计视图
    await page.locator('nav a').filter({ hasText: '统计' }).click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'test-results/visual/06-statistics.png',
      fullPage: true,
    });

    // 步骤 7：设置 → 关于 → 检查更新
    await page.locator('nav a').filter({ hasText: '设置' }).click();
    await page.getByRole('button', { name: '关于' }).click();
    await expect(page.locator('text=v1.1.0').first()).toBeVisible();
    await page.screenshot({
      path: 'test-results/visual/07-settings-about.png',
      fullPage: true,
    });

    await page.getByRole('button', { name: /立即检查/ }).click();
    // Web 模式下 stub 立即返回 "已是最新版本"
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'test-results/visual/08-update-check.png',
      fullPage: true,
    });
  });
});
