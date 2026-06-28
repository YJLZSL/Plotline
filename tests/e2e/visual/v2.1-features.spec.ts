import { test, expect } from '@playwright/test';

/**
 * v2.1.0 新功能可视化回归。
 * - 覆盖 MC 全局主题、按功能 AI 助手、统计新图表（思维导图/脑状图/树状图）。
 * - 每步生成截图保存到 `test-results/visual/`，便于发布前人工核验。
 */

test.describe('Plotline v2.1 功能可视化回归', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('v2.1 功能回归');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
  });

  test('统计：空状态 → 添加数据 → 切换思维导图 / 脑状图 / 树状图', async ({ page }) => {
    // 添加一个角色
    await page.locator('nav a').filter({ hasText: /角色|Characters/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/characters/);
    await page.locator('button', { hasText: /添加角色|添加第一个角色/ }).first().click();
    await page.getByTestId('character-name-input').fill('主角');
    await page.getByTestId('character-save-btn').click();
    await expect(page.locator('text=主角').first()).toBeVisible();

    // 添加一个大纲卷
    await page.locator('nav a').filter({ hasText: /大纲|Outline/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/outline/);
    await page.locator('button', { hasText: /添加卷/ }).first().click();
    await page.getByTestId('outline-title-input').fill('第一卷');
    await page.getByTestId('outline-save-btn').click();
    await expect(page.locator('text=第一卷').first()).toBeVisible();

    // 添加一个时间轴事件，让统计概览进入图表模式
    await page.locator('nav a').filter({ hasText: /时间轴|Timeline/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('英雄登场');
    await page.getByTestId('event-save-btn').click();
    await expect(page.locator('text=英雄登场').first()).toBeVisible();

    // 进入统计视图并切换标签页
    await page.locator('nav a').filter({ hasText: /统计|Statistics/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/statistics/);
    await page.getByTestId('stats-tab-overview').click();
    await page.screenshot({ path: 'test-results/visual/09-statistics-overview.png', fullPage: true });

    await page.getByTestId('stats-tab-mindmap').click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'test-results/visual/10-statistics-mindmap.png', fullPage: true });

    await page.getByTestId('stats-tab-brain').click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'test-results/visual/11-statistics-brain.png', fullPage: true });

    await page.getByTestId('stats-tab-tree').click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'test-results/visual/12-statistics-tree.png', fullPage: true });
  });

  test('AI 助手：启用后打开面板并加载功能建议', async ({ page }) => {
    // 在设置中启用 AI
    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/settings/);
    await page.getByTestId('settings-tab-ai').click();
    await page.getByTestId('ai-enabled-toggle').click();
    await page.getByTestId('settings-save-btn').click();

    // 回到角色视图，选中角色后点击 AI 工具栏
    await page.locator('nav a').filter({ hasText: /角色|Characters/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/characters/);
    await page.locator('button', { hasText: /添加角色|添加第一个角色/ }).first().click();
    await page.getByTestId('character-name-input').fill('AI 测试角色');
    await page.getByTestId('character-save-btn').click();
    await expect(page.locator('text=AI 测试角色').first()).toBeVisible();

    // 选中角色卡片
    await page.locator('text=AI 测试角色').first().click();

    await page.getByTestId('ai-toolbar-btn').click();
    await expect(page.getByTestId('ai-assistant-panel')).toBeVisible();
    await expect(page.locator('[data-testid^="ai-suggestion-"]').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/visual/13-ai-panel.png', fullPage: true });

    // 点击第一个建议，直接发送消息并清空输入框
    const firstSuggestion = page.locator('[data-testid^="ai-suggestion-"]').first();
    await firstSuggestion.click();
    await expect(page.locator('textarea')).toHaveValue('');
    await page.screenshot({ path: 'test-results/visual/14-ai-suggestion.png', fullPage: true });
  });

  test('MC 全局主题：切换后截图时间轴', async ({ page }) => {
    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/settings/);
    await page.getByTestId('theme-mc').click();
    await page.getByTestId('settings-save-btn').click();

    await page.locator('nav a').filter({ hasText: /时间轴|Timeline/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'test-results/visual/15-timeline-mc-theme.png', fullPage: true });
  });
});
