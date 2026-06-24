import { create } from 'zustand';

import type {
  Character,
  CreateCharacterInput,
  CreateEventInput,
  CreateNoteInput,
  CreateOutlineNodeInput,
  CreateTrackInput,
  Event,
  Note,
  OutlineNode,
  Track,
  UpdateCharacterInput,
  UpdateEventInput,
  UpdateNoteInput,
  UpdateOutlineNodeInput,
  UpdateTrackInput,
  UpdateWorkspaceInput,
  Workspace,
} from '@/types';

export type HistoryAction =
  | { type: 'createEvent'; workspaceId: string; input: CreateEventInput }
  | { type: 'updateEvent'; workspaceId: string; input: UpdateEventInput }
  | { type: 'deleteEvent'; workspaceId: string; id: string }
  | { type: 'createTrack'; workspaceId: string; input: CreateTrackInput }
  | { type: 'updateTrack'; workspaceId: string; input: UpdateTrackInput }
  | { type: 'deleteTrack'; workspaceId: string; id: string }
  | { type: 'createCharacter'; workspaceId: string; input: CreateCharacterInput }
  | { type: 'updateCharacter'; workspaceId: string; input: UpdateCharacterInput }
  | { type: 'deleteCharacter'; workspaceId: string; id: string }
  | { type: 'createNote'; workspaceId: string; input: CreateNoteInput }
  | { type: 'updateNote'; workspaceId: string; input: UpdateNoteInput }
  | { type: 'deleteNote'; workspaceId: string; id: string }
  | { type: 'createOutlineNode'; workspaceId: string; input: CreateOutlineNodeInput }
  | { type: 'updateOutlineNode'; workspaceId: string; input: UpdateOutlineNodeInput }
  | { type: 'deleteOutlineNode'; workspaceId: string; id: string }
  | { type: 'updateWorkspace'; workspaceId: string; input: UpdateWorkspaceInput };

interface HistoryItem {
  id: string;
  label: string;
  redo: HistoryAction;
  undo: HistoryAction;
}

interface HistoryState {
  stack: HistoryItem[];
  index: number;
  limit: number;
  canUndo: boolean;
  canRedo: boolean;
  push: (item: Omit<HistoryItem, 'id'>) => void;
  undo: () => HistoryAction | null;
  redo: () => HistoryAction | null;
  clear: () => void;
  peek: () => HistoryItem | null;
}

let seq = 0;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  stack: [],
  index: -1,
  limit: 50,
  canUndo: false,
  canRedo: false,

  push: (item) => {
    set((state) => {
      const next = state.stack.slice(0, state.index + 1);
      next.push({ ...item, id: `h-${++seq}` });
      if (next.length > state.limit) next.shift();
      const index = next.length - 1;
      return { stack: next, index, canUndo: index >= 0, canRedo: false };
    });
  },

  undo: () => {
    const state = get();
    if (state.index < 0) return null;
    const item = state.stack[state.index]!;
    set({ index: state.index - 1, canUndo: state.index - 1 >= 0, canRedo: true });
    return item.undo;
  },

  redo: () => {
    const state = get();
    if (state.index >= state.stack.length - 1) return null;
    const item = state.stack[state.index + 1]!;
    set({
      index: state.index + 1,
      canUndo: true,
      canRedo: state.index + 1 < state.stack.length - 1,
    });
    return item.redo;
  },

  clear: () => set({ stack: [], index: -1, canUndo: false, canRedo: false }),

  peek: () => {
    const state = get();
    return state.stack[state.index] ?? null;
  },
}));

export function makeCreateEventAction(
  workspaceId: string,
  created: Event,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `创建事件 "${created.title}"`,
    redo: {
      type: 'createEvent',
      workspaceId,
      input: {
        workspaceId,
        trackId: created.trackId,
        title: created.title,
        description: created.description,
        dateType: created.dateType,
        dateValue: created.dateValue,
        sortOrder: created.sortOrder,
        status: created.status,
        color: created.color,
        characterIds: created.characterIds,
      },
    },
    undo: { type: 'deleteEvent', workspaceId, id: created.id },
  };
}

export function makeUpdateEventAction(
  workspaceId: string,
  previous: Event,
  next: Event,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `更新事件 "${next.title}"`,
    redo: {
      type: 'updateEvent',
      workspaceId,
      input: {
        id: next.id,
        title: next.title,
        description: next.description,
        trackId: next.trackId,
        dateType: next.dateType,
        dateValue: next.dateValue,
        sortOrder: next.sortOrder,
        status: next.status,
        color: next.color,
        characterIds: next.characterIds,
      },
    },
    undo: {
      type: 'updateEvent',
      workspaceId,
      input: {
        id: previous.id,
        title: previous.title,
        description: previous.description,
        trackId: previous.trackId,
        dateType: previous.dateType,
        dateValue: previous.dateValue,
        sortOrder: previous.sortOrder,
        status: previous.status,
        color: previous.color,
        characterIds: previous.characterIds,
      },
    },
  };
}

export function makeDeleteEventAction(
  workspaceId: string,
  deleted: Event,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `删除事件 "${deleted.title}"`,
    redo: { type: 'deleteEvent', workspaceId, id: deleted.id },
    undo: {
      type: 'createEvent',
      workspaceId,
      input: {
        workspaceId,
        trackId: deleted.trackId,
        title: deleted.title,
        description: deleted.description,
        dateType: deleted.dateType,
        dateValue: deleted.dateValue,
        sortOrder: deleted.sortOrder,
        status: deleted.status,
        color: deleted.color,
        characterIds: deleted.characterIds,
      },
    },
  };
}

export function makeCreateTrackAction(
  workspaceId: string,
  created: Track,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `创建轨道 "${created.name}"`,
    redo: {
      type: 'createTrack',
      workspaceId,
      input: { workspaceId, name: created.name, color: created.color },
    },
    undo: { type: 'deleteTrack', workspaceId, id: created.id },
  };
}

export function makeUpdateTrackAction(
  workspaceId: string,
  previous: Track,
  next: Track,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `更新轨道 "${next.name}"`,
    redo: {
      type: 'updateTrack',
      workspaceId,
      input: { id: next.id, name: next.name, color: next.color, isVisible: next.isVisible },
    },
    undo: {
      type: 'updateTrack',
      workspaceId,
      input: {
        id: previous.id,
        name: previous.name,
        color: previous.color,
        isVisible: previous.isVisible,
      },
    },
  };
}

export function makeDeleteTrackAction(
  workspaceId: string,
  deleted: Track,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `删除轨道 "${deleted.name}"`,
    redo: { type: 'deleteTrack', workspaceId, id: deleted.id },
    undo: {
      type: 'createTrack',
      workspaceId,
      input: { workspaceId, name: deleted.name, color: deleted.color },
    },
  };
}

export function makeCreateCharacterAction(
  workspaceId: string,
  created: Character,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `创建角色 "${created.name}"`,
    redo: {
      type: 'createCharacter',
      workspaceId,
      input: {
        workspaceId,
        name: created.name,
        description: created.description,
        tags: created.tags,
        color: created.color,
      },
    },
    undo: { type: 'deleteCharacter', workspaceId, id: created.id },
  };
}

export function makeUpdateCharacterAction(
  workspaceId: string,
  previous: Character,
  next: Character,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `更新角色 "${next.name}"`,
    redo: {
      type: 'updateCharacter',
      workspaceId,
      input: {
        id: next.id,
        name: next.name,
        aliases: next.aliases,
        avatar: next.avatar,
        description: next.description,
        appearance: next.appearance,
        backstory: next.backstory,
        goals: next.goals,
        conflicts: next.conflicts,
        arc: next.arc,
        tags: next.tags,
        color: next.color,
      },
    },
    undo: {
      type: 'updateCharacter',
      workspaceId,
      input: {
        id: previous.id,
        name: previous.name,
        aliases: previous.aliases,
        avatar: previous.avatar,
        description: previous.description,
        appearance: previous.appearance,
        backstory: previous.backstory,
        goals: previous.goals,
        conflicts: previous.conflicts,
        arc: previous.arc,
        tags: previous.tags,
        color: previous.color,
      },
    },
  };
}

export function makeDeleteCharacterAction(
  workspaceId: string,
  deleted: Character,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `删除角色 "${deleted.name}"`,
    redo: { type: 'deleteCharacter', workspaceId, id: deleted.id },
    undo: {
      type: 'createCharacter',
      workspaceId,
      input: {
        workspaceId,
        name: deleted.name,
        description: deleted.description,
        tags: deleted.tags,
        color: deleted.color,
      },
    },
  };
}

export function makeCreateNoteAction(
  workspaceId: string,
  created: Note,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `创建笔记 "${created.title}"`,
    redo: {
      type: 'createNote',
      workspaceId,
      input: {
        workspaceId,
        title: created.title,
        content: created.content,
        tags: created.tags,
      },
    },
    undo: { type: 'deleteNote', workspaceId, id: created.id },
  };
}

export function makeUpdateNoteAction(
  workspaceId: string,
  previous: Note,
  next: Note,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `更新笔记 "${next.title}"`,
    redo: {
      type: 'updateNote',
      workspaceId,
      input: { id: next.id, title: next.title, content: next.content, tags: next.tags },
    },
    undo: {
      type: 'updateNote',
      workspaceId,
      input: {
        id: previous.id,
        title: previous.title,
        content: previous.content,
        tags: previous.tags,
      },
    },
  };
}

export function makeDeleteNoteAction(
  workspaceId: string,
  deleted: Note,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `删除笔记 "${deleted.title}"`,
    redo: { type: 'deleteNote', workspaceId, id: deleted.id },
    undo: {
      type: 'createNote',
      workspaceId,
      input: {
        workspaceId,
        title: deleted.title,
        content: deleted.content,
        tags: deleted.tags,
      },
    },
  };
}

export function makeCreateOutlineNodeAction(
  workspaceId: string,
  created: OutlineNode,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `创建大纲节点 "${created.title}"`,
    redo: {
      type: 'createOutlineNode',
      workspaceId,
      input: {
        workspaceId,
        type: created.type,
        title: created.title,
        content: created.content,
        parentId: created.parentId ?? undefined,
        eventId: created.eventId ?? undefined,
      },
    },
    undo: { type: 'deleteOutlineNode', workspaceId, id: created.id },
  };
}

export function makeUpdateOutlineNodeAction(
  workspaceId: string,
  previous: OutlineNode,
  next: OutlineNode,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `更新大纲节点 "${next.title}"`,
    redo: {
      type: 'updateOutlineNode',
      workspaceId,
      input: {
        id: next.id,
        title: next.title,
        content: next.content,
        eventId: next.eventId ?? undefined,
        status: next.status,
      },
    },
    undo: {
      type: 'updateOutlineNode',
      workspaceId,
      input: {
        id: previous.id,
        title: previous.title,
        content: previous.content,
        eventId: previous.eventId ?? undefined,
        status: previous.status,
      },
    },
  };
}

export function makeDeleteOutlineNodeAction(
  workspaceId: string,
  deleted: OutlineNode,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  return {
    label: `删除大纲节点 "${deleted.title}"`,
    redo: { type: 'deleteOutlineNode', workspaceId, id: deleted.id },
    undo: {
      type: 'createOutlineNode',
      workspaceId,
      input: {
        workspaceId,
        type: deleted.type,
        title: deleted.title,
        content: deleted.content,
        parentId: deleted.parentId ?? undefined,
        eventId: deleted.eventId ?? undefined,
      },
    },
  };
}

export function makeUpdateWorkspaceAction(
  workspaceId: string,
  previous: Workspace,
  next: Workspace,
): { redo: HistoryAction; undo: HistoryAction; label: string } {
  const toInput = (w: Workspace): UpdateWorkspaceInput => ({
    id: w.id,
    name: w.name,
    description: w.description,
    coverColor: w.coverColor,
    settings: w.settings,
  });
  return {
    label: `编辑工作区 "${next.name}"`,
    redo: { type: 'updateWorkspace', workspaceId, input: toInput(next) },
    undo: { type: 'updateWorkspace', workspaceId, input: toInput(previous) },
  };
}
