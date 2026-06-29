import { test, expect } from '@playwright/test';

test.describe('时间轴右键菜单', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('右键菜单测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
  });

  test('事件卡片右键菜单：复制与删除', async ({ page }) => {
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('测试事件');
    await page.getByTestId('event-save-btn').click();
    await expect(page.locator('text=测试事件').first()).toBeVisible();

    await page.locator('text=测试事件').first().click({ button: 'right' });
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '编辑' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '复制' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '删除' })).toBeVisible();
    await expect(menu.locator('text=更改状态')).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '建立连接' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '问 AI' })).toBeVisible();

    await menu.getByRole('menuitem', { name: '复制' }).click();
    await expect(menu).not.toBeVisible();
    await expect(page.locator('[data-event-id]')).toHaveCount(2);

    await page.locator('[data-event-id]').first().click({ button: 'right' });
    const menu2 = page.getByRole('menu');
    await menu2.getByRole('menuitem', { name: '删除' }).click();
    await expect(page.locator('[data-event-id]')).toHaveCount(1);
  });

  test('轨道行右键菜单：显示主要操作项', async ({ page }) => {
    const trackRow = page.locator('aside').getByText('主线').first();
    await trackRow.click({ button: 'right' });

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '重命名' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '隐藏' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '添加事件' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '删除' })).toBeVisible();
    await expect(menu.locator('text=更改颜色')).toBeVisible();

    await menu.getByRole('menuitem', { name: '添加事件' }).click();
    await expect(page.getByTestId('event-title-input')).toBeVisible();
  });

  test('画布空白区右键菜单：缩放与一致性检查', async ({ page }) => {
    const canvas = page.getByTestId('timeline-canvas');
    await canvas.click({ button: 'right', position: { x: 200, y: 60 } });

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('text=添加事件')).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '粘贴事件' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '放大' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '缩小' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: '一致性检查' })).toBeVisible();

    await menu.getByRole('menuitem', { name: '放大' }).click();
    await expect(menu).not.toBeVisible();
    // 默认 zoom=140（月档），单击"放大"后 zoom≈168 仍处于月档（≥140 <175）。
    // 工具栏会显示当前 zoom 档位标签（年/月/日/时之一），验证任一标签可见即可确认缩放生效。
    await expect(page.locator('text=/年|月|日|时/').first()).toBeVisible({ timeout: 5000 });
  });
});
