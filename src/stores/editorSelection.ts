import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

export type RegisteredEditorType = 'novel' | 'notebook' | 'outline';

export interface EditorSelectionState {
  type: RegisteredEditorType | null;
  editor: Editor | null;
  nodeId: string | null;
  content: string | null;
  selection: { from: number; to: number } | null;
  registerEditor: (type: 'novel' | 'notebook', editor: Editor) => void;
  registerTextEditor: (
    type: 'outline',
    nodeId: string,
    content: string,
  ) => void;
  unregisterEditor: () => void;
  updateSelection: (from: number, to: number) => void;
  updateContent: (content: string) => void;
}

export const useEditorSelectionStore = create<EditorSelectionState>()(
  (set) => ({
    type: null,
    editor: null,
    nodeId: null,
    content: null,
    selection: null,
    registerEditor: (type, editor) =>
      set({
        type,
        editor,
        nodeId: null,
        content: null,
        selection: {
          from: editor.state.selection.from,
          to: editor.state.selection.to,
        },
      }),
    registerTextEditor: (type, nodeId, content) =>
      set({
        type,
        editor: null,
        nodeId,
        content,
        selection: null,
      }),
    unregisterEditor: () =>
      set({
        type: null,
        editor: null,
        nodeId: null,
        content: null,
        selection: null,
      }),
    updateSelection: (from, to) => set({ selection: { from, to } }),
    updateContent: (content) => set({ content }),
  }),
);
