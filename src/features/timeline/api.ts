import { invoke } from '@/lib/ipc';
import type {
  CreateTrackInput,
  ReorderTracksInput,
  Track,
  UpdateTrackInput,
} from '@/types';

export function listTracks(workspaceId: string): Promise<Track[]> {
  return invoke<Track[]>('list_tracks', { workspaceId });
}

export function createTrack(input: CreateTrackInput): Promise<Track> {
  return invoke<Track>('create_track', { input });
}

export function updateTrack(input: UpdateTrackInput): Promise<Track> {
  return invoke<Track>('update_track', { input });
}

export function deleteTrack(id: string): Promise<void> {
  return invoke<void>('delete_track', { id });
}

export function reorderTracks(input: ReorderTracksInput): Promise<Track[]> {
  return invoke<Track[]>('reorder_tracks', { input });
}
