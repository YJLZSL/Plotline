import { test, expect } from '@playwright/test';

test.describe('设置页重构', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('设置页测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);

    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/settings/);
  });

  test('默认显示外观分组并包含主题、字体、动画等设置项', async ({ page }) => {
    await expect(page.getByTestId('settings-tab-panel-appearance')).toBeVisible();
    await expect(page.getByTestId('theme-card')).toBeVisible();
    await expect(page.getByTestId('font-theme-card')).toBeVisible();
    await expect(page.getByTestId('animations-card')).toBeVisible();
    await expect(page.getByTestId('accent-color-card')).toBeVisible();
    await expect(page.getByTestId('language-card')).toBeVisible();
  });

  test('侧边栏可切换全部分组', async ({ page }) => {
    const tabs = ['editor', 'ai', 'data', 'about'] as const;
    for (const tab of tabs) {
      await page.getByTestId(`settings-tab-${tab}`).click();
      await expect(page.getByTestId(`settings-tab-panel-${tab}`)).toBeVisible();
    }
  });

  test('每个设置项卡片显示中文说明', async ({ page }) => {
    // 通过实际中文文案验证说明存在；若文案变更，测试会失败提醒同步。
    await expect(page.locator('text=选择明亮、暗黑、护眼或方块主题')).toBeVisible();
    await expect(page.locator('text=一键切换无衬线、等宽、像素或得意黑字体组合')).toBeVisible();
    await expect(page.locator('text=关闭后将只保留配色，停止所有装饰动画').first()).toBeVisible();
  });

  test('搜索框可按关键词过滤设置项', async ({ page }) => {
    const searchInput = page.getByTestId('settings-search-input');
    // 使用“明亮”只匹配主题卡片，不匹配外观分组描述与动画卡片。
    await searchInput.fill('明亮');

    await expect(page.getByTestId('settings-search-results')).toBeVisible();
    await expect(page.getByTestId('theme-card')).toBeVisible();
    await expect(page.getByTestId('animations-card')).not.toBeVisible();
  });

  test('搜索无结果时显示空状态', async ({ page }) => {
    const searchInput = page.getByTestId('settings-search-input');
    await searchInput.fill('xyznonexistent');

    await expect(page.getByTestId('settings-search-results')).toBeVisible();
    await expect(page.locator('text=没有匹配的结果')).toBeVisible();
  });

  test('切换主题后即时预览并保存', async ({ page }) => {
    await page.getByTestId('theme-dark').click();
    await expect(page.getByTestId('theme-dark')).toHaveAttribute('class', /border-accent/);

    await page.getByTestId('settings-save-btn').click();
    await expect(page.locator('text=设置已保存').first()).toBeVisible();
  });

  test('切换字体主题后即时预览', async ({ page }) => {
    await page.getByTestId('font-theme-pixel').click();
    await expect(page.getByTestId('font-theme-pixel')).toHaveAttribute('class', /border-accent/);

    await page.getByTestId('settings-tab-editor').click();
    await expect(page.getByTestId('editor-font-card')).toBeVisible();
    const preview = page.getByTestId('font-preview').first();
    await expect(preview).toBeVisible();
  });

  test('动画开关可切换并即时反映在预览区', async ({ page }) => {
    const toggle = page.getByTestId('animations-enabled-toggle').first();
    const initial = (await toggle.getAttribute('aria-checked')) ?? 'true';

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', initial === 'true' ? 'false' : 'true');

    // 预览区域应始终可见
    await expect(page.locator('text=动效示例').first()).toBeVisible();
  });

  test('切换标签后搜索框清空', async ({ page }) => {
    const searchInput = page.getByTestId('settings-search-input');
    await searchInput.fill('备份');
    await expect(page.getByTestId('settings-search-results')).toBeVisible();

    await page.getByTestId('settings-tab-editor').click();
    await expect(searchInput).toHaveValue('');
    await expect(page.getByTestId('settings-tab-panel-editor')).toBeVisible();
  });
});
