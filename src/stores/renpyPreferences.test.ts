import { beforeEach, describe, expect, it } from 'vitest';

import { useRenpyPreferencesStore } from './renpyPreferences';

describe('renpyPreferences store', () => {
  beforeEach(() => {
    localStorage.clear();
    useRenpyPreferencesStore.setState({ transition: 'dissolve', variablesText: '' });
  });

  it('should initialize with dissolve and empty variables text', () => {
    const state = useRenpyPreferencesStore.getState();
    expect(state.transition).toBe('dissolve');
    expect(state.variablesText).toBe('');
  });

  it('should update transition and variables text', () => {
    useRenpyPreferencesStore.getState().setTransition('fade');
    useRenpyPreferencesStore.getState().setVariablesText('day = 1\ngold = 10\n');

    const state = useRenpyPreferencesStore.getState();
    expect(state.transition).toBe('fade');
    expect(state.variablesText).toBe('day = 1\ngold = 10\n');
  });

  it('should reset to default values', () => {
    useRenpyPreferencesStore.getState().setTransition('none');
    useRenpyPreferencesStore.getState().setVariablesText('day = 1');
    useRenpyPreferencesStore.getState().reset();

    const state = useRenpyPreferencesStore.getState();
    expect(state.transition).toBe('dissolve');
    expect(state.variablesText).toBe('');
  });

  it('should persist under the plotline:renpy-export key with partialize', () => {
    const persistApi = useRenpyPreferencesStore.persist;
    const options = persistApi.getOptions();

    expect(options.name).toBe('plotline:renpy-export');
    expect(typeof options.partialize).toBe('function');

    const state = useRenpyPreferencesStore.getState();
    expect(options.partialize?.(state)).toEqual({
      transition: state.transition,
      variablesText: state.variablesText,
    });
  });
});
