import { test, expect, type Page } from '@playwright/test';

/**
 * 主题一致性视觉回归测试（Task 8.4）。
 *
 * 在 light/sepia/dark/MC 四主题下分别截图时间轴、AI 面板、设置页、Sidebar，
 * 验证：
 * 1. 截图不为空（`buffer.length > 0`）
 * 2. 关键元素在四主题下都可见（`toBeVisible`）
 *
 * 如发现某主题下元素不可见或样式异常，记录在测试注释中（不修复，仅记录）。
 *
 * 已知关注点（人工核验时重点检查）：
 * - MC 主题下时间轴卡片背景色与轨道色条的对比度
 * - dark 主题下连接线 SVG 的可见性
 * - sepia 主题下输入框边框的可辨识度
 *
 * 如后端 dev server 不可用，测试自动 skip 而非 fail。
 */

const THEMES = ['light', 'sepia', 'dark', 'mc'] as const;
type Theme = (typeof THEMES)[number];

let backendAvailable = false;

test.beforeAll(async ({ request }) => {
  try {
    const response = await request.get('/', { timeout: 5000 });
    backendAvailable = response.ok();
  } catch {
    backendAvailable = false;
  }
});

test.beforeEach(async () => {
  test.skip(!backendAvailable, '后端 dev server 不可用，跳过主题一致性测试');
});

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

/** 在设置页切换到指定主题并保存 */
async function switchTheme(page: Page, theme: Theme) {
  await page.locator('nav a').filter({ hasText: /设置|Settings/ }).first().click();
  await expect(page).toHaveURL(/\/workspaces\/.+\/settings/);
  // 确保切到外观 tab（ThemeSelector 仅在 appearance tab 渲染；
  // 上一个测试可能停留在 AI tab，导致 theme-* 按钮找不到）
  await page.getByTestId('settings-tab-appearance').click();
  await page.getByTestId(`theme-${theme}`).click();
  // 主题点击即通过 applyToDOM 即时生效；save 仅持久化到后端。
  // 当点击的主题已是保存的主题时，draft 无变化，save 按钮 disabled —— 此时跳过保存。
  const saveBtn = page.getByTestId('settings-save-btn');
  if (await saveBtn.isEnabled().catch(() => false)) {
    await saveBtn.click();
  }
  await page.waitForTimeout(300);
}

test.describe('主题一致性视觉回归', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('主题一致性测试');
    await page.getByTestId('workspace-submit').click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
    await skipOnboardingGuide(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('should 四主题下时间轴与 Sidebar 关键元素可见 when 逐主题截图', async ({ page }) => {
    // 先创建一个事件，确保时间轴有内容
    await createAbsoluteEvent(page, '主题测试事件', '2024-06-01');

    for (const theme of THEMES) {
      // 切换主题
      await switchTheme(page, theme);

      // 回到时间轴
      await page.locator('nav a').filter({ hasText: /时间轴|Timeline/ }).first().click();
      await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
      await page.waitForTimeout(200);

      // 验证 Sidebar 可见
      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();

      // 验证时间轴关键元素可见
      await expect(page.getByTestId('timeline-canvas')).toBeVisible();
      await expect(page.getByTestId('timeline-ruler')).toBeVisible();
      await expect(page.getByTestId('timeline-toolbar')).toBeVisible();

      // 验证事件卡片可见
      await expect(
        page.locator('[data-event-id]').filter({ hasText: '主题测试事件' }),
      ).toBeVisible();

      // 截图
      const buffer = await page.screenshot({
        path: `test-results/visual/theme-${theme}-timeline.png`,
        fullPage: true,
      });
      expect(buffer.length).toBeGreaterThan(0);
    }
  });

  test('should 四主题下 AI 面板关键元素可见 when 逐主题截图', async ({ page }) => {
    // 在设置中启用 AI
    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).first().click();
    await expect(page).toHaveURL(/\/workspaces\/.+\/settings/);
    await page.getByTestId('settings-tab-ai').click();
    const aiToggle = page.getByTestId('ai-enabled-toggle');
    const aiChecked = await aiToggle.getAttribute('aria-checked');
    if (aiChecked !== 'true') {
      await aiToggle.click();
      await page.getByTestId('settings-save-btn').click();
      await page.waitForTimeout(200);
    }

    for (const theme of THEMES) {
      // 切换主题
      await switchTheme(page, theme);

      // 回到时间轴
      await page.locator('nav a').filter({ hasText: /时间轴|Timeline/ }).first().click();
      await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
      await page.waitForTimeout(200);

      // 点击 AI 助手按钮打开面板
      const aiButton = page.getByTitle('AI 助手');
      await aiButton.click();
      await page.waitForTimeout(300);

      // 验证 AI 面板可见
      await expect(page.getByTestId('ai-assistant-panel')).toBeVisible();

      // 截图
      const buffer = await page.screenshot({
        path: `test-results/visual/theme-${theme}-ai-panel.png`,
        fullPage: true,
      });
      expect(buffer.length).toBeGreaterThan(0);

      // 关闭 AI 面板以便下一轮操作。
      // AI 面板打开时会渲染 z-30 backdrop（fixed inset-0 bg-black/10）拦截指针事件，
      // 再次点击 aiButton 会被 backdrop 拦截。backdrop 自身 onClick={onClose}，
      // 因此直接点击 backdrop 即可关闭面板。
      await page.locator('div.fixed.inset-0.z-30').click();
      await page.waitForTimeout(200);
    }
  });

  test('should 四主题下设置页关键元素可见 when 逐主题截图', async ({ page }) => {
    for (const theme of THEMES) {
      // 切换主题
      await switchTheme(page, theme);

      // 验证设置页关键元素可见
      await expect(page.getByTestId('theme-card')).toBeVisible();
      await expect(page.getByTestId('font-theme-card')).toBeVisible();
      await expect(page.getByTestId('animations-card')).toBeVisible();

      // 验证当前主题被选中
      await expect(page.getByTestId(`theme-${theme}`)).toHaveAttribute('class', /border-accent/);

      // 截图
      const buffer = await page.screenshot({
        path: `test-results/visual/theme-${theme}-settings.png`,
        fullPage: true,
      });
      expect(buffer.length).toBeGreaterThan(0);
    }
  });

  test('should 四主题下 Sidebar 导航项全部可见 when 逐主题截图', async ({ page }) => {
    for (const theme of THEMES) {
      // 切换主题
      await switchTheme(page, theme);

      // 回到时间轴（Sidebar 在所有工作区视图中都可见）
      await page.locator('nav a').filter({ hasText: /时间轴|Timeline/ }).first().click();
      await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
      await page.waitForTimeout(200);

      // 验证 Sidebar 导航项可见
      // 工作区视图组
      await expect(page.locator('nav a').filter({ hasText: /时间轴|Timeline/ }).first()).toBeVisible();
      await expect(page.locator('nav a').filter({ hasText: /角色|Characters/ }).first()).toBeVisible();
      await expect(page.locator('nav a').filter({ hasText: /大纲|Outline/ }).first()).toBeVisible();

      // 创作辅助组
      await expect(page.locator('nav a').filter({ hasText: /AI 创作|AI/ }).first()).toBeVisible();

      // 系统组
      await expect(page.locator('nav a').filter({ hasText: /统计|Statistics/ }).first()).toBeVisible();
      await expect(page.locator('nav a').filter({ hasText: /设置|Settings/ }).first()).toBeVisible();

      // 截图 Sidebar 区域
      const sidebar = page.locator('aside').first();
      const buffer = await sidebar.screenshot({
        path: `test-results/visual/theme-${theme}-sidebar.png`,
      });
      expect(buffer.length).toBeGreaterThan(0);
    }
  });
});
