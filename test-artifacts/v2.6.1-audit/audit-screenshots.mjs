import { chromium } from '../../node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/index.mjs';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('test-artifacts', 'v2.6.1-audit');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const screenshot = async (page, name, opts = {}) => {
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false, ...opts });
  console.log('saved', p);
  return p;
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. 进入应用并创建工作区
    await page.goto('http://localhost:1420/');
    await page.waitForSelector('[data-testid="create-workspace-btn"]', { timeout: 15000 });
    await page.getByTestId('create-workspace-btn').click();
    await page.getByTestId('workspace-name-input').fill('v2.6.1 UI 审计');
    await page.getByTestId('workspace-submit').click();
    await page.waitForURL(/\/workspaces\/.+\/timeline/, { timeout: 15000 });
    await page.waitForTimeout(800);

    // 2. 时间轴：添加多个轨道和事件
    // 添加一条新轨道
    await page.getByPlaceholder('添加轨道').fill('副线');
    await page.getByPlaceholder('添加轨道').press('Enter');
    await page.waitForTimeout(400);

    // 在主轨道添加绝对事件
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('主线关键事件绝对日期');
    // 切换到绝对日期
    await page.locator('button:has-text("绝对")').click();
    await page.locator('input[type="date"]').fill('2024-06-15');
    await page.getByTestId('event-save-btn').click();
    await page.waitForTimeout(400);

    // 添加相对事件（会显示“相对”标签）
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('相对事件相对标签');
    await page.getByTestId('event-save-btn').click();
    await page.waitForTimeout(400);

    // 再添加一个长标题事件，测试卡片拥挤
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('这是一个非常长的标题用于测试事件卡片内部拥挤问题');
    await page.getByTestId('event-save-btn').click();
    await page.waitForTimeout(400);

    // 添加一个今天的事件，使 Today 标记出现
    await page.getByTestId('add-event-btn').first().click();
    await page.getByTestId('event-title-input').fill('今天发生的事件');
    await page.locator('button:has-text("绝对")').click();
    await page.locator('input[type="date"]').fill('2026-06-27');
    await page.getByTestId('event-save-btn').click();
    await page.waitForTimeout(600);

    // 截图：时间轴整体（含 Today 标记）
    await screenshot(page, '01-timeline-overview');

    // 滚动到 Today 标记附近，检查标签是否与轨道列重叠
    await page.waitForTimeout(500);
    const todayMarkerLeft = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="timeline-canvas"]');
      if (!canvas) return 0;
      // 通过红色 Today 标签定位
      const label = Array.from(canvas.querySelectorAll('span')).find((s) =>
        s.textContent?.includes('今天'),
      );
      if (!label) return 0;
      const labelRect = label.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      return labelRect.left - canvasRect.left + canvas.scrollLeft - 30;
    });
    if (todayMarkerLeft > 0) {
      await page.evaluate((x) => {
        const canvas = document.querySelector('[data-testid="timeline-canvas"]');
        if (canvas) canvas.scrollLeft = x;
      }, todayMarkerLeft);
      await page.waitForTimeout(400);
      await screenshot(page, '01b-timeline-today-marker');
    }

    // 3. 打开筛选下拉框，测试位置偏移/截断
    // 点击角色筛选（此时无角色，下拉较短）
    const characterFilterBtn = page.locator('button:has-text("角色")').first();
    await characterFilterBtn.click();
    await page.waitForTimeout(300);
    await screenshot(page, '02-timeline-filter-character-open');
    await characterFilterBtn.press('Escape');
    await page.waitForTimeout(200);

    // 点击状态筛选
    const statusFilterBtn = page.locator('button:has-text("状态")').first();
    await statusFilterBtn.click();
    await page.waitForTimeout(300);
    await screenshot(page, '03-timeline-filter-status-open');
    await statusFilterBtn.press('Escape');
    await page.waitForTimeout(200);

    // 4. 导航到设置 - 外观
    await page.locator('nav a').filter({ hasText: /设置|Settings/ }).click();
    await page.waitForURL(/\/workspaces\/.+\/settings/, { timeout: 10000 });
    await page.waitForTimeout(500);
    await screenshot(page, '04-settings-appearance');

    // 5. 设置 - AI
    await page.getByTestId('settings-tab-ai').click();
    await page.waitForTimeout(500);
    await screenshot(page, '05-settings-ai');

    // 6. 回到时间轴，模拟较窄窗口检查 Today 标签
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.locator('nav a').filter({ hasText: /时间轴|Timeline/ }).click();
    await page.waitForURL(/\/workspaces\/.+\/timeline/, { timeout: 10000 });
    await page.waitForTimeout(600);
    await screenshot(page, '06-timeline-narrow-today');

    console.log('\nAudit screenshots done:', OUT_DIR);
  } catch (e) {
    console.error('audit failed', e);
    await screenshot(page, 'error-state');
    throw e;
  } finally {
    await browser.close();
  }
})();
