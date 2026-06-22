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
  characterIds: string[];
  createdAt: string;
  updatedAt: string;
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
  characterIds?: string[];
}

export interface ConnectEventsInput {
  sourceId: string;
  targetId: string;
  connectionType?: 'causal' | 'foreshadow';
}
