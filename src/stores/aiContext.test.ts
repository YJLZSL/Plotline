import { describe, it, expect, beforeEach } from 'vitest';

import { useAiContextStore } from './aiContext';

describe('aiContext store', () => {
  beforeEach(() => {
    useAiContextStore.setState({
      view: 'unknown',
      viewLabel: '',
      selection: null,
      suggestions: [],
      enabledSources: [
        'workspaceSummary',
        'timeline',
        'characters',
        'outline',
        'notes',
        'selectedEntity',
      ],
    });
  });

  it('should have default enabled sources including all workspace context types', () => {
    const state = useAiContextStore.getState();
    expect(state.enabledSources).toEqual([
      'workspaceSummary',
      'timeline',
      'characters',
      'outline',
      'notes',
      'selectedEntity',
    ]);
  });

  it('should update context view and label', () => {
    useAiContextStore.getState().setContext({ view: 'timeline', viewLabel: '时间轴' });
    const state = useAiContextStore.getState();
    expect(state.view).toBe('timeline');
    expect(state.viewLabel).toBe('时间轴');
  });

  it('should set and clear selection', () => {
    const selection = { type: 'event', id: 'e1', label: '开场' };
    useAiContextStore.getState().setSelection(selection);
    expect(useAiContextStore.getState().selection).toEqual(selection);

    useAiContextStore.getState().clearSelection();
    expect(useAiContextStore.getState().selection).toBeNull();
  });

  it('should replace enabled sources', () => {
    useAiContextStore.getState().setEnabledSources(['workspaceSummary', 'timeline']);
    expect(useAiContextStore.getState().enabledSources).toEqual(['workspaceSummary', 'timeline']);
  });
});
