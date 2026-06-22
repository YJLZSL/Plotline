import { invoke } from '@/lib/ipc';
import type {
  CreateLocationInput,
  LinkLocationsInput,
  Location,
  LocationLink,
  UpdateLocationInput,
} from '@/types';

export function listLocations(workspaceId: string): Promise<Location[]> {
  return invoke<Location[]>('list_locations', { workspaceId });
}

export function createLocation(input: CreateLocationInput): Promise<Location> {
  return invoke<Location>('create_location', { input });
}

export function updateLocation(input: UpdateLocationInput): Promise<Location> {
  return invoke<Location>('update_location', { input });
}

export function deleteLocation(id: string): Promise<void> {
  return invoke<void>('delete_location', { id });
}

export function listLocationLinks(workspaceId: string): Promise<LocationLink[]> {
  return invoke<LocationLink[]>('list_location_links', { workspaceId });
}

export function linkLocations(input: LinkLocationsInput): Promise<void> {
  return invoke<void>('link_locations', { input });
}

export function unlinkLocations(sourceId: string, targetId: string): Promise<void> {
  return invoke<void>('unlink_locations', { sourceId, targetId });
}
