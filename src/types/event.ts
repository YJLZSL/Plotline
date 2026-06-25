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
  characterIds: string[];
  connectedEventIds: string[];
  createdAt: string;
  updatedAt: string;
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
  characterIds?: string[];
}

export interface ConnectEventsInput {
  sourceId: string;
  targetId: string;
  connectionType?: 'causal' | 'foreshadow';
}
