import { invoke } from '@/lib/ipc';
import type {
  CreateNoteInput,
  Note,
  UpdateNoteInput,
} from '@/types';

export function listNotes(workspaceId: string): Promise<Note[]> {
  return invoke<Note[]>('list_notes', { workspaceId });
}

export function createNote(input: CreateNoteInput): Promise<Note> {
  return invoke<Note>('create_note', { input });
}

export function updateNote(input: UpdateNoteInput): Promise<Note> {
  return invoke<Note>('update_note', { input });
}

export function deleteNote(id: string): Promise<void> {
  return invoke<void>('delete_note', { id });
}
