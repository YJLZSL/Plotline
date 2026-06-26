import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const BASE = 'http://localhost:1420';
const OUT = 'test-artifacts/audit-v2.5.4';
const LOG = [];

function note(text) {
  LOG.push(text);
  console.log(text);
}

async function screenshot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  note(`截图已保存: ${path}`);
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await mkdir(OUT, { recursive: true });

try {
  note('=== 1. 工作区选择器 ===');
  await page.goto(BASE);
  await page.waitForSelector('h2');
  await wait(500);
  await screenshot(page, 'workspace-selector');

  note('创建新工作区...');
  await page.getByTestId('create-workspace-btn').click();
  await page.getByTestId('workspace-name-input').fill('审计测试');
  await page.getByTestId('workspace-submit').click();
  await page.waitForURL(/\/workspaces\/.+\/timeline/);
  note('已跳转到时间轴');

  note('=== 2. 时间轴 ===');
  await page.waitForSelector('[data-testid="add-event-btn"]');
  await wait(500);

  note('添加事件...');
  await page.getByTestId('add-event-btn').first().click();
  await page.getByTestId('event-title-input').fill('测试事件');
  await page.getByTestId('event-save-btn').click();
  await page.waitForSelector('text=测试事件');
  note('事件已添加');

  note('编辑事件...');
  await page.locator('text=测试事件').first().dblclick();
  await page.waitForSelector('[data-testid="event-title-input"]');
  await page.getByTestId('event-title-input').fill('测试事件-已编辑');
  await page.getByTestId('event-save-btn').click();
  await page.waitForSelector('text=测试事件-已编辑');
  note('事件已编辑');

  note('右键菜单...');
  await page.locator('[data-event-id]').first().click({ button: 'right' });
  await page.waitForSelector('[role="menu"]');
  note('右键菜单已打开');
  await page.keyboard.press('Escape');

  note('删除事件...');
  await page.locator('[data-event-id]').first().click({ button: 'right' });
  const deleteItem = page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /删除|Delete/ });
  if (await deleteItem.isVisible().catch(() => false)) {
    await deleteItem.click();
    note('事件已删除');
  } else {
    note('未找到删除菜单项，跳过删除');
    await page.keyboard.press('Escape');
  }

  await wait(500);
  await screenshot(page, 'timeline');

  note('=== 3. 角色 ===');
  await page.locator('nav a').filter({ hasText: /角色|Characters/ }).click();
  await page.waitForURL(/\/workspaces\/.+\/characters/);
  await wait(500);

  note('添加角色...');
  const addCharBtn = page.locator('button').filter({ hasText: /添加角色|新建角色|新增角色|New Character/ }).first();
  await addCharBtn.click();
  await page.waitForSelector('[data-testid="character-name-input"]');
  await page.getByTestId('character-name-input').fill('审计角色');
  await page.getByTestId('character-save-btn').click();
  await page.waitForSelector('text=审计角色');
  note('角色已添加');

  note('编辑角色...');
  await page.locator('text=审计角色').first().click();
  await page.locator('button[title="编辑"], button[title="Edit"]').first().click();
  await page.waitForSelector('[data-testid="character-name-input"]');
  await page.getByTestId('character-name-input').fill('审计角色-已编辑');
  await page.getByTestId('character-save-btn').click();
  await page.waitForSelector('text=审计角色-已编辑');
  note('角色已编辑');

  await wait(500);
  await screenshot(page, 'characters');

  note('=== 4. 大纲 ===');
  await page.locator('nav a').filter({ hasText: /大纲|Outline/ }).click();
  await page.waitForURL(/\/workspaces\/.+\/outline/);
  await wait(500);

  note('添加卷节点...');
  const addOutlineBtn = page.locator('button').filter({ hasText: /添加卷|新建卷|新增卷|Add Volume/ }).first();
  await addOutlineBtn.click();
  await page.waitForSelector('[data-testid="outline-title-input"]');
  await page.getByTestId('outline-title-input').fill('审计卷');
  await page.getByTestId('outline-save-btn').click();
  await page.waitForSelector('text=审计卷');
  note('卷节点已添加');

  note('编辑卷节点...');
  await page.locator('text=审计卷').first().click();
  await page.locator('button').filter({ hasText: /编辑|Edit/ }).first().click();
  await page.waitForSelector('[data-testid="outline-title-input"]');
  await page.getByTestId('outline-title-input').fill('审计卷-已编辑');
  await page.getByTestId('outline-save-btn').click();
  await page.waitForSelector('text=审计卷-已编辑');
  note('卷节点已编辑');

  await wait(500);
  await screenshot(page, 'outline');

  note('=== 5. 设置 ===');
  await page.locator('nav a').filter({ hasText: /设置|Settings/ }).click();
  await page.waitForURL(/\/workspaces\/.+\/settings/);
  await wait(500);

  note('启用 AI...');
  await page.getByTestId('settings-tab-ai').click();
  const aiToggle = page.getByTestId('ai-enabled-toggle');
  if ((await aiToggle.getAttribute('aria-checked')) !== 'true') {
    await aiToggle.click();
  }
  await wait(300);

  note('切换主题为 dark...');
  await page.getByTestId('settings-tab-appearance').click();
  await page.waitForSelector('[data-testid="theme-dark"]');
  await page.getByTestId('theme-dark').click();
  await wait(500);

  note('调整字体大小...');
  await page.getByTestId('settings-tab-editor').click();
  await wait(500);
  const fontSizeInput = page.locator('input[type="range"]').first();
  await fontSizeInput.waitFor({ state: 'visible' });
  await fontSizeInput.evaluate((el) => { el.value = '16'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(300);

  note('保存设置...');
  await page.getByTestId('settings-save-btn').click();
  await wait(500);
  await screenshot(page, 'settings');

  note('=== 6. AI 助手 ===');
  await page.locator('nav a').filter({ hasText: /角色|Characters/ }).click();
  await page.waitForURL(/\/workspaces\/.+\/characters/);
  await wait(300);

  note('选中角色并打开 AI 面板...');
  await page.locator('text=审计角色-已编辑').first().click();
  await wait(200);
  await page.getByTestId('ai-toolbar-btn').click();
  await page.waitForSelector('[data-testid="ai-assistant-panel"]');
  note('AI 面板已打开');

  const suggestion = page.locator('[data-testid^="ai-suggestion-"]').first();
  if (await suggestion.isVisible().catch(() => false)) {
    await suggestion.click();
    note('已点击建议词');
  } else {
    note('未找到建议词');
  }

  await wait(300);
  const contextTags = page.locator('[data-testid="ai-context-tags"]');
  if (await contextTags.isVisible().catch(() => false)) {
    note('上下文标签已显示');
  } else {
    note('上下文标签未显示');
  }

  await wait(500);
  await screenshot(page, 'ai-panel');

  note('=== 7. 导出工作区 JSON ===');
  await page.goto(BASE);
  await page.waitForSelector('[data-testid="workspace-card-shimmer"], h2');
  await wait(500);
  const card = page.locator('[data-testid="workspace-card-shimmer"]').first().locator('..').first();
  await card.hover();
  const exportBtn = page.locator('button[title="导出"], button[title="Export"], button[title="导出工作区"], button[title="Export workspace"]').first();
  if (await exportBtn.isVisible().catch(() => false)) {
    await exportBtn.click();
    note('已触发导出工作区 JSON');
  } else {
    note('未找到导出按钮（可能标题不同），跳过导出');
  }

  note('=== 走查完成 ===');
} catch (err) {
  note(`ERROR: ${err.message}`);
  await screenshot(page, 'error-state');
  throw err;
} finally {
  await browser.close();
  await writeFile(join(OUT, 'walkthrough-log.txt'), LOG.join('\n'), 'utf8').catch(() => {});
}
