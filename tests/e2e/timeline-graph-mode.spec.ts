import { test, expect } from '@playwright/test';
import {
  createAbsoluteEvent,
  createWorkspaceAndGoToTimeline,
} from './helpers/timeline';

/** 右键事件卡片 → 建立连接 → 点击目标事件完成连接 */
async function connectEvents(page: import('@playwright/test').Page, sourceTitle: string, targetTitle: string) {
  const sourceCard = page.locator('[data-event-id]').filter({ hasText: sourceTitle }).first();
  await sourceCard.click({ button: 'right' });
  await page.getByText('建立连接').click();
  const targetCard = page.locator('[data-event-id]').filter({ hasText: targetTitle }).first();
  await targetCard.click();
}

test.describe('v5.0 事件关系时间轴', () => {
  test('旧连线自动迁移为关系图边，原时间轴保持可用', async ({ page }) => {
    await createWorkspaceAndGoToTimeline(page, '事件关系时间轴');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await createAbsoluteEvent(page, '伏笔事件', '2024-03-15');
    await createAbsoluteEvent(page, '回收事件', '2024-06-15');

    // 建立一条因果连接（旧时间轴数据）
    await connectEvents(page, '伏笔事件', '回收事件');
    await expect(page.locator('svg[data-testid="timeline-connection-layer"] path')).toBeAttached({
      timeout: 5000,
    });

    // 旧时间轴显示迁移引导，点击直达关系图
    await expect(page.getByTestId('timeline-migration-banner')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('timeline-migration-banner').getByRole('button', { name: /关系图/ }).click();

    // 关系图渲染画布、两个事件节点与一条迁移而来的边
    await expect(page.getByTestId('timeline-graph-canvas')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid^="graph-node-"]')).toHaveCount(2);
    await expect(page.locator('[data-testid^="graph-edge-"]')).toHaveCount(1, { timeout: 5000 });
    await expect(page.getByTestId('timeline-graph-migration-banner')).toBeVisible();

    // 切回日历时间轴，原轨道与事件卡片仍在（零拷贝迁移）
    await page.getByTestId('timeline-viewmode-timeline').click();
    await expect(page.locator('[data-event-id]').filter({ hasText: '伏笔事件' })).toBeVisible();
  });
});
