import { test, expect, type Page } from '@playwright/test';

async function createWorkspace(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('create-workspace-btn').click();
  await page.getByTestId('workspace-name-input').fill(name);
  await page.getByTestId('workspace-submit').click();
  await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
}

async function enableAiInStorage(page: Page) {
  await page.evaluate(() => {
    const raw = localStorage.getItem('plotline:mock-db');
    const db = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const settings = (db.settings as Record<string, unknown> | undefined) ?? {};
    db.settings = {
      ...settings,
      aiEnabled: true,
      aiProvider: 'openai',
      aiBaseUrl: 'http://localhost:9999/v1',
      aiApiKey: 'test-api-key',
      aiModel: 'gpt-4o-mini',
    };
    localStorage.setItem('plotline:mock-db', JSON.stringify(db));
  });
}

async function navigateToAiAssistant(page: Page) {
  await page.locator('nav a').filter({ hasText: /AI 创作|AI Create/ }).click();
  await expect(page).toHaveURL(/\/workspaces\/.+\/ai-assistant/);
}

test.describe('AI 创作助手侧边模块', () => {
  test('侧边栏显示 AI 创作入口，未启用 AI 时显示未启用提示', async ({ page }) => {
    await createWorkspace(page, 'AI 测试');
    await expect(page.locator('nav a').filter({ hasText: /AI 创作|AI Create/ })).toBeVisible();

    await navigateToAiAssistant(page);
    await expect(page.locator('text=AI 助手未启用')).toBeVisible();
    await expect(page.locator('text=前往设置开启 AI 助手并配置 API 后使用')).toBeVisible();
  });

  test('启用 AI 后显示 AI 创作视图，可展开侧边栏并切换 Agent 与上下文', async ({ page }) => {
    await createWorkspace(page, 'AI 创作测试');
    await enableAiInStorage(page);
    await page.reload();
    await navigateToAiAssistant(page);

    await expect(page.getByTestId('ai-assistant-view')).toBeVisible();
    await expect(page.getByTestId('ai-assistant-message-area')).toBeVisible();
    await expect(page.getByTestId('ai-assistant-input')).toBeVisible();

    // 侧边栏默认收起，点击展开
    await expect(page.getByTestId('ai-agent-selector')).not.toBeVisible();
    await page.getByTestId('ai-assistant-open-sidebar').click();
    await expect(page.getByTestId('ai-agent-selector')).toBeVisible();
    await expect(page.getByTestId('ai-context-selector')).toBeVisible();

    // 切换 Agent
    await page.getByTestId('ai-agent-continue').click();
    await expect(page.getByTestId('ai-agent-continue')).toHaveClass(/bg-accent\/10/);
    await expect(page.getByTestId('ai-agent-chat')).not.toHaveClass(/bg-accent\/10/);

    // 切换上下文
    await page.getByTestId('ai-context-current_event').click();
    await expect(page.getByTestId('ai-context-current_event')).toHaveClass(/bg-accent\/10/);
    await expect(page.getByTestId('ai-context-whole_workspace')).not.toHaveClass(/bg-accent\/10/);
  });

  test('可发送消息并收到模拟回复', async ({ page }) => {
    await createWorkspace(page, 'AI 消息测试');
    await enableAiInStorage(page);
    await page.reload();
    await navigateToAiAssistant(page);

    const input = page.getByTestId('ai-assistant-input');
    await input.fill('你好，AI');
    await page.getByTestId('ai-assistant-send').click();

    // 用户消息即时渲染
    await expect(page.locator('text=你好，AI').first()).toBeVisible();
    // mock 后端返回固定格式的模拟回复
    await expect(page.locator('text=（模拟回复）我收到你的问题').first()).toBeVisible();
  });

  test('可创建新会话并清空当前会话', async ({ page }) => {
    await createWorkspace(page, 'AI 会话测试');
    await enableAiInStorage(page);
    await page.reload();
    await navigateToAiAssistant(page);

    // 发送第一条消息以创建会话
    await page.getByTestId('ai-assistant-input').fill('测试消息');
    await page.getByTestId('ai-assistant-send').click();
    await expect(page.locator('text=（模拟回复）我收到你的问题').first()).toBeVisible();

    // 展开侧边栏查看会话列表
    await page.getByTestId('ai-assistant-open-sidebar').click();
    const sessionItems = page.locator('[data-testid^="ai-assistant-session-"]');
    await expect(sessionItems).toHaveCount(1);

    // 清空当前会话，删除后列表为空并显示空状态
    await page.getByTestId('ai-assistant-clear-session').click();
    await expect(sessionItems).toHaveCount(0);
    await expect(page.locator('text=开始创作').first()).toBeVisible();

    // 创建新会话
    await page.getByTestId('ai-assistant-new-session').click();
    await expect(sessionItems).toHaveCount(1);
    await expect(page.locator('text=开始创作').first()).toBeVisible();
  });
});
