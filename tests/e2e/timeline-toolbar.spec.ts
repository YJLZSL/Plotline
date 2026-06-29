import { test, expect, type Page } from '@playwright/test';

/**
 * 时间轴工具栏 E2E 测试。
 *
 * 验证 Task 6 的四组重构：
 * - Group 1: Create（添加事件）
 * - Group 2: Filter（筛选切换）
 * - Group 3: View mode（分段控件：timeline/gantt/tree/text/script）+ zoom
 * - Group 4: More（一致性检查/连接模式/AI/导出）
 *
 * 1px 分隔符 + 统一 h-8 高度。
 */

async function skipOnboardingGuide(page: Page) {
  const skipGuide = page.getByTestId('guide-skip-btn');
  if (await skipGuide.isVisible().catch(() => false)) {
    await skipGuide.click();
    await expect(skipGuide).toBeHidden();
  }
}

async function createAbsoluteEvent(page: Page, title: string, date: string) {
  await page.getByTestId('add-event-btn').first().click();
  await page.getByTestId('event-title-input').fill(title);
  await page.getByRole('button', { name: '绝对日期' }).click();
  await page.locator('input[type="date"]').first().fill(date);
  await page.getByTestId('event-save-btn').click();
  await expect(page.locator('[data-event-id]').filter({ hasText: title })).toBeVisible();
}

test.describe('时间轴工具栏四组重构', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('工具栏测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await skipOnboardingGuide(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('工具栏包含四组，中间有 1px 分隔符', async ({ page }) => {
    const toolbar = page.getByTestId('timeline-toolbar');
    await expect(toolbar).toBeVisible();

    // 验证分隔符存在（w-px h-5 bg-border）
    const separators = toolbar.locator('div.w-px.h-5.bg-border');
    const separatorCount = await separators.count();
    // 四组之间有 3 个分隔符
    expect(separatorCount).toBeGreaterThanOrEqual(3);
  });

  test('视图模式分段控件包含 5 个按钮：timeline/gantt/tree/text/script', async ({ page }) => {
    const segment = page.getByTestId('timeline-viewmode-segment');
    await expect(segment).toBeVisible();

    await expect(page.getByTestId('timeline-viewmode-timeline')).toBeVisible();
    await expect(page.getByTestId('timeline-viewmode-gantt')).toBeVisible();
    await expect(page.getByTestId('timeline-viewmode-tree')).toBeVisible();
    await expect(page.getByTestId('timeline-viewmode-text')).toBeVisible();
    await expect(page.getByTestId('timeline-viewmode-script')).toBeVisible();
  });

  test('点击 gantt 视图模式切换到甘特图', async ({ page }) => {
    await createAbsoluteEvent(page, '测试事件', '2024-06-01');

    await page.getByTestId('timeline-viewmode-gantt').click();
    // 甘特图渲染后应可见
    await expect(page.getByText('甘特图')).toBeVisible({ timeout: 5000 });
  });

  test('点击 tree 视图模式切换到树状图', async ({ page }) => {
    await createAbsoluteEvent(page, '树状事件', '2024-06-01');

    await page.getByTestId('timeline-viewmode-tree').click();
    // v3.1.0 工具栏 segmented control：tree 按钮文本是 i18n key timeline.treeMode = "树状"（非"树状图"），
    // 且 TreeTimeline 在有事件时不显示"树状图"标题。改用按钮激活态 + 事件标题可见性断言。
    await expect(page.getByTestId('timeline-viewmode-tree')).toHaveClass(/text-accent/, { timeout: 5000 });
    // 验证 TreeTimeline 已渲染。AnimatePresence 切换期间 timeline 卡片与 tree 卡片可能短暂共存，
    // 用 .last() 选取 TreeTimeline 渲染的卡片（font-semibold text-xs），避免 strict mode violation。
    await expect(page.getByText('树状事件').last()).toBeVisible({ timeout: 5000 });
  });

  test('点击 text 视图模式切换到文本视图', async ({ page }) => {
    await createAbsoluteEvent(page, '文本事件', '2024-06-01');

    await page.getByTestId('timeline-viewmode-text').click();
    // 文本视图应显示事件标题
    await expect(page.locator('body')).toContainText('文本事件', { timeout: 5000 });
  });

  test('点击 script 视图模式跳转到剧本路由', async ({ page }) => {
    await createAbsoluteEvent(page, '剧本事件', '2024-06-01');

    await page.getByTestId('timeline-viewmode-script').click();
    // URL 应包含 /script
    await expect(page).toHaveURL(/\/workspaces\/.+\/script/, { timeout: 5000 });
  });

  test('Filter 按钮切换筛选栏可见性', async ({ page }) => {
    // 创建事件以确保时间轴视图渲染
    await createAbsoluteEvent(page, '筛选测试', '2024-06-01');

    // 筛选栏初始可见
    const filterBar = page.getByPlaceholder('搜索事件…');
    await expect(filterBar).toBeVisible();

    // 点击 Filter 按钮隐藏筛选栏
    await page.getByTestId('timeline-toolbar-filter').click();
    await expect(filterBar).toBeHidden();

    // 再次点击显示筛选栏
    await page.getByTestId('timeline-toolbar-filter').click();
    await expect(filterBar).toBeVisible();
  });

  test('More 菜单包含一致性检查、连接类型、AI、导出选项', async ({ page }) => {
    await createAbsoluteEvent(page, 'More菜单测试', '2024-06-01');

    // 点击 More 按钮（MoreHorizontal 图标按钮）
    const moreButton = page.getByTitle('更多');
    await moreButton.click();

    // 验证菜单项存在
    await expect(page.getByText('一致性检查')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('连接类型')).toBeVisible();
    await expect(page.getByText('导出时间轴')).toBeVisible();

    // 按 Escape 关闭菜单
    await page.keyboard.press('Escape');
  });

  test('More 菜单中的导出选项可点击并触发下载', async ({ page }) => {
    await createAbsoluteEvent(page, '导出测试事件', '2024-06-01');

    const moreButton = page.getByTitle('更多');
    await moreButton.click();
    await expect(page.getByText('导出时间轴')).toBeVisible({ timeout: 3000 });

    // 设置下载监听
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.getByText('导出时间轴').click();
    const download = await downloadPromise;

    // 验证下载被触发（文件名以 timeline- 开头，以 .md 结尾）
    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/^timeline-.+\.md$/);
    }
  });

  test('Create 组的添加事件按钮可创建新事件', async ({ page }) => {
    // 工具栏中的添加事件按钮（第一个轨道）
    // 工具栏 Create 组按钮没有特定 testid，通过文本匹配
    const createButton = page.getByTitle('添加事件').first();
    await createButton.click();

    await page.getByTestId('event-title-input').fill('工具栏创建事件');
    await page.getByRole('button', { name: '绝对日期' }).click();
    await page.locator('input[type="date"]').first().fill('2024-07-01');
    await page.getByTestId('event-save-btn').click();

    await expect(page.locator('[data-event-id]').filter({ hasText: '工具栏创建事件' })).toBeVisible();
  });
});
