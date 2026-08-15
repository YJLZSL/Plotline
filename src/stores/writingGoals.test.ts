import { describe, expect, it, beforeEach } from 'vitest';

import {
  addDays,
  buildDailyWritingTrend,
  buildWeeklyWritingTrend,
  formatDateKey,
  getDayRecord,
  getTodayWritingProgress,
  getTotalFocusSessions,
  getTotalWords,
  getWeekDates,
  getWeeklyWritingProgress,
  getWorkspaceGoal,
  getWritableDelta,
  useWritingGoalsStore,
} from './writingGoals';

describe('writingGoals store', () => {
  beforeEach(() => {
    useWritingGoalsStore.setState({ goalsByWorkspace: {} });
  });

  it('should default to 1000 daily and 7000 weekly words', () => {
    const goal = getWorkspaceGoal(useWritingGoalsStore.getState(), 'ws-1');
    expect(goal.dailyTarget).toBe(1000);
    expect(goal.weeklyTarget).toBe(7000);
  });

  it('should update targets with non-negative integers', () => {
    useWritingGoalsStore.getState().setDailyTarget('ws-1', 800.6);
    useWritingGoalsStore.getState().setWeeklyTarget('ws-1', -5);
    const goal = getWorkspaceGoal(useWritingGoalsStore.getState(), 'ws-1');
    expect(goal.dailyTarget).toBe(801);
    expect(goal.weeklyTarget).toBe(0);
  });

  it('should accumulate words and focus sessions per local day', () => {
    const store = useWritingGoalsStore.getState();
    store.addWords('ws-1', 300);
    store.addWords('ws-1', 200);
    store.addFocusSession('ws-1');
    store.addFocusSession('ws-1');

    const goal = getWorkspaceGoal(useWritingGoalsStore.getState(), 'ws-1');
    const today = getDayRecord(goal, new Date());
    expect(today.words).toBe(500);
    expect(today.focusSessions).toBe(2);
    expect(getTotalWords(goal)).toBe(500);
    expect(getTotalFocusSessions(goal)).toBe(2);
  });

  it('should ignore non-positive word deltas', () => {
    useWritingGoalsStore.getState().addWords('ws-1', -10);
    expect(getTotalWords(getWorkspaceGoal(useWritingGoalsStore.getState(), 'ws-1'))).toBe(0);
  });
});

describe('writing trend helpers', () => {
  const base = new Date(2026, 7, 12, 12, 0, 0); // 本地时间周三

  function goalWith(records: Record<string, { words: number; focusSessions: number }>) {
    return {
      dailyTarget: 1000,
      weeklyTarget: 7000,
      records: Object.fromEntries(
        Object.entries(records).map(([key, value]) => [
          key,
          { ...value, updatedAt: '2026-08-12T00:00:00.000Z' },
        ]),
      ),
    };
  }

  it('should build a 7-day ascending daily trend', () => {
    const goal = goalWith({
      [formatDateKey(base)]: { words: 100, focusSessions: 1 },
      [formatDateKey(addDays(base, -1))]: { words: 200, focusSessions: 2 },
    });
    const trend = buildDailyWritingTrend(goal, 7, base);
    expect(trend).toHaveLength(7);
    expect(trend[5]!.key).toBe(formatDateKey(addDays(base, -1)));
    expect(trend[5]!.words).toBe(200);
    expect(trend[6]!.key).toBe(formatDateKey(base));
    expect(trend[6]!.focusSessions).toBe(1);
  });

  it('should build weekly buckets starting on Monday', () => {
    const goal = goalWith({});
    const trend = buildWeeklyWritingTrend(goal, 4, base);
    expect(trend).toHaveLength(4);
    for (const point of trend) {
      const monday = new Date(`${point.key}T00:00:00`);
      expect(monday.getDay()).toBe(1);
    }
  });

  it('should compute progress clamped to 100%', () => {
    const goal = goalWith({ [formatDateKey(base)]: { words: 1500, focusSessions: 0 } });
    expect(getTodayWritingProgress(goal, base)).toBe(1);

    const weekDates = getWeekDates(base);
    const weeklyGoal = goalWith({
      [formatDateKey(weekDates[0]!)]: { words: 3500, focusSessions: 0 },
      [formatDateKey(weekDates[1]!)]: { words: 4000, focusSessions: 0 },
    });
    expect(getWeeklyWritingProgress(weeklyGoal, base)).toBe(1);
  });
});

describe('getWritableDelta', () => {
  it('should return the positive delta while a focus session is running', () => {
    expect(getWritableDelta({ currentWords: 500, previousWords: 300, chapterChanged: false, focusRunning: true })).toBe(200);
  });

  it('should ignore negative deltas, chapter switches and non-focus states', () => {
    expect(getWritableDelta({ currentWords: 200, previousWords: 300, chapterChanged: false, focusRunning: true })).toBe(0);
    expect(getWritableDelta({ currentWords: 500, previousWords: 100, chapterChanged: true, focusRunning: true })).toBe(0);
    expect(getWritableDelta({ currentWords: 500, previousWords: 100, chapterChanged: false, focusRunning: false })).toBe(0);
  });
});
