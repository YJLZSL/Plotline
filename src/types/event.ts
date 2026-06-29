export type EventStatus = 'draft' | 'done' | 'revise';
export type DateType = 'absolute' | 'relative';

export interface Event {
  id: string;
  workspaceId: string;
  trackId: string;
  title: string;
  description: string;
  dateType: DateType;
  dateValue: string;
  sortOrder: number;
  status: EventStatus;
  color: string | null;
  locationId: string | null;
  imageUrls: string[];
  characterIds: string[];
  connectedEventIds: string[];
  createdAt: string;
  updatedAt: string;
  /**
   * 可选的结束时间（ISO 8601）。
   *
   * 当事件为绝对事件且需要独立指定结束时间时使用；
   * 若未提供，则从 `dateValue` 中的范围语法（"2027-12-03 14:00 – 16:00"）解析。
   * 前端独立维护，后端 `dateValue` 字段足以承载 ISO 8601 datetime。
   */
  endDateTime?: string | null;
  /**
   * 相对事件绑定的锚点事件 id。
   *
   * 用于 `formatEventTimeRange` 输出 "相对 #<anchorId> · +2d" 格式；
   * 未提供时回退到 `sortOrder + 1`。
   */
  relativeTo?: string | null;
  /**
   * 相对事件相对锚点事件的天数偏移。
   *
   * 0 表示同步，正数表示延后，负数表示提前。
   * 未提供时不显示偏移信息。
   */
  relativeOffsetDays?: number | null;
}

export interface EventConnection {
  sourceId: string;
  targetId: string;
  sourceTitle: string;
  targetTitle: string;
  connectionType: 'causal' | 'foreshadow';
}

export interface CreateEventInput {
  workspaceId: string;
  trackId: string;
  title: string;
  description?: string;
  dateType?: DateType;
  dateValue?: string;
  sortOrder?: number;
  status?: EventStatus;
  color?: string | null;
  locationId?: string | null;
  imageUrls?: string[];
  characterIds?: string[];
}

export interface UpdateEventInput {
  id: string;
  title?: string;
  description?: string;
  trackId?: string;
  dateType?: DateType;
  dateValue?: string;
  sortOrder?: number;
  status?: EventStatus;
  color?: string | null;
  locationId?: string | null;
  imageUrls?: string[];
  characterIds?: string[];
}

export interface ConnectEventsInput {
  sourceId: string;
  targetId: string;
  connectionType?: 'causal' | 'foreshadow';
}
