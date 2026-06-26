import { test, expect } from '@playwright/test';

test.describe('核心用户流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('核心流程测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
  });

  test('时间轴：添加事件并显示在轨道上', async ({ page }) => {
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('英雄登场');
    await page.getByTestId('event-save-btn').click();

    await expect(page.locator('[data-testid="event-title-input"]')).not.toBeVisible();
    await expect(page.locator('text=英雄登场')).toBeVisible();
  });

  test('地图：添加地点并编辑名称', async ({ page }) => {
    await page.locator('nav a').filter({ hasText: /地图|Map/ }).click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/map/);

    await page.getByTestId('add-location-btn').click();
    await page.getByTestId('location-name-input').fill('王城');
    await page.getByTestId('location-save-btn').click();

    await expect(page.locator('text=王城').first()).toBeVisible();
  });

  test('VN：创建场景并添加台词', async ({ page }) => {
    await page.locator('nav a').filter({ hasText: /VN|视觉小说/ }).click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/vn/);

    await page.getByTestId('add-scene-btn').click();
    await page.getByTestId('scene-title-input').fill('开场');
    await page.getByTestId('add-line-dialog-btn').click();
    await page.locator('[data-testid="line-text-input"]').first().fill('欢迎来到王城。');

    await expect(page.locator('text=欢迎来到王城。')).toBeVisible();
    await expect(page.locator('text=开场')).toBeVisible();
  });

  test('设置：切换语言并保存', async ({ page }) => {
    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/settings/);

    await page.getByTestId('lang-en').click();
    await page.getByTestId('settings-save-btn').click();

    await expect(page.locator('text=Settings').first()).toBeVisible();
  });

  test('设置：切换减少动画开关并保持可用', async ({ page }) => {
    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/settings/);

    const toggle = page.getByTestId('animations-enabled-toggle');
    await expect(toggle).toBeVisible();
    const initial = (await toggle.getAttribute('aria-checked')) ?? 'false';

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', initial === 'true' ? 'false' : 'true');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', initial);
  });

  test('世界观：添加历史条目', async ({ page }) => {
    await page.locator('nav a').filter({ hasText: /世界观|Worldbuilding/ }).click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/worldbuilding/);

    await page.locator('select').selectOption('history');

    await expect(page.getByTestId('lore-title-input').first()).toHaveValue(/新历史条目|New History entry/);
  });

  test('小说：导航到小说视图显示章节列表', async ({ page }) => {
    await page.getByRole('link', { name: '小说', exact: true }).click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/novel/);
    await expect(page.getByText('章节', { exact: true })).toBeVisible();
  });
});
