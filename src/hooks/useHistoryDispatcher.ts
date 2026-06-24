import { useQueryClient } from '@tanstack/react-query';

import type { HistoryAction } from '@/stores/historyStore';
import { eventsKey, tracksKey } from '@/features/timeline/hooks';
import { charactersKey } from '@/features/characters/hooks';
import { notesKey } from '@/features/notebook/hooks';
import { outlineNodesKey } from '@/features/outline/hooks';
import {
  createEvent as apiCreateEvent,
  deleteEvent as apiDeleteEvent,
  updateEvent as apiUpdateEvent,
} from '@/features/timeline/eventApi';
import {
  createTrack as apiCreateTrack,
  deleteTrack as apiDeleteTrack,
  updateTrack as apiUpdateTrack,
} from '@/features/timeline/api';
import {
  createCharacter as apiCreateCharacter,
  deleteCharacter as apiDeleteCharacter,
  updateCharacter as apiUpdateCharacter,
} from '@/features/characters/api';
import {
  createNote as apiCreateNote,
  deleteNote as apiDeleteNote,
  updateNote as apiUpdateNote,
} from '@/features/notebook/api';
import {
  createOutlineNode as apiCreateOutlineNode,
  deleteOutlineNode as apiDeleteOutlineNode,
  updateOutlineNode as apiUpdateOutlineNode,
} from '@/features/outline/api';
import { updateWorkspace as apiUpdateWorkspace } from '@/features/workspace/api';

export function useHistoryDispatcher() {
  const qc = useQueryClient();

  return async function dispatch(action: HistoryAction): Promise<void> {
    switch (action.type) {
      case 'createEvent': {
        await apiCreateEvent(action.input);
        break;
      }
      case 'updateEvent': {
        await apiUpdateEvent(action.input);
        break;
      }
      case 'deleteEvent': {
        await apiDeleteEvent(action.id);
        break;
      }
      case 'createTrack': {
        await apiCreateTrack(action.input);
        break;
      }
      case 'updateTrack': {
        await apiUpdateTrack(action.input);
        break;
      }
      case 'deleteTrack': {
        await apiDeleteTrack(action.id);
        break;
      }
      case 'createCharacter': {
        await apiCreateCharacter(action.input);
        break;
      }
      case 'updateCharacter': {
        await apiUpdateCharacter(action.input);
        break;
      }
      case 'deleteCharacter': {
        await apiDeleteCharacter(action.id);
        break;
      }
      case 'createNote': {
        await apiCreateNote(action.input);
        break;
      }
      case 'updateNote': {
        await apiUpdateNote(action.input);
        break;
      }
      case 'deleteNote': {
        await apiDeleteNote(action.id);
        break;
      }
      case 'createOutlineNode': {
        await apiCreateOutlineNode(action.input);
        break;
      }
      case 'updateOutlineNode': {
        await apiUpdateOutlineNode(action.input);
        break;
      }
      case 'deleteOutlineNode': {
        await apiDeleteOutlineNode(action.id);
        break;
      }
      case 'updateWorkspace': {
        await apiUpdateWorkspace(action.input);
        break;
      }
      default:
        return;
    }

    void qc.invalidateQueries({ queryKey: [action.workspaceId] });
    void qc.invalidateQueries({ queryKey: eventsKey(action.workspaceId) });
    void qc.invalidateQueries({ queryKey: tracksKey(action.workspaceId) });
    void qc.invalidateQueries({ queryKey: charactersKey(action.workspaceId) });
    void qc.invalidateQueries({ queryKey: notesKey(action.workspaceId) });
    void qc.invalidateQueries({ queryKey: outlineNodesKey(action.workspaceId) });
    void qc.invalidateQueries({ queryKey: ['workspaces'] });
    void qc.invalidateQueries({ queryKey: ['workspace', action.workspaceId] });
  };
}
