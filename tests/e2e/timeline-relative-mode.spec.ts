import { test, expect } from '@playwright/test';
import { createRelativeEvent, createWorkspaceAndGoToTimeline } from './helpers/timeline';

test.describe('相对时间轴重做', () => {
  test('只显示内容实际范围并在标尺上标记 #1/#2，不显示今天线', async ({ page }) => {
    await createWorkspaceAndGoToTimeline(page, '相对时间轴重做');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await createRelativeEvent(page, '事件甲', '第1天');
    await createRelativeEvent(page, '事件乙', '第2天');

    // 两个相对事件的顺序标记直接落在标尺上
    await expect(page.getByTestId('relative-marker')).toHaveCount(2);
    await expect(page.getByTestId('relative-marker').nth(0)).toContainText('#1');
    await expect(page.getByTestId('relative-marker').nth(1)).toContainText('#2');
    // 相对事件自己的日期（第1天/第2天）作为副标签显示，补充时间跨度感
    await expect(page.getByTestId('relative-marker').nth(0)).toContainText('第1天');
    await expect(page.getByTestId('relative-marker').nth(1)).toContainText('第2天');

    // 相对模式彻底移除伪日历刻度，只保留故事顺序标尺
    await expect(page.getByTestId('timeline-ruler')).toHaveAttribute('data-ruler-level', 'relative');
    await expect(page.locator('[data-testid="timeline-major-tick"]')).toHaveCount(0);

    // 相对模式不再显示真实"今天"参考线
    await expect(page.getByTestId('today-marker-label')).toHaveCount(0);

    // 缩放档位显示"相对"
    await expect(page.getByText('相对', { exact: true }).first()).toBeVisible();
  });
});
