import { describe, it, expect, beforeEach } from 'vitest';

import { useEditorSelectionStore } from './editorSelection';

const mockEditor = {
  state: {
    selection: { from: 5, to: 10 },
  },
} as unknown as import('@tiptap/react').Editor;

describe('editorSelection store', () => {
  beforeEach(() => {
    useEditorSelectionStore.getState().unregisterEditor();
  });

  it('should register a TipTap editor and store its selection', () => {
    useEditorSelectionStore.getState().registerEditor('novel', mockEditor);
    const state = useEditorSelectionStore.getState();
    expect(state.type).toBe('novel');
    expect(state.editor).toBe(mockEditor);
    expect(state.selection).toEqual({ from: 5, to: 10 });
    expect(state.nodeId).toBeNull();
    expect(state.content).toBeNull();
  });

  it('should register a text editor and store node id and content', () => {
    useEditorSelectionStore.getState().registerTextEditor('outline', 'n1', 'content');
    const state = useEditorSelectionStore.getState();
    expect(state.type).toBe('outline');
    expect(state.nodeId).toBe('n1');
    expect(state.content).toBe('content');
    expect(state.editor).toBeNull();
  });

  it('should update selection', () => {
    useEditorSelectionStore.getState().registerEditor('notebook', mockEditor);
    useEditorSelectionStore.getState().updateSelection(20, 30);
    expect(useEditorSelectionStore.getState().selection).toEqual({ from: 20, to: 30 });
  });

  it('should update content', () => {
    useEditorSelectionStore.getState().registerTextEditor('outline', 'n1', 'old');
    useEditorSelectionStore.getState().updateContent('new');
    expect(useEditorSelectionStore.getState().content).toBe('new');
  });

  it('should reset state on unregister', () => {
    useEditorSelectionStore.getState().registerEditor('novel', mockEditor);
    useEditorSelectionStore.getState().unregisterEditor();
    const state = useEditorSelectionStore.getState();
    expect(state.type).toBeNull();
    expect(state.editor).toBeNull();
    expect(state.nodeId).toBeNull();
    expect(state.content).toBeNull();
    expect(state.selection).toBeNull();
  });
});
