/**
 * Mock IPC 实现：用 localStorage 模拟后端 SQLite。
 * 仅在纯 Web 模式下使用（import.meta.env.MODE === 'web' 或浏览器环境）。
 * 数据 schema 与 Rust 后端保持一致，便于切换。
 */

import type {
  AppSettings,
  Character,
  CharacterRelationship,
  CreateCharacterInput,
  CreateEventInput,
  CreateNoteInput,
  CreateOutlineNodeInput,
  CreateRelationshipInput,
  CreateTrackInput,
  CreateWorkspaceInput,
  Event,
  EventConnection,
  MoveOutlineNodeInput,
  Note,
  OutlineNode,
  ReorderTracksInput,
  Statistics,
  Track,
  UpdateCharacterInput,
  UpdateEventInput,
  UpdateNoteInput,
  UpdateOutlineNodeInput,
  UpdateRelationshipInput,
  UpdateSettingsInput,
  UpdateTrackInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceBundle,
} from '@/types';

interface MockDB {
  workspaces: Workspace[];
  tracks: Track[];
  events: Event[];
  characters: Character[];
  relationships: CharacterRelationship[];
  eventConnections: EventConnection[];
  outlineNodes: OutlineNode[];
  notes: Note[];
  settings: AppSettings;
}

const STORAGE_KEY = 'plotline:mock-db';
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  accentColor: '#C68A3E',
  language: 'zh-CN',
  editorFont: 'JetBrains Mono',
  uiFont: 'Inter',
  fontSize: 14,
  backupPath: '',
  autoBackup: true,
  backupIntervalHours: 24,
  defaultView: 'timeline',
  timelineZoom: 'month',
};

const TRACK_PALETTE = ['#F4B6C2', '#B6D4F4', '#B6F4C8', '#F4E4B6', '#D8B6F4', '#F4CBB6'];

function loadDB(): MockDB {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as MockDB;
    } catch {
      // fallthrough to defaults
    }
  }
  const db: MockDB = {
    workspaces: [],
    tracks: [],
    events: [],
    characters: [],
    relationships: [],
    eventConnections: [],
    outlineNodes: [],
    notes: [],
    settings: { ...DEFAULT_SETTINGS },
  };
  saveDB(db);
  return db;
}

function saveDB(db: MockDB): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowISO(): string {
  return new Date().toISOString();
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function notFound(msg: string): never {
  throw { code: 'NOT_FOUND', message: msg };
}

function invalidInput(msg: string): never {
  throw { code: 'INVALID_INPUT', message: msg };
}

function forbidden(msg: string): never {
  throw { code: 'FORBIDDEN', message: msg };
}

function seedTemplate(db: MockDB, workspaceId: string, template: string): void {
  const now = nowISO();
  const mk = (name: string, color: string, order: number): Track => ({
    id: uuid(),
    workspaceId,
    name,
    color,
    sortOrder: order,
    isVisible: true,
    createdAt: now,
  });
  if (template === 'hero-journey') {
    db.tracks.push(
      mk('主线', '#F4B6C2', 0),
      mk('召唤', '#B6D4F4', 1),
      mk('试炼', '#B6F4C8', 2),
      mk('归来', '#F4E4B6', 3),
    );
  } else if (template === 'three-act') {
    db.tracks.push(
      mk('第一幕 - 建置', '#F4B6C2', 0),
      mk('第二幕 - 冲突', '#B6D4F4', 1),
      mk('第三幕 - 解决', '#B6F4C8', 2),
    );
  } else {
    db.tracks.push(mk('主线', '#F4B6C2', 0));
  }
}

export async function mockIpc<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const db = loadDB();
  const result = handle(db, command, args ?? {});
  saveDB(db);
  return result as T;
}

function handle(db: MockDB, command: string, args: Record<string, unknown>): unknown {
  switch (command) {
    // ===== workspace =====
    case 'list_workspaces':
      return [...db.workspaces].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case 'get_workspace': {
      const ws = db.workspaces.find((w) => w.id === args.id);
      if (!ws) notFound(`工作区 ${args.id} 不存在`);
      return ws;
    }
    case 'create_workspace': {
      const input = args.input as CreateWorkspaceInput;
      if (!input.name?.trim()) invalidInput('名称不能为空');
      const now = nowISO();
      const ws: Workspace = {
        id: uuid(),
        name: input.name,
        description: input.description ?? '',
        template: input.template ?? 'blank',
        coverColor: input.coverColor ?? '#C68A3E',
        settings: {},
        createdAt: now,
        updatedAt: now,
      };
      db.workspaces.push(ws);
      seedTemplate(db, ws.id, ws.template);
      return ws;
    }
    case 'update_workspace': {
      const input = args.input as UpdateWorkspaceInput;
      const ws = db.workspaces.find((w) => w.id === input.id);
      if (!ws) notFound(`工作区 ${input.id} 不存在`);
      if (input.name !== undefined) ws.name = input.name;
      if (input.description !== undefined) ws.description = input.description;
      if (input.coverColor !== undefined) ws.coverColor = input.coverColor;
      if (input.settings !== undefined) ws.settings = input.settings;
      ws.updatedAt = nowISO();
      return ws;
    }
    case 'delete_workspace': {
      const id = args.id as string;
      db.workspaces = db.workspaces.filter((w) => w.id !== id);
      db.tracks = db.tracks.filter((t) => t.workspaceId !== id);
      db.events = db.events.filter((e) => e.workspaceId !== id);
      db.characters = db.characters.filter((c) => c.workspaceId !== id);
      db.relationships = db.relationships.filter((r) => r.workspaceId !== id);
      db.outlineNodes = db.outlineNodes.filter((o) => o.workspaceId !== id);
      db.notes = db.notes.filter((n) => n.workspaceId !== id);
      return null;
    }
    case 'export_workspace': {
      const id = args.id as string;
      const ws = db.workspaces.find((w) => w.id === id);
      if (!ws) notFound(`工作区 ${id} 不存在`);
      const bundle: WorkspaceBundle = {
        version: 1,
        workspace: deepClone(ws),
        tracks: db.tracks.filter((t) => t.workspaceId === id).map(deepClone),
        events: db.events.filter((e) => e.workspaceId === id).map(deepClone),
        characters: db.characters.filter((c) => c.workspaceId === id).map(deepClone),
        relationships: db.relationships.filter((r) => r.workspaceId === id).map(deepClone),
        eventConnections: db.eventConnections
          .filter(
            (c) =>
              db.events.find((e) => e.id === c.sourceId)?.workspaceId === id &&
              db.events.find((e) => e.id === c.targetId)?.workspaceId === id,
          )
          .map(deepClone),
        outlineNodes: db.outlineNodes.filter((o) => o.workspaceId === id).map(deepClone),
        notes: db.notes.filter((n) => n.workspaceId === id).map(deepClone),
      };
      return bundle;
    }
    case 'export_workspace_markdown': {
      const id = args.id as string;
      const ws = db.workspaces.find((w) => w.id === id);
      if (!ws) notFound(`工作区 ${id} 不存在`);
      const events = db.events.filter((e) => e.workspaceId === id);
      const tracks = db.tracks.filter((t) => t.workspaceId === id);
      const characters = db.characters.filter((c) => c.workspaceId === id);
      const outline = db.outlineNodes.filter((o) => o.workspaceId === id);
      const notes = db.notes.filter((n) => n.workspaceId === id);

      let md = `# ${ws.name}\n\n`;
      if (ws.description) md += `${ws.description}\n\n`;
      md += '## 角色\n\n';
      for (const c of characters) {
        md += `### ${c.name}\n\n${c.description || ''}\n\n`;
      }
      md += '## 时间线\n\n';
      for (const t of tracks) {
        md += `### ${t.name}\n\n`;
        for (const e of events.filter((e) => e.trackId === t.id)) {
          const status = e.status === 'done' ? '完成' : e.status === 'revise' ? '待修改' : '草稿';
          md += `#### ${e.title}（${e.dateValue || '无日期'} - ${status}）\n\n${e.description || '（无描述）'}\n\n`;
        }
      }
      md += '## 大纲\n\n';
      const appendOutline = (parentId: string | null, depth: number) => {
        const prefix = '#'.repeat(depth + 2);
        const children = outline.filter((o) => o.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
        for (let i = 0; i < children.length; i++) {
          const node = children[i]!;
          md += `${prefix} ${i + 1}. ${node.title}\n\n`;
          if (node.content) md += `${node.content}\n\n`;
          appendOutline(node.id, depth + 1);
        }
      };
      appendOutline(null, 0);
      md += '## 笔记\n\n';
      for (const n of notes) {
        md += `### ${n.title}\n\n${n.content}\n\n`;
      }
      return md;
    }
    case 'export_outline_markdown': {
      const id = args.id as string;
      const ws = db.workspaces.find((w) => w.id === id);
      if (!ws) notFound(`工作区 ${id} 不存在`);
      const outline = db.outlineNodes.filter((o) => o.workspaceId === id);
      let md = `# ${ws.name} - 大纲\n\n`;
      const appendOutline = (parentId: string | null, depth: number) => {
        const prefix = '#'.repeat(depth + 2);
        const children = outline.filter((o) => o.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
        for (let i = 0; i < children.length; i++) {
          const node = children[i]!;
          md += `${prefix} ${i + 1}. ${node.title}\n\n`;
          if (node.content) md += `${node.content}\n\n`;
          appendOutline(node.id, depth + 1);
        }
      };
      appendOutline(null, 0);
      return md;
    }
    case 'import_workspace': {
      const bundle = args.bundle as WorkspaceBundle;
      if (!bundle.workspace.name?.trim()) invalidInput('工作区名称不能为空');
      const now = nowISO();
      const newWsId = uuid();
      const newWs: Workspace = {
        ...deepClone(bundle.workspace),
        id: newWsId,
        name: `${bundle.workspace.name}（导入）`,
        createdAt: now,
        updatedAt: now,
      };
      db.workspaces.push(newWs);
      const trackMap = new Map<string, string>();
      for (const t of bundle.tracks) {
        const newId = uuid();
        trackMap.set(t.id, newId);
        db.tracks.push({ ...deepClone(t), id: newId, workspaceId: newWsId });
      }
      const charMap = new Map<string, string>();
      for (const c of bundle.characters) {
        const newId = uuid();
        charMap.set(c.id, newId);
        db.characters.push({ ...deepClone(c), id: newId, workspaceId: newWsId });
      }
      const eventMap = new Map<string, string>();
      for (const e of bundle.events) {
        const newId = uuid();
        eventMap.set(e.id, newId);
        db.events.push({
          ...deepClone(e),
          id: newId,
          workspaceId: newWsId,
          trackId: trackMap.get(e.trackId) ?? e.trackId,
          characterIds: e.characterIds.map((cid) => charMap.get(cid) ?? cid),
        });
      }
      for (const r of bundle.relationships) {
        db.relationships.push({
          ...deepClone(r),
          id: uuid(),
          workspaceId: newWsId,
          sourceId: charMap.get(r.sourceId) ?? r.sourceId,
          targetId: charMap.get(r.targetId) ?? r.targetId,
        });
      }
      for (const ec of bundle.eventConnections) {
        db.eventConnections.push({
          ...deepClone(ec),
          sourceId: eventMap.get(ec.sourceId) ?? ec.sourceId,
          targetId: eventMap.get(ec.targetId) ?? ec.targetId,
          sourceTitle:
            bundle.events.find((e) => e.id === ec.sourceId)?.title ?? ec.sourceTitle,
          targetTitle:
            bundle.events.find((e) => e.id === ec.targetId)?.title ?? ec.targetTitle,
        });
      }
      for (const o of bundle.outlineNodes) {
        db.outlineNodes.push({
          ...deepClone(o),
          id: uuid(),
          workspaceId: newWsId,
          parentId: null,
          eventId: o.eventId ? eventMap.get(o.eventId) ?? null : null,
        });
      }
      for (const n of bundle.notes) {
        db.notes.push({
          ...deepClone(n),
          id: uuid(),
          workspaceId: newWsId,
          folderId: null,
        });
      }
      return newWs;
    }

    // ===== track =====
    case 'list_tracks':
      return db.tracks
        .filter((t) => t.workspaceId === args.workspaceId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    case 'create_track': {
      const input = args.input as CreateTrackInput;
      if (!input.name?.trim()) invalidInput('轨道名称不能为空');
      const count = db.tracks.filter((t) => t.workspaceId === input.workspaceId).length;
      const track: Track = {
        id: uuid(),
        workspaceId: input.workspaceId,
        name: input.name,
        color: input.color ?? TRACK_PALETTE[count % TRACK_PALETTE.length]!,
        sortOrder: count,
        isVisible: true,
        createdAt: nowISO(),
      };
      db.tracks.push(track);
      return track;
    }
    case 'update_track': {
      const input = args.input as UpdateTrackInput;
      const t = db.tracks.find((x) => x.id === input.id);
      if (!t) notFound(`轨道 ${input.id} 不存在`);
      if (input.name !== undefined) t.name = input.name;
      if (input.color !== undefined) t.color = input.color;
      if (input.isVisible !== undefined) t.isVisible = input.isVisible;
      return t;
    }
    case 'delete_track': {
      const id = args.id as string;
      const t = db.tracks.find((x) => x.id === id);
      if (!t) notFound(`轨道 ${id} 不存在`);
      const wsTracks = db.tracks.filter((x) => x.workspaceId === t.workspaceId);
      if (wsTracks.length <= 1) forbidden('至少保留一个轨道');
      db.tracks = db.tracks.filter((x) => x.id !== id);
      db.events = db.events.filter((e) => e.trackId !== id);
      return null;
    }
    case 'reorder_tracks': {
      const input = args.input as ReorderTracksInput;
      input.orderedIds.forEach((id, i) => {
        const t = db.tracks.find((x) => x.id === id);
        if (t) t.sortOrder = i;
      });
      return db.tracks
        .filter((t) => t.workspaceId === input.workspaceId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    // ===== event =====
    case 'list_events': {
      const wsId = args.workspaceId as string;
      return db.events
        .filter((e) => e.workspaceId === wsId)
        .sort((a, b) => a.trackId.localeCompare(b.trackId) || a.sortOrder - b.sortOrder);
    }
    case 'create_event': {
      const input = args.input as CreateEventInput;
      if (!input.title?.trim()) invalidInput('事件标题不能为空');
      const now = nowISO();
      const ev: Event = {
        id: uuid(),
        workspaceId: input.workspaceId,
        trackId: input.trackId,
        title: input.title,
        description: input.description ?? '',
        dateType: input.dateType ?? 'relative',
        dateValue: input.dateValue ?? '',
        sortOrder: input.sortOrder ?? 0,
        status: input.status ?? 'draft',
        color: input.color ?? null,
        characterIds: input.characterIds ?? [],
        connectedEventIds: [],
        createdAt: now,
        updatedAt: now,
      };
      db.events.push(ev);
      // 同步反向关系到 character.eventIds
      for (const cid of ev.characterIds) {
        const c = db.characters.find((x) => x.id === cid);
        if (c && !c.eventIds.includes(ev.id)) c.eventIds.push(ev.id);
      }
      return ev;
    }
    case 'update_event': {
      const input = args.input as UpdateEventInput;
      const ev = db.events.find((e) => e.id === input.id);
      if (!ev) notFound(`事件 ${input.id} 不存在`);
      if (input.title !== undefined) ev.title = input.title;
      if (input.description !== undefined) ev.description = input.description;
      if (input.trackId !== undefined) ev.trackId = input.trackId;
      if (input.dateType !== undefined) ev.dateType = input.dateType;
      if (input.dateValue !== undefined) ev.dateValue = input.dateValue;
      if (input.sortOrder !== undefined) ev.sortOrder = input.sortOrder;
      if (input.status !== undefined) ev.status = input.status;
      if (input.color !== undefined) ev.color = input.color;
      if (input.characterIds !== undefined) {
        // 重建反向关系
        for (const c of db.characters) {
          c.eventIds = c.eventIds.filter((eid) => eid !== ev.id);
        }
        ev.characterIds = input.characterIds;
        for (const cid of ev.characterIds) {
          const c = db.characters.find((x) => x.id === cid);
          if (c && !c.eventIds.includes(ev.id)) c.eventIds.push(ev.id);
        }
      }
      ev.updatedAt = nowISO();
      return ev;
    }
    case 'delete_event': {
      const id = args.id as string;
      db.events = db.events.filter((e) => e.id !== id);
      for (const c of db.characters) {
        c.eventIds = c.eventIds.filter((eid) => eid !== id);
      }
      return null;
    }
    case 'connect_events': {
      const input = args.input as { sourceId: string; targetId: string; connectionType?: 'causal' | 'foreshadow' };
      const source = db.events.find((e) => e.id === input.sourceId);
      const target = db.events.find((e) => e.id === input.targetId);
      if (!source || !target) notFound('事件不存在');
      if (!source.connectedEventIds.includes(input.targetId)) {
        source.connectedEventIds.push(input.targetId);
      }
      db.eventConnections = db.eventConnections.filter(
        (c) => !(c.sourceId === input.sourceId && c.targetId === input.targetId),
      );
      db.eventConnections.push({
        sourceId: input.sourceId,
        targetId: input.targetId,
        sourceTitle: source.title,
        targetTitle: target.title,
        connectionType: input.connectionType ?? 'causal',
      });
      return null;
    }
    case 'disconnect_events': {
      const { sourceId, targetId } = args as { sourceId: string; targetId: string };
      const source = db.events.find((e) => e.id === sourceId);
      if (source) {
        source.connectedEventIds = source.connectedEventIds.filter((id) => id !== targetId);
      }
      db.eventConnections = db.eventConnections.filter(
        (c) => !(c.sourceId === sourceId && c.targetId === targetId),
      );
      return null;
    }
    case 'list_event_connections': {
      const wsId = args.workspaceId as string;
      return db.eventConnections.filter(
        (c) =>
          db.events.find((e) => e.id === c.sourceId)?.workspaceId === wsId &&
          db.events.find((e) => e.id === c.targetId)?.workspaceId === wsId,
      );
    }

    case 'check_consistency': {
      const events = db.events.filter((e) => e.workspaceId === args.workspaceId);
      const buckets = new Map<string, { eventIds: Set<string>; trackIds: Set<string>; characterId: string; dateValue: string }>();
      for (const ev of events) {
        if (!ev.dateValue) continue;
        for (const characterId of ev.characterIds) {
          const key = `${characterId}|${ev.dateValue}`;
          const slot = buckets.get(key) ?? {
            eventIds: new Set<string>(),
            trackIds: new Set<string>(),
            characterId,
            dateValue: ev.dateValue,
          };
          slot.eventIds.add(ev.id);
          slot.trackIds.add(ev.trackId);
          buckets.set(key, slot);
        }
      }
      return Array.from(buckets.values())
        .filter((b) => b.trackIds.size >= 2)
        .map((b) => ({
          characterId: b.characterId,
          dateValue: b.dateValue,
          eventIds: [...b.eventIds].sort(),
          trackIds: [...b.trackIds].sort(),
        }));
    }

    // ===== character =====
    case 'list_characters':
      return db.characters
        .filter((c) => c.workspaceId === args.workspaceId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'get_character': {
      const c = db.characters.find((x) => x.id === args.id);
      if (!c) notFound(`角色 ${args.id} 不存在`);
      return c;
    }
    case 'create_character': {
      const input = args.input as CreateCharacterInput;
      if (!input.name?.trim()) invalidInput('角色名称不能为空');
      const now = nowISO();
      const c: Character = {
        id: uuid(),
        workspaceId: input.workspaceId,
        name: input.name,
        aliases: [],
        avatar: null,
        description: input.description ?? '',
        appearance: '',
        backstory: '',
        goals: '',
        conflicts: '',
        arc: '',
        tags: input.tags ?? [],
        color: input.color ?? '#F4B6C2',
        eventIds: [],
        createdAt: now,
        updatedAt: now,
      };
      db.characters.push(c);
      return c;
    }
    case 'update_character': {
      const input = args.input as UpdateCharacterInput;
      const c = db.characters.find((x) => x.id === input.id);
      if (!c) notFound(`角色 ${input.id} 不存在`);
      if (input.name !== undefined) c.name = input.name;
      if (input.aliases !== undefined) c.aliases = input.aliases;
      if (input.avatar !== undefined) c.avatar = input.avatar;
      if (input.description !== undefined) c.description = input.description;
      if (input.appearance !== undefined) c.appearance = input.appearance;
      if (input.backstory !== undefined) c.backstory = input.backstory;
      if (input.goals !== undefined) c.goals = input.goals;
      if (input.conflicts !== undefined) c.conflicts = input.conflicts;
      if (input.arc !== undefined) c.arc = input.arc;
      if (input.tags !== undefined) c.tags = input.tags;
      if (input.color !== undefined) c.color = input.color;
      c.updatedAt = nowISO();
      return c;
    }
    case 'delete_character': {
      const id = args.id as string;
      db.characters = db.characters.filter((c) => c.id !== id);
      db.relationships = db.relationships.filter(
        (r) => r.sourceId !== id && r.targetId !== id,
      );
      for (const e of db.events) {
        e.characterIds = e.characterIds.filter((cid) => cid !== id);
      }
      return null;
    }
    case 'list_relationships':
      return db.relationships.filter((r) => r.workspaceId === args.workspaceId);
    case 'create_relationship': {
      const input = args.input as CreateRelationshipInput;
      const rel: CharacterRelationship = {
        id: uuid(),
        workspaceId: input.workspaceId,
        sourceId: input.sourceId,
        targetId: input.targetId,
        type: input.relationshipType ?? 'friend',
        description: input.description ?? '',
        strength: Math.max(1, Math.min(5, input.strength ?? 3)),
      };
      db.relationships.push(rel);
      return rel;
    }
    case 'update_relationship': {
      const input = args.input as UpdateRelationshipInput;
      const r = db.relationships.find((x) => x.id === input.id);
      if (!r) notFound(`关系 ${input.id} 不存在`);
      if (input.relationshipType !== undefined) r.type = input.relationshipType;
      if (input.description !== undefined) r.description = input.description;
      if (input.strength !== undefined) r.strength = Math.max(1, Math.min(5, input.strength));
      return r;
    }
    case 'delete_relationship': {
      const id = args.id as string;
      db.relationships = db.relationships.filter((r) => r.id !== id);
      return null;
    }

    // ===== outline =====
    case 'list_outline_nodes':
      return db.outlineNodes
        .filter((o) => o.workspaceId === args.workspaceId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    case 'create_outline_node': {
      const input = args.input as CreateOutlineNodeInput;
      if (!input.title?.trim()) invalidInput('节点标题不能为空');
      const now = nowISO();
      const node: OutlineNode = {
        id: uuid(),
        workspaceId: input.workspaceId,
        type: input.type ?? 'chapter',
        title: input.title,
        content: input.content ?? '',
        parentId: input.parentId ?? null,
        sortOrder: db.outlineNodes.filter(
          (o) =>
            o.workspaceId === input.workspaceId &&
            (o.parentId ?? null) === (input.parentId ?? null),
        ).length,
        eventId: input.eventId ?? null,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      };
      db.outlineNodes.push(node);
      return node;
    }
    case 'update_outline_node': {
      const input = args.input as UpdateOutlineNodeInput;
      const n = db.outlineNodes.find((o) => o.id === input.id);
      if (!n) notFound(`大纲节点 ${input.id} 不存在`);
      if (input.title !== undefined) n.title = input.title;
      if (input.content !== undefined) n.content = input.content;
      if (input.eventId !== undefined) n.eventId = input.eventId;
      if (input.status !== undefined) n.status = input.status;
      n.updatedAt = nowISO();
      return n;
    }
    case 'delete_outline_node': {
      const id = args.id as string;
      db.outlineNodes = db.outlineNodes.filter((o) => o.id !== id);
      return null;
    }
    case 'move_outline_node': {
      const input = args.input as MoveOutlineNodeInput;
      const n = db.outlineNodes.find((o) => o.id === input.id);
      if (!n) notFound(`大纲节点 ${input.id} 不存在`);
      n.parentId = input.parentId;
      n.sortOrder = input.sortOrder;
      n.updatedAt = nowISO();
      return n;
    }

    // ===== note =====
    case 'list_notes':
      return db.notes
        .filter((n) => n.workspaceId === args.workspaceId || n.workspaceId === null)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    case 'create_note': {
      const input = args.input as CreateNoteInput;
      if (!input.title?.trim()) invalidInput('笔记标题不能为空');
      const now = nowISO();
      const note: Note = {
        id: uuid(),
        workspaceId: input.workspaceId ?? null,
        folderId: input.folderId ?? null,
        title: input.title,
        content: input.content ?? '',
        tags: input.tags ?? [],
        isFolder: input.isFolder ?? false,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      };
      db.notes.push(note);
      return note;
    }
    case 'update_note': {
      const input = args.input as UpdateNoteInput;
      const n = db.notes.find((x) => x.id === input.id);
      if (!n) notFound(`笔记 ${input.id} 不存在`);
      if (input.title !== undefined) n.title = input.title;
      if (input.content !== undefined) n.content = input.content;
      if (input.tags !== undefined) n.tags = input.tags;
      n.updatedAt = nowISO();
      return n;
    }
    case 'delete_note': {
      const id = args.id as string;
      db.notes = db.notes.filter((n) => n.id !== id);
      return null;
    }

    // ===== statistics =====
    case 'get_statistics': {
      const wsId = args.workspaceId as string;
      const events = db.events.filter((e) => e.workspaceId === wsId);
      const characters = db.characters.filter((c) => c.workspaceId === wsId);
      const tracks = db.tracks.filter((t) => t.workspaceId === wsId);
      const notes = db.notes.filter((n) => n.workspaceId === wsId);
      const outlineNodes = db.outlineNodes.filter((o) => o.workspaceId === wsId);
      const stats: Statistics = {
        workspaceId: wsId,
        totalEvents: events.length,
        totalCharacters: characters.length,
        totalTracks: tracks.length,
        totalNotes: notes.length,
        totalOutlineNodes: outlineNodes.length,
        statusBreakdown: {
          draft: events.filter((e) => e.status === 'draft').length,
          done: events.filter((e) => e.status === 'done').length,
          revise: events.filter((e) => e.status === 'revise').length,
        },
        characterAppearances: characters
          .map((c) => ({
            characterId: c.id,
            characterName: c.name,
            count: c.eventIds.length,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20),
        trackEventCounts: tracks.map((t) => ({
          trackId: t.id,
          trackName: t.name,
          count: events.filter((e) => e.trackId === t.id).length,
        })),
      };
      return stats;
    }

    // ===== settings =====
    case 'get_settings':
      return db.settings;
    case 'update_settings': {
      const input = args.input as UpdateSettingsInput;
      db.settings = {
        ...db.settings,
        ...(input.theme !== undefined ? { theme: input.theme } : {}),
        ...(input.accentColor !== undefined ? { accentColor: input.accentColor } : {}),
        ...(input.language !== undefined ? { language: input.language } : {}),
        ...(input.editorFont !== undefined ? { editorFont: input.editorFont } : {}),
        ...(input.uiFont !== undefined ? { uiFont: input.uiFont } : {}),
        ...(input.fontSize !== undefined ? { fontSize: input.fontSize } : {}),
        ...(input.backupPath !== undefined ? { backupPath: input.backupPath } : {}),
        ...(input.autoBackup !== undefined ? { autoBackup: input.autoBackup } : {}),
        ...(input.backupIntervalHours !== undefined
          ? { backupIntervalHours: input.backupIntervalHours }
          : {}),
        ...(input.defaultView !== undefined ? { defaultView: input.defaultView } : {}),
        ...(input.timelineZoom !== undefined ? { timelineZoom: input.timelineZoom } : {}),
      };
      return db.settings;
    }

    default:
      throw { code: 'UNKNOWN_COMMAND', message: `未知命令: ${command}` };
  }
}
