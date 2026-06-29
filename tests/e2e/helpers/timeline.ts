import { expect, type Page } from '@playwright/test';

export async function skipOnboardingGuide(page: Page) {
  const skipGuide = page.getByTestId('guide-skip-btn');
  if (await skipGuide.isVisible().catch(() => false)) {
    await skipGuide.click();
    await expect(skipGuide).toBeHidden();
  }
}

export async function createWorkspaceAndGoToTimeline(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('create-workspace-btn').click();
  await page.getByTestId('workspace-name-input').fill(name);
  await page.getByTestId('workspace-submit').click();
  await expect(page).toHaveURL(/\/workspaces\/.+\/timeline/);
  await skipOnboardingGuide(page);
}

export async function createAbsoluteEvent(page: Page, title: string, date: string) {
  await page.getByTestId('add-event-btn').first().click();
  await page.getByTestId('event-title-input').fill(title);
  await page.getByRole('button', { name: '绝对日期' }).click();
  await page.locator('input[type="date"]').first().fill(date);
  await page.getByTestId('event-save-btn').click();
  await expect(page.locator('[data-event-id]').filter({ hasText: title })).toBeVisible();
}

export async function createRelativeEvent(page: Page, title: string, offset: string) {
  await page.getByTestId('add-event-btn').first().click();
  await page.getByTestId('event-title-input').fill(title);
  await page.getByRole('button', { name: '相对日期' }).click();
  const input = page.locator('input[type="text"]').first();
  await input.fill(offset);
  await page.getByTestId('event-save-btn').click();
  await expect(page.locator('[data-event-id]').filter({ hasText: title })).toBeVisible();
}

export async function createTrack(page: Page, name: string) {
  await page.getByPlaceholder('添加轨道').fill(name);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('track-row').filter({ hasText: name })).toBeVisible();
}

export async function getMajorTick(page: Page, label: string) {
  return page.locator(`[data-testid="timeline-major-tick"][data-tick-label="${label}"]`).first();
}

export async function getCard(page: Page, title: string) {
  return page.locator('[data-event-id]').filter({ hasText: title }).first();
}

export async function getCardBox(page: Page, title: string) {
  const card = await getCard(page, title);
  return card.boundingBox();
}

export async function getPathEndpoints(
  page: Page,
): Promise<{ startX: number; startY: number; endX: number; endY: number } | null> {
  return page.locator('svg[data-testid="timeline-connection-layer"] path').first().evaluate((el) => {
    const path = el as SVGPathElement;
    const d = path.getAttribute('d') ?? '';
    const match = d.match(
      /M\s+([\d.]+)\s+([\d.]+)\s+C\s+[\d.]+\s+[\d.]+,\s*[\d.]+\s+[\d.]+,\s*([\d.]+)\s+([\d.]+)/,
    );
    if (!match) return null;
    return {
      startX: parseFloat(match[1]!),
      startY: parseFloat(match[2]!),
      endX: parseFloat(match[3]!),
      endY: parseFloat(match[4]!),
    };
  });
}

export async function getSvgOffset(page: Page) {
  return page.locator('svg[data-testid="timeline-connection-layer"]').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  });
}

export async function zoomIn(page: Page, times: number) {
  const zoomInBtn = page.getByTitle('放大');
  for (let i = 0; i < times; i++) {
    await zoomInBtn.click();
    await page.waitForTimeout(80);
  }
}

export async function zoomOut(page: Page, times: number) {
  const zoomOutBtn = page.getByTitle('缩小');
  for (let i = 0; i < times; i++) {
    await zoomOutBtn.click();
    await page.waitForTimeout(80);
  }
}

export async function getMajorTicks(page: Page): Promise<Array<{ x: number; label: string }>> {
  return page.locator('[data-testid="timeline-major-tick"]').evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left,
        label: el.getAttribute('data-tick-label') ?? '',
      };
    }),
  );
}

export function findClosestTick(
  ticks: Array<{ x: number; label: string }>,
  targetX: number,
): { index: number; diff: number } | null {
  if (ticks.length === 0) return null;
  let bestIndex = 0;
  let bestDiff = Math.abs(ticks[0]!.x - targetX);
  for (let i = 1; i < ticks.length; i++) {
    const diff = Math.abs(ticks[i]!.x - targetX);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }
  return { index: bestIndex, diff: bestDiff };
}

/**
 * 返回所有轨道 lane 的 data-track-id 列表（按 DOM 顺序）。
 * 轨道 lane 是包含事件卡片的画布区域，区别于侧边栏的 track-row。
 */
export async function getTrackIds(page: Page): Promise<string[]> {
  return page.locator('[data-track-id]').evaluateAll((els) =>
    els
      .map((el) => el.getAttribute('data-track-id'))
      .filter((id): id is string => id !== null && id !== ''),
  );
}

/** 判断事件卡片是否位于指定索引的轨道 lane 内 */
export async function isCardInTrackByIndex(page: Page, title: string, trackIndex: number) {
  const trackIds = await getTrackIds(page);
  const targetTrackId = trackIds[trackIndex];
  if (!targetTrackId) return false;
  const lane = page.locator(`[data-track-id="${targetTrackId}"]`);
  const card = lane.locator('[data-event-id]').filter({ hasText: title });
  return card.count().then((c) => c > 0);
}
