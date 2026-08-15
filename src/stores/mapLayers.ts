import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MapLayerGroup {
  id: string;
  name: string;
  color: string;
  locationIds: string[];
  visible: boolean;
}

export const MAP_LAYER_PALETTE = [
  '#F4B6C2',
  '#B6D4F4',
  '#B6F4C8',
  '#F4E4B6',
  '#D8B6F4',
  '#F4CBB6',
] as const;

interface MapLayersState {
  groups: MapLayerGroup[];
  createGroup: (name: string, color: string) => string;
  renameGroup: (id: string, name: string) => void;
  deleteGroup: (id: string) => void;
  setGroupColor: (id: string, color: string) => void;
  toggleGroupVisible: (id: string) => void;
  assignLocationToGroup: (groupId: string, locationId: string) => void;
  removeLocationFromGroup: (locationId: string) => void;
}

function createGroupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useMapLayersStore = create<MapLayersState>()(
  persist(
    (set, get) => ({
      groups: [],
      createGroup: (name, color) => {
        const id = createGroupId();
        set((state) => ({
          groups: [
            ...state.groups,
            {
              id,
              name: name.trim(),
              color,
              locationIds: [],
              visible: true,
            },
          ],
        }));
        return id;
      },
      renameGroup: (id, name) => {
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, name: name.trim() } : group,
          ),
        }));
      },
      deleteGroup: (id) => {
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== id),
        }));
      },
      setGroupColor: (id, color) => {
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, color } : group,
          ),
        }));
      },
      toggleGroupVisible: (id) => {
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, visible: !group.visible } : group,
          ),
        }));
      },
      assignLocationToGroup: (groupId, locationId) => {
        if (!get().groups.some((group) => group.id === groupId)) return;
        set((state) => ({
          groups: state.groups.map((group) => {
            if (group.id === groupId) {
              return {
                ...group,
                locationIds: group.locationIds.includes(locationId)
                  ? group.locationIds
                  : [...group.locationIds, locationId],
              };
            }
            return {
              ...group,
              locationIds: group.locationIds.filter((id) => id !== locationId),
            };
          }),
        }));
      },
      removeLocationFromGroup: (locationId) => {
        set((state) => ({
          groups: state.groups.map((group) => ({
            ...group,
            locationIds: group.locationIds.filter((id) => id !== locationId),
          })),
        }));
      },
    }),
    {
      name: 'plotline:map-layers',
      partialize: (state) => ({ groups: state.groups }),
    },
  ),
);
