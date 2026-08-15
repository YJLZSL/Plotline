import { describe, it, expect, beforeEach } from 'vitest';

import { shouldShowMigrationBanner, useTimelineMigrationStore } from './timelineMigration';

describe('timelineMigration store', () => {
  beforeEach(() => {
    useTimelineMigrationStore.setState({ dismissedWorkspaces: [] });
  });

  it('should dismiss a workspace once without duplicates', () => {
    useTimelineMigrationStore.getState().dismiss('ws1');
    useTimelineMigrationStore.getState().dismiss('ws1');

    expect(useTimelineMigrationStore.getState().dismissedWorkspaces).toEqual(['ws1']);
  });

  it('should reset dismissed workspaces', () => {
    useTimelineMigrationStore.getState().dismiss('ws1');
    useTimelineMigrationStore.getState().reset();
    expect(useTimelineMigrationStore.getState().dismissedWorkspaces).toEqual([]);
  });
});

describe('shouldShowMigrationBanner', () => {
  it('should show only when connections exist and not dismissed', () => {
    expect(shouldShowMigrationBanner([], 'ws1', 3)).toBe(true);
    expect(shouldShowMigrationBanner([], 'ws1', 0)).toBe(false);
    expect(shouldShowMigrationBanner(['ws1'], 'ws1', 3)).toBe(false);
  });
});
