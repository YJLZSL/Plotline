import { listCharacters } from '@/features/characters/api';
import { listLocations } from '@/features/map/api';
import { listNotes } from '@/features/notebook/api';
import { listOutlineNodes } from '@/features/outline/api';
import { listTracks } from '@/features/timeline/api';
import { listEvents } from '@/features/timeline/eventApi';
import type {
  AiChatContext,
  AiChatContextSelectedEntity,
  AiContextScope,
} from '@/types/ai';
import type { AiSelection } from '@/stores/aiContext';

export type AiContextSource =
  | 'workspaceSummary'
  | 'timeline'
  | 'characters'
  | 'locations'
  | 'outline'
  | 'notes'
  | 'selectedEntity';

const MAX_ITEMS = 50;
const MAX_DESC_LENGTH = 200;

export function truncateText(
  text: string | undefined | null,
  maxLength: number,
): string | undefined {
  if (!text) return undefined;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

function limit<T>(items: T[]): T[] {
  return items.slice(0, MAX_ITEMS);
}

function sourcesForScope(scope: AiContextScope): AiContextSource[] {
  switch (scope) {
    case 'selected_entity':
      return ['workspaceSummary', 'selectedEntity'];
    case 'current_view':
      return ['workspaceSummary', 'timeline', 'selectedEntity'];
    case 'whole_workspace':
    default:
      return ['workspaceSummary', 'timeline', 'characters', 'locations', 'outline', 'notes', 'selectedEntity'];
  }
}

export async function collectAiContext(
  workspaceId: string,
  sources: AiContextSource[],
  selection?: AiSelection | null,
  scope?: AiContextScope,
): Promise<AiChatContext> {
  const effectiveSources = scope ? sourcesForScope(scope) : sources;
  const enabled = new Set(effectiveSources);
  const context: AiChatContext = { scope };

  if (enabled.has('workspaceSummary')) {
    // workspaceSummary 由调用方（如 AiAssistantPanel）从 aiKv 传入。
    // 本工具专注于动态抓取数据，因此此处留空由面板合并。
  }

  if (enabled.has('timeline')) {
    const [events, tracks] = await Promise.all([
      listEvents(workspaceId),
      listTracks(workspaceId),
    ]);
    const trackMap = new Map(tracks.map((t) => [t.id, t.name]));
    context.timeline = limit(
      events.map((event) => ({
        id: event.id,
        title: event.title,
        dateValue: event.dateValue || undefined,
        trackName: trackMap.get(event.trackId) || '',
        description: truncateText(event.description, MAX_DESC_LENGTH),
      })),
    );
  }

  if (enabled.has('characters')) {
    const characters = await listCharacters(workspaceId);
    context.characters = limit(
      characters.map((character) => ({
        id: character.id,
        name: character.name,
        description: truncateText(character.description, MAX_DESC_LENGTH),
        role: character.tags.length > 0 ? character.tags.join(', ') : undefined,
      })),
    );
  }

  if (enabled.has('locations')) {
    const locations = await listLocations(workspaceId);
    context.locations = limit(
      locations.map((location) => ({
        id: location.id,
        name: location.name,
        description: truncateText(location.description, MAX_DESC_LENGTH),
      })),
    );
  }

  if (enabled.has('outline')) {
    const nodes = await listOutlineNodes(workspaceId);
    const levelMap = new Map<string, number>();
    const computeLevel = (nodeId: string | null): number => {
      if (nodeId === null) return -1;
      if (levelMap.has(nodeId)) return levelMap.get(nodeId)!;
      const node = nodes.find((n) => n.id === nodeId);
      const level = node ? computeLevel(node.parentId) + 1 : 0;
      levelMap.set(nodeId, level);
      return level;
    };
    context.outline = limit(
      nodes.map((node) => ({
        id: node.id,
        title: node.title,
        level: computeLevel(node.id),
        parentId: node.parentId,
      })),
    );
  }

  if (enabled.has('notes')) {
    const notes = await listNotes(workspaceId);
    context.notes = limit(
      notes
        .filter((note) => !note.isFolder)
        .map((note) => ({
          id: note.id,
          title: note.title,
          summary: truncateText(note.content, MAX_DESC_LENGTH),
        })),
    );
  }

  if (enabled.has('selectedEntity') && selection) {
    const entity: AiChatContextSelectedEntity = {
      type: selection.type,
      id: selection.id,
      label: selection.label,
      content: truncateText(selection.content, MAX_DESC_LENGTH),
    };
    context.selectedEntity = entity;
  }

  return context;
}
