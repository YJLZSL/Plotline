import { test, expect } from '@playwright/test';

/**
 * 发布前可视化点击回归。
 * - 真实启动 Chromium，按用户视角依次操作：欢迎页 → 创建工作区 → 切换主视图 →
 *   打开设置关于页 → 点击"立即检查"。
 * - 每一步落盘一张全屏截图到 `test-results/visual/`，便于人工核验。
 */

test.describe('Plotline 发布前可视化点击回归', () => {
  test('完整用户旅程：欢迎 → 工作区 → 多视图 → 设置 → 检查更新', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2')).toContainText(/工作区|Workspace/);
    await page.screenshot({ path: 'test-results/visual/01-welcome.png', fullPage: true });

    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('发布回归');
    await page.screenshot({ path: 'test-results/visual/02-create-dialog.png', fullPage: true });
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);

    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/visual/03-timeline.png', fullPage: true });

    await page.locator('nav a').filter({ hasText: /角色|Characters/ }).first().click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/visual/04-characters.png', fullPage: true });

    await page.locator('nav a').filter({ hasText: /大纲|Outline/ }).first().click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/visual/05-outline.png', fullPage: true });

    await page.locator('nav a').filter({ hasText: /统计|Statistics/ }).first().click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/visual/06-statistics.png', fullPage: true });

    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).first().click();
    await page.getByRole('button', { name: /关于|About/ }).click();
    await expect(page.locator('text=/v\\d+\\.\\d+\\.\\d+/').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/visual/07-settings-about.png', fullPage: true });

    await page.getByRole('button', { name: /立即检查|Check Now/ }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/visual/08-update-check.png', fullPage: true });
  });
});
