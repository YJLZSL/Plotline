import { invoke } from '@/lib/ipc';
import type {
  ConnectEventsInput,
  CreateEventInput,
  Event,
  EventConnection,
  UpdateEventInput,
} from '@/types';

export function listEvents(workspaceId: string): Promise<Event[]> {
  return invoke<Event[]>('list_events', { workspaceId });
}

export function createEvent(input: CreateEventInput): Promise<Event> {
  return invoke<Event>('create_event', { input });
}

export function updateEvent(input: UpdateEventInput): Promise<Event> {
  return invoke<Event>('update_event', { input });
}

export function deleteEvent(id: string): Promise<void> {
  return invoke<void>('delete_event', { id });
}

export function connectEvents(input: ConnectEventsInput): Promise<void> {
  return invoke<void>('connect_events', { input });
}

export function disconnectEvents(sourceId: string, targetId: string): Promise<void> {
  return invoke<void>('disconnect_events', { sourceId, targetId });
}

export function listEventConnections(workspaceId: string): Promise<EventConnection[]> {
  return invoke<EventConnection[]>('list_event_connections', { workspaceId });
}

export interface ConsistencyConflict {
  characterId: string;
  dateValue: string;
  eventIds: string[];
  trackIds: string[];
}

export function checkConsistency(workspaceId: string): Promise<ConsistencyConflict[]> {
  return invoke<ConsistencyConflict[]>('check_consistency', { workspaceId });
}
