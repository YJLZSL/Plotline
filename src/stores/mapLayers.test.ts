import { describe, it, expect, beforeEach } from 'vitest';

import { MAP_LAYER_PALETTE, useMapLayersStore } from './mapLayers';

describe('mapLayers store', () => {
  beforeEach(() => {
    localStorage.clear();
    useMapLayersStore.setState({ groups: [] });
  });

  it('should initialize with an empty group list', () => {
    expect(useMapLayersStore.getState().groups).toEqual([]);
  });

  it('should create a visible group with the given name and color', () => {
    const id = useMapLayersStore.getState().createGroup('Main City', MAP_LAYER_PALETTE[0]);
    const groups = useMapLayersStore.getState().groups;

    expect(id).toBeTruthy();
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id,
      name: 'Main City',
      color: MAP_LAYER_PALETTE[0],
      locationIds: [],
      visible: true,
    });
  });

  it('should rename a group and trim the name', () => {
    const id = useMapLayersStore.getState().createGroup('Old', MAP_LAYER_PALETTE[0]);
    useMapLayersStore.getState().renameGroup(id, '  New Name  ');
    expect(useMapLayersStore.getState().groups[0]?.name).toBe('New Name');
  });

  it('should delete a group and return its locations to ungrouped', () => {
    const id = useMapLayersStore.getState().createGroup('Doomed', MAP_LAYER_PALETTE[0]);
    useMapLayersStore.getState().assignLocationToGroup(id, 'loc-1');
    expect(useMapLayersStore.getState().groups[0]?.locationIds).toEqual(['loc-1']);

    useMapLayersStore.getState().deleteGroup(id);
    expect(useMapLayersStore.getState().groups).toEqual([]);
  });

  it('should update group color', () => {
    const id = useMapLayersStore.getState().createGroup('Colored', MAP_LAYER_PALETTE[0]);
    useMapLayersStore.getState().setGroupColor(id, MAP_LAYER_PALETTE[1]);
    expect(useMapLayersStore.getState().groups[0]?.color).toBe(MAP_LAYER_PALETTE[1]);
  });

  it('should toggle group visibility', () => {
    const id = useMapLayersStore.getState().createGroup('Toggle', MAP_LAYER_PALETTE[0]);
    useMapLayersStore.getState().toggleGroupVisible(id);
    expect(useMapLayersStore.getState().groups[0]?.visible).toBe(false);
    useMapLayersStore.getState().toggleGroupVisible(id);
    expect(useMapLayersStore.getState().groups[0]?.visible).toBe(true);
  });

  it('should keep a location in exactly one group when reassigning', () => {
    const a = useMapLayersStore.getState().createGroup('A', MAP_LAYER_PALETTE[0]);
    const b = useMapLayersStore.getState().createGroup('B', MAP_LAYER_PALETTE[1]);

    useMapLayersStore.getState().assignLocationToGroup(a, 'loc-1');
    expect(useMapLayersStore.getState().groups.find((g) => g.id === a)?.locationIds).toEqual(['loc-1']);

    useMapLayersStore.getState().assignLocationToGroup(b, 'loc-1');
    const groups = useMapLayersStore.getState().groups;
    expect(groups.find((g) => g.id === a)?.locationIds).toEqual([]);
    expect(groups.find((g) => g.id === b)?.locationIds).toEqual(['loc-1']);
  });

  it('should not assign a location to a missing group', () => {
    const a = useMapLayersStore.getState().createGroup('A', MAP_LAYER_PALETTE[0]);
    useMapLayersStore.getState().assignLocationToGroup(a, 'loc-1');
    useMapLayersStore.getState().assignLocationToGroup('missing', 'loc-1');
    expect(useMapLayersStore.getState().groups.find((g) => g.id === a)?.locationIds).toEqual(['loc-1']);
  });

  it('should remove a location from all groups', () => {
    const a = useMapLayersStore.getState().createGroup('A', MAP_LAYER_PALETTE[0]);
    const b = useMapLayersStore.getState().createGroup('B', MAP_LAYER_PALETTE[1]);
    useMapLayersStore.getState().assignLocationToGroup(a, 'loc-1');
    useMapLayersStore.getState().assignLocationToGroup(b, 'loc-2');

    useMapLayersStore.getState().removeLocationFromGroup('loc-1');
    const groups = useMapLayersStore.getState().groups;
    expect(groups.find((g) => g.id === a)?.locationIds).toEqual([]);
    expect(groups.find((g) => g.id === b)?.locationIds).toEqual(['loc-2']);
  });

  it('should persist groups under the plotline:map-layers key', () => {
    const id = useMapLayersStore.getState().createGroup('Persisted', MAP_LAYER_PALETTE[0]);
    useMapLayersStore.getState().assignLocationToGroup(id, 'loc-1');

    const raw = localStorage.getItem('plotline:map-layers');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as {
      state: { groups: Array<{ id: string; name: string; locationIds: string[]; visible: boolean }> };
    };
    expect(parsed.state.groups).toHaveLength(1);
    expect(parsed.state.groups[0]).toMatchObject({
      id,
      name: 'Persisted',
      locationIds: ['loc-1'],
      visible: true,
    });
  });
});
