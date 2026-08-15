import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_DAILY_WRITING_TARGET = 1000;
export const DEFAULT_WEEKLY_WRITING_TARGET = 7000;

export interface WritingDayRecord {
  /** 当天累计写作字数（增量仅记录正值）。 */
  words: number;
  /** 当天完成的专注番茄数。 */
  focusSessions: number;
  updatedAt: string;
}

export interface WorkspaceWritingGoal {
  dailyTarget: number;
  weeklyTarget: number;
  /** key = YYYY-MM-DD（本地时区）。 */
  records: Record<string, WritingDayRecord>;
}

export interface WritingGoalsState {
  goalsByWorkspace: Record<string, WorkspaceWritingGoal>;
  setDailyTarget: (workspaceId: string, words: number) => void;
  setWeeklyTarget: (workspaceId: string, words: number) => void;
  addWords: (workspaceId: string, delta: number) => void;
  addFocusSession: (workspaceId: string) => void;
  resetWorkspaceGoal: (workspaceId: string) => void;
}

export function createDefaultGoal(): WorkspaceWritingGoal {
  return {
    dailyTarget: DEFAULT_DAILY_WRITING_TARGET,
    weeklyTarget: DEFAULT_WEEKLY_WRITING_TARGET,
    records: {},
  };
}

function ensureGoal(state: WritingGoalsState, workspaceId: string): WorkspaceWritingGoal {
  return state.goalsByWorkspace[workspaceId] ?? createDefaultGoal();
}

function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function touchRecord(record: WritingDayRecord): WritingDayRecord {
  return { ...record, updatedAt: new Date().toISOString() };
}

export const useWritingGoalsStore = create<WritingGoalsState>()(
  persist(
    (set) => ({
      goalsByWorkspace: {},
      setDailyTarget: (workspaceId, words) =>
        set((state) => {
          const goal = ensureGoal(state, workspaceId);
          return {
            goalsByWorkspace: {
              ...state.goalsByWorkspace,
              [workspaceId]: {
                ...goal,
                dailyTarget: Math.max(0, Math.round(words)),
              },
            },
          };
        }),
      setWeeklyTarget: (workspaceId, words) =>
        set((state) => {
          const goal = ensureGoal(state, workspaceId);
          return {
            goalsByWorkspace: {
              ...state.goalsByWorkspace,
              [workspaceId]: {
                ...goal,
                weeklyTarget: Math.max(0, Math.round(words)),
              },
            },
          };
        }),
      addWords: (workspaceId, delta) =>
        set((state) => {
          if (delta <= 0) return state;
          const goal = ensureGoal(state, workspaceId);
          const key = todayKey();
          const record = goal.records[key] ?? { words: 0, focusSessions: 0, updatedAt: new Date().toISOString() };
          return {
            goalsByWorkspace: {
              ...state.goalsByWorkspace,
              [workspaceId]: {
                ...goal,
                records: {
                  ...goal.records,
                  [key]: touchRecord({
                    ...record,
                    words: record.words + Math.round(delta),
                  }),
                },
              },
            },
          };
        }),
      addFocusSession: (workspaceId) =>
        set((state) => {
          const goal = ensureGoal(state, workspaceId);
          const key = todayKey();
          const record = goal.records[key] ?? { words: 0, focusSessions: 0, updatedAt: new Date().toISOString() };
          return {
            goalsByWorkspace: {
              ...state.goalsByWorkspace,
              [workspaceId]: {
                ...goal,
                records: {
                  ...goal.records,
                  [key]: touchRecord({
                    ...record,
                    focusSessions: record.focusSessions + 1,
                  }),
                },
              },
            },
          };
        }),
      resetWorkspaceGoal: (workspaceId) =>
        set((state) => ({
          goalsByWorkspace: {
            ...state.goalsByWorkspace,
            [workspaceId]: createDefaultGoal(),
          },
        })),
    }),
    { name: 'plotline:writing-goals' },
  ),
);

// ===== 纯函数：统计与趋势 =====

export function formatDateKey(date: Date): string {
  return todayKey(date);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getWorkspaceGoal(
  state: Pick<WritingGoalsState, 'goalsByWorkspace'>,
  workspaceId: string,
): WorkspaceWritingGoal {
  return state.goalsByWorkspace[workspaceId] ?? createDefaultGoal();
}

export function getDayRecord(goal: WorkspaceWritingGoal, date: Date): WritingDayRecord {
  return goal.records[formatDateKey(date)] ?? { words: 0, focusSessions: 0, updatedAt: '' };
}

export function sumRange(
  goal: WorkspaceWritingGoal,
  dates: Date[],
): { words: number; focusSessions: number } {
  let words = 0;
  let focusSessions = 0;
  for (const date of dates) {
    const record = getDayRecord(goal, date);
    words += record.words;
    focusSessions += record.focusSessions;
  }
  return { words, focusSessions };
}

export function getTodayWritingProgress(goal: WorkspaceWritingGoal, date = new Date()): number {
  const target = Math.max(1, goal.dailyTarget);
  return Math.min(1, getDayRecord(goal, date).words / target);
}

export function getWeekDates(date = new Date()): Date[] {
  const start = addDays(date, 0);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7; // 周一为一周起点
  start.setDate(start.getDate() - (day - 1));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getWeeklyWritingProgress(goal: WorkspaceWritingGoal, date = new Date()): number {
  const target = Math.max(1, goal.weeklyTarget);
  return Math.min(1, sumRange(goal, getWeekDates(date)).words / target);
}

export interface DayTrendPoint {
  key: string;
  label: string;
  words: number;
  focusSessions: number;
}

/** 最近 `days` 天的每日写作/专注趋势（倒序输入，返回升序）。 */
export function buildDailyWritingTrend(goal: WorkspaceWritingGoal, days = 7, end = new Date()): DayTrendPoint[] {
  const points: DayTrendPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addDays(end, -offset);
    const record = getDayRecord(goal, date);
    points.push({
      key: formatDateKey(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      words: record.words,
      focusSessions: record.focusSessions,
    });
  }
  return points;
}

export interface WeekTrendPoint {
  key: string;
  label: string;
  words: number;
  focusSessions: number;
}

/** 最近 `weeks` 周（周一起始）的写作/专注趋势。 */
export function buildWeeklyWritingTrend(goal: WorkspaceWritingGoal, weeks = 8, end = new Date()): WeekTrendPoint[] {
  const points: WeekTrendPoint[] = [];
  for (let offset = weeks - 1; offset >= 0; offset--) {
    const anchor = addDays(end, -offset * 7);
    const dates = getWeekDates(anchor);
    const sum = sumRange(goal, dates);
    const monday = dates[0]!;
    points.push({
      key: formatDateKey(monday),
      label: `${monday.getMonth() + 1}/${monday.getDate()}`,
      words: sum.words,
      focusSessions: sum.focusSessions,
    });
  }
  return points;
}

export function getTotalWords(goal: WorkspaceWritingGoal): number {
  return Object.values(goal.records).reduce((sum, record) => sum + record.words, 0);
}

export function getTotalFocusSessions(goal: WorkspaceWritingGoal): number {
  return Object.values(goal.records).reduce((sum, record) => sum + record.focusSessions, 0);
}

/**
 * C1: 判断编辑器字数变化是否应计入写作目标。
 * - 章节/笔记切换导致的字数差不算写作增量；
 * - 只有番茄钟专注进行中的**正值**增量才计入。
 */
export function getWritableDelta(options: {
  currentWords: number;
  previousWords: number;
  chapterChanged: boolean;
  focusRunning: boolean;
}): number {
  const delta = options.currentWords - options.previousWords;
  if (options.chapterChanged || !options.focusRunning || delta <= 0) return 0;
  return Math.round(delta);
}
