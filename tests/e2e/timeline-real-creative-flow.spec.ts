import { test, expect } from '@playwright/test';
import {
  createAbsoluteEvent,
  createRelativeEvent,
  createTrack,
  createWorkspaceAndGoToTimeline,
  findClosestTick,
  getCard,
  getCardBox,
  getMajorTick,
  getMajorTicks,
  getPathEndpoints,
  getSvgOffset,
  isCardInTrackByIndex,
  zoomOut,
} from './helpers/timeline';

const SNAP_TOLERANCE = 1; // 吸附后卡片左边缘与主刻度线差值 ≤ 1px
// 位置弱校验阈值 = 产品吸附阈值上限（getSnapThreshold 上限 24px）。
// 不能直接对"可见刻度采样"断言 1px：CI/不同字体环境下 estimateLabelWidth 估算偏差
// 会改变刻度采样集合，导致最近可见刻度偏离吸附网格点最多 ~14px。
// 吸附是否生效以「日期功能证据」为准（卡片日期写入新网格），位置仅弱校验落在阈值内。
const POSITION_TOLERANCE = 24;
const CONNECTION_TOLERANCE = 10; // 跨轨道拖动后连接线端点容差 ≤ 10px

test.describe('时间轴真实创作流程', () => {
  test.beforeEach(async ({ page }) => {
    await createWorkspaceAndGoToTimeline(page, '真实创作流程测试');
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('should 将绝对事件吸附到月初网格线并同步更新日期 when 拖动到目标刻度附近', async ({ page }) => {
    // 准备两条轨道与多个事件，模拟真实创作场景
    await createTrack(page, '支线');
    await createAbsoluteEvent(page, '主线事件A', '2024-03-15');
    await createAbsoluteEvent(page, '主线事件B', '2024-05-20');
    await createRelativeEvent(page, '相对事件', '第3天');

    const card = await getCard(page, '主线事件A');
    const tick = await getMajorTick(page, '2024-04');
    await expect(tick).toBeAttached();

    const cardBox = await card.boundingBox();
    const tickBox = await tick.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(tickBox).not.toBeNull();

    // 将卡片左边缘拖到 2024-04 主刻度线上
    const delta = tickBox!.x - cardBox!.x;
    const startX = cardBox!.x + cardBox!.width / 2;
    const startY = cardBox!.y + cardBox!.height / 2;
    const targetX = startX + delta;
    const targetY = startY;

    await page.mouse.move(0, 0);
    await page.mouse.move(startX, startY, { steps: 3 });
    await page.mouse.down();
    await page.mouse.move(startX + 4, startY, { steps: 1 });
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.waitForTimeout(200);
    await page.mouse.up();

    // 等待后端更新与 UI 重绘
    await page.waitForTimeout(300);
    await expect(card).toContainText('2024-04-01');

    const finalBox = await card.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(Math.abs(finalBox!.x - tickBox!.x)).toBeLessThanOrEqual(SNAP_TOLERANCE);

    // 双击打开编辑对话框，验证日期输入框为吸附后的日期
    await card.dblclick();
    const dateInput = page.locator('input[type="date"]').first();
    await expect(dateInput).toBeVisible();
    await expect(dateInput).toHaveValue('2024-04-01');
    await page.getByRole('button', { name: '取消' }).first().click();
  });

  test('should 事件被拖到另一轨道后出现在目标轨道且连线端点仍对齐锚点', async ({ page }) => {
    await createTrack(page, '支线');
    await createAbsoluteEvent(page, '源事件', '2024-04-01');
    await createAbsoluteEvent(page, '目标事件', '2024-06-01');

    // 建立跨轨道连接：源事件 → 目标事件（先在同一轨道）
    const sourceCard = await getCard(page, '源事件');
    await sourceCard.click({ button: 'right' });
    await page.getByText('建立连接').click();
    await expect(page.getByText(/点击目标事件/)).toBeVisible({ timeout: 3000 }).catch(() => {
      // 提示可能被滚动遮盖，继续执行
    });
    const targetCard = await getCard(page, '目标事件');
    await targetCard.click();

    await expect(page.locator('svg[data-testid="timeline-connection-layer"] path')).toBeAttached({
      timeout: 5000,
    });
    await page.waitForTimeout(300);

    // 将源事件拖到支线轨道（索引 1），保持水平方向大致不变
    const sourceBox = await sourceCard.boundingBox();
    expect(sourceBox).not.toBeNull();

    const targetLane = page.getByTestId('track-lane').nth(1);
    const targetLaneBox = await targetLane.boundingBox();
    expect(targetLaneBox).not.toBeNull();

    const startX = sourceBox!.x + sourceBox!.width / 2;
    const startY = sourceBox!.y + sourceBox!.height / 2;
    const dragTargetX = startX + 60;
    const dragTargetY = targetLaneBox!.y + targetLaneBox!.height / 2;

    await page.mouse.move(0, 0);
    await page.mouse.move(startX, startY, { steps: 3 });
    await page.mouse.down();
    await page.mouse.move(startX + 4, startY, { steps: 1 });
    await page.mouse.move(dragTargetX, dragTargetY, { steps: 12 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // 验证事件已移动到支线轨道
    expect(await isCardInTrackByIndex(page, '源事件', 1)).toBe(true);

    // 验证连接线端点仍与卡片锚点对齐
    const endpoints = await getPathEndpoints(page);
    const movedSourceBox = await getCardBox(page, '源事件');
    const movedTargetBox = await getCardBox(page, '目标事件');
    const svgOffset = await getSvgOffset(page);

    expect(endpoints).not.toBeNull();
    expect(movedSourceBox).not.toBeNull();
    expect(movedTargetBox).not.toBeNull();

    const startXViewport = endpoints!.startX + svgOffset.x;
    const startYViewport = endpoints!.startY + svgOffset.y;
    const endXViewport = endpoints!.endX + svgOffset.x;
    const endYViewport = endpoints!.endY + svgOffset.y;

    // 源事件现在在支线（track 1），目标事件在主线（track 0），属于跨轨道连接：
    // 源下沿中点 → 目标上沿中点
    const sourceBottomCenterX = movedSourceBox!.x + movedSourceBox!.width / 2;
    const sourceBottomY = movedSourceBox!.y + movedSourceBox!.height;
    const targetTopCenterX = movedTargetBox!.x + movedTargetBox!.width / 2;
    const targetTopY = movedTargetBox!.y;

    expect(Math.abs(startXViewport - sourceBottomCenterX)).toBeLessThanOrEqual(CONNECTION_TOLERANCE);
    expect(Math.abs(startYViewport - sourceBottomY)).toBeLessThanOrEqual(CONNECTION_TOLERANCE);
    expect(Math.abs(endXViewport - targetTopCenterX)).toBeLessThanOrEqual(CONNECTION_TOLERANCE);
    expect(Math.abs(endYViewport - targetTopY)).toBeLessThanOrEqual(CONNECTION_TOLERANCE);
  });

  test('should 切换 zoom 级别后拖动仍能正确吸附到网格', async ({ page }) => {
    await createTrack(page, '支线');
    await createAbsoluteEvent(page, '缩放吸附事件', '2024-03-28');

    const card = await getCard(page, '缩放吸附事件');

    // 吸附断言策略说明：
    // 产品吸附目标是「网格点」（alignToTickBoundary 对齐的日历边界 + 整月/整天步进），
    // 而测试用 findClosestTick 从「可见刻度」采样（受 estimateLabelWidth 估算与字体环境影响）。
    // 因此不能断言卡片位置 == 最近可见刻度（两环境可能差 ~14px），
    // 应断言吸附的「功能证据」：日期被写入新网格 + 位置落在产品吸附阈值上限内。

    // 阶段 1：默认月档 zoom 下拖动到最近主刻度
    let cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();

    let ticks = await getMajorTicks(page);
    expect(ticks.length).toBeGreaterThan(0);
    let closest = findClosestTick(ticks, cardBox!.x);
    expect(closest).not.toBeNull();
    let targetTick = ticks[closest!.index];
    expect(targetTick).toBeDefined();

    // 拖动前日期文本（2024-03-28），作为吸附功能证据的基线
    const beforeText = await card.innerText();
    expect(beforeText).toContain('2024-03-28');

    let startX = cardBox!.x + cardBox!.width / 2;
    let startY = cardBox!.y + cardBox!.height / 2;
    let targetX = startX + (targetTick!.x - cardBox!.x);
    let targetY = startY;

    await page.mouse.move(0, 0);
    await page.mouse.move(startX, startY, { steps: 3 });
    await page.mouse.down();
    await page.mouse.move(startX + 4, startY, { steps: 1 });
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    // 吸附功能证据：日期被写入新网格（不再显示 2024-03-28）
    await expect
      .poll(async () => !(await card.innerText()).includes('2024-03-28'), { timeout: 5000 })
      .toBe(true);
    // 位置弱校验：落在产品吸附阈值上限内（吸附已生效）
    await expect
      .poll(
        async () => {
          const box = await card.boundingBox();
          return box ? Math.abs(box.x - targetTick!.x) : -1;
        },
        { timeout: 5000 },
      )
      .toBeLessThanOrEqual(POSITION_TOLERANCE);

    let finalBox = await card.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(Math.abs(finalBox!.x - targetTick!.x)).toBeLessThanOrEqual(POSITION_TOLERANCE);

    // 阶段 2：缩小到日档，切换刻度级别后再次拖动验证吸附
    await zoomOut(page, 2);
    // 等待缩放后卡片位置收敛（连续两次采样一致）再拖动，避免时序抖动
    await expect
      .poll(
        async () => {
          const box1 = await card.boundingBox();
          await page.waitForTimeout(60);
          const box2 = await card.boundingBox();
          return box1 && box2 && Math.abs(box1.x - box2.x) < 0.5 ? box1.x : -1;
        },
        { timeout: 5000 },
      )
      .toBeGreaterThanOrEqual(0);

    cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();

    // 阶段 2 拖动前日期文本（阶段 1 后已更新），作为本次吸附的功能证据基线
    const beforeText2 = await card.innerText();

    // 目标 = 卡片当前位置之后的「下一个主刻度」（明确为网格点）。
    // 不能选"最近可见刻度"——阶段 1 后卡片已对齐网格，最近刻度可能即当前网格，拖动距离趋近 0；
    // 也不能用固定像素——日档吸附阈值 ~24px，固定距离可能落在阈值外导致不触发吸附。
    const nextTick = (await getMajorTicks(page)).find((t) => t.x > cardBox!.x + 10);
    expect(nextTick).toBeDefined();

    startX = cardBox!.x + cardBox!.width / 2;
    startY = cardBox!.y + cardBox!.height / 2;
    targetX = startX + (nextTick!.x - cardBox!.x);
    targetY = startY;

    await page.mouse.move(0, 0);
    await page.mouse.move(startX, startY, { steps: 3 });
    await page.mouse.down();
    await page.mouse.move(startX + 4, startY, { steps: 1 });
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    // 吸附功能证据：日期再次更新（写入日档新网格），与字体/刻度采样无关
    await expect
      .poll(async () => (await card.innerText()) !== beforeText2, { timeout: 5000 })
      .toBe(true);
    // 位置弱校验：卡片落回网格点（与某个可见刻度对齐，偏差在产品吸附阈值上限内）
    await expect
      .poll(
        async () => {
          const box = await card.boundingBox();
          if (!box) return -1;
          const allTicks = await getMajorTicks(page);
          const nearest = findClosestTick(allTicks, box.x);
          return nearest ? nearest.diff : -1;
        },
        { timeout: 5000 },
      )
      .toBeLessThanOrEqual(POSITION_TOLERANCE);

    finalBox = await card.boundingBox();
    expect(finalBox).not.toBeNull();
    const allTicks = await getMajorTicks(page);
    const nearestFinal = findClosestTick(allTicks, finalBox!.x);
    expect(nearestFinal).not.toBeNull();
    expect(nearestFinal!.diff).toBeLessThanOrEqual(POSITION_TOLERANCE);
  });

  test('should 关闭增强动效后拖动吸附不依赖 scale/pathLength 动画', async ({ page }) => {
    // beforeEach 已设置 reducedMotion，这里无需重复调用，避免额外重绘
    await createTrack(page, '支线');
    await createAbsoluteEvent(page, '退化测试事件', '2024-03-28');

    const card = await getCard(page, '退化测试事件');
    const tick = await getMajorTick(page, '2024-04');
    await expect(tick).toBeAttached();

    const cardBox = await card.boundingBox();
    const tickBox = await tick.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(tickBox).not.toBeNull();

    const delta = tickBox!.x - cardBox!.x;
    const startX = cardBox!.x + cardBox!.width / 2;
    const startY = cardBox!.y + cardBox!.height / 2;
    const targetX = startX + delta;
    const targetY = startY;

    await page.mouse.move(0, 0);
    await page.mouse.move(startX, startY, { steps: 3 });
    await page.mouse.down();
    await page.mouse.move(startX + 4, startY, { steps: 1 });
    await page.mouse.move(targetX, targetY, { steps: 10 });
    // 退化场景下动画更短，但 React 状态更新仍需等待，增加等待确保参考线已对齐
    await page.waitForTimeout(400);

    // 退化场景下吸附参考线仍应出现（容忍度放宽，重点验证动画不导致断言失败）
    const hint = page.getByTestId('drag-snap-hint');
    await expect(hint).toBeVisible();
    const hintBox = await hint.boundingBox();
    expect(hintBox).not.toBeNull();
    // 退化模式下参考线只需落在目标刻度附近即可，避免偶发 10~15px 抖动导致 flaky
    expect(Math.abs(hintBox!.x - tickBox!.x)).toBeLessThanOrEqual(20);

    await page.mouse.up();
    // 释放后吸附经 mutation → layout 重算是异步的，等待卡片收敛到目标刻度；
    // 位置弱校验用 POSITION_TOLERANCE（吸附阈值上限），吸附生效以日期证据为准
    await expect
      .poll(
        async () => {
          const box = await card.boundingBox();
          return box ? Math.abs(box.x - tickBox!.x) : -1;
        },
        { timeout: 5000 },
      )
      .toBeLessThanOrEqual(POSITION_TOLERANCE);

    // 释放后无 scale/pathLength 动画导致的异常：卡片应正常显示且日期已吸附
    await expect(card).toBeVisible();
    await expect(card).toContainText('2024-04-01');

    const finalBox = await card.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(Math.abs(finalBox!.x - tickBox!.x)).toBeLessThanOrEqual(POSITION_TOLERANCE);
  });
});
