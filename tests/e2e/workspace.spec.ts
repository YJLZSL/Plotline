import { test, expect } from '@playwright/test';

test.describe('工作区选择器', () => {
  test('应显示空状态并引导创建第一个工作区', async ({ page }) => {
    await page.goto('/');
    // 等待应用加载
    await expect(page.locator('h2')).toContainText(/工作区/);
  });

  test('应能创建新工作区并跳转到时间轴', async ({ page }) => {
    await page.goto('/');
    // 点击新建按钮
    await page.getByTestId('create-workspace-btn').click();
    // 填写名称
    await page.getByTestId('workspace-name-input').fill('E2E 测试故事');
    // 提交
    await page.getByTestId('workspace-submit').click();
    // 应跳转到时间轴视图
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
  });
});
