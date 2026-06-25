/**
 * Mock IPC 实现：用 localStorage 模拟后端 SQLite。
 * 仅在纯 Web 模式下使用（import.meta.env.MODE === 'web' 或浏览器环境）。
 * 数据 schema 与 Rust 后端保持一致，便于切换。
 */

import type {
  AiChunk,
  AiKvEntry,
  AiMessage,
  AiSession,
  AppSettings,
  CreateAiMessageInput,
  CreateAiSessionInput,
  Character,
  CharacterRelationship,
  CreateCharacterInput,
  CreateEventInput,
  CreateLocationInput,
  CreateNoteInput,
  CreateOutlineNodeInput,
  CreateRelationshipInput,
  CreateTrackInput,
  CreateWorkspaceInput,
  CreateVnLineInput,
  CreateVnSceneInput,
  Event,
  EventConnection,
  LinkLocationsInput,
  Location,
  LocationLink,
  MoveOutlineNodeInput,
  Note,
  OutlineNode,
  ReorderTracksInput,
  Statistics,
  Track,
  UpdateCharacterInput,
  UpdateEventInput,
  UpdateLocationInput,
  UpdateNoteInput,
  UpdateOutlineNodeInput,
  UpdateRelationshipInput,
  UpdateSettingsInput,
  UpdateTrackInput,
  UpdateVnLineInput,
  UpdateVnSceneInput,
  UpdateWorkspaceInput,
  VnGraphIssue,
  VnLine,
  VnScene,
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
  locations: Location[];
  locationLinks: LocationLink[];
  vnScenes: VnScene[];
  vnLines: VnLine[];
  aiSessions: AiSession[];
  aiMessages: AiMessage[];
  aiChunks: AiChunk[];
  aiKv: AiKvEntry[];
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
  fontTheme: 'sans',
  aiProvider: 'openai',
  aiModel: '',
  aiApiKey: '',
  aiBaseUrl: '',
  aiEnabled: false,
  aiRagEnabled: true,
  aiSystemPrompt: '',
  splashEnabled: true,
  splashDurationMs: 2500,
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
    locations: [],
    locationLinks: [],
    vnScenes: [],
    vnLines: [],
    aiSessions: [],
    aiMessages: [],
    aiChunks: [],
    aiKv: [],
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

function eventCountForWorkspace(db: MockDB, workspaceId: string): number {
  return db.events.filter((e) => e.workspaceId === workspaceId).length;
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
      return [...db.workspaces]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((w) => ({ ...w, eventCount: eventCountForWorkspace(db, w.id) }));
    case 'get_workspace': {
      const ws = db.workspaces.find((w) => w.id === args.id);
      if (!ws) notFound(`工作区 ${args.id} 不存在`);
      return { ...ws, eventCount: eventCountForWorkspace(db, ws.id) };
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
        coverImage: input.coverImage ?? null,
        eventCount: 0,
        settings: {},
        createdAt: now,
        updatedAt: now,
      };
      db.workspaces.push(ws);
      seedTemplate(db, ws.id, ws.template);
      return { ...ws, eventCount: eventCountForWorkspace(db, ws.id) };
    }
    case 'update_workspace': {
      const input = args.input as UpdateWorkspaceInput;
      const ws = db.workspaces.find((w) => w.id === input.id);
      if (!ws) notFound(`工作区 ${input.id} 不存在`);
      if (input.name !== undefined) ws.name = input.name;
      if (input.description !== undefined) ws.description = input.description;
      if (input.coverColor !== undefined) ws.coverColor = input.coverColor;
      if (input.coverImage !== undefined) ws.coverImage = input.coverImage;
      if (input.settings !== undefined) ws.settings = input.settings;
      ws.updatedAt = nowISO();
      return { ...ws, eventCount: eventCountForWorkspace(db, ws.id) };
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
      db.locations = db.locations.filter((l) => l.workspaceId !== id);
      db.locationLinks = db.locationLinks.filter(
        (lk) =>
          db.locations.find((l) => l.id === lk.sourceId) &&
          db.locations.find((l) => l.id === lk.targetId),
      );
      db.vnScenes = db.vnScenes.filter((s) => s.workspaceId !== id);
      db.vnLines = db.vnLines.filter((l) =>
        db.vnScenes.find((s) => s.id === l.sceneId),
      );
      return null;
    }
    case 'export_workspace': {
      const id = args.id as string;
      const ws = db.workspaces.find((w) => w.id === id);
      if (!ws) notFound(`工作区 ${id} 不存在`);
      const bundle: WorkspaceBundle = {
        version: 2,
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
        locations: db.locations.filter((l) => l.workspaceId === id).map(deepClone),
        locationLinks: db.locationLinks
          .filter(
            (lk) =>
              db.locations.find((l) => l.id === lk.sourceId)?.workspaceId === id &&
              db.locations.find((l) => l.id === lk.targetId)?.workspaceId === id,
          )
          .map(deepClone),
        vnScenes: db.vnScenes.filter((s) => s.workspaceId === id).map(deepClone),
        vnLines: db.vnLines
          .filter((l) => db.vnScenes.find((s) => s.id === l.sceneId)?.workspaceId === id)
          .map(deepClone),
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
    case 'export_workspace_pdf':
    case 'export_workspace_word':
    case 'export_workspace_epub': {
      const id = args.id as string;
      const ws = db.workspaces.find((w) => w.id === id);
      if (!ws) notFound(`工作区 ${id} 不存在`);
      // Web 模式下返回一个最小占位二进制文件内容
      return Array.from(new TextEncoder().encode(`mock ${args.command} for ${ws.name}`));
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
        eventCount: 0,
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
      const locationMap = new Map<string, string>();
      for (const loc of bundle.locations) {
        const newId = uuid();
        locationMap.set(loc.id, newId);
      }
      for (const e of bundle.events) {
        const newId = uuid();
        eventMap.set(e.id, newId);
        db.events.push({
          ...deepClone(e),
          id: newId,
          workspaceId: newWsId,
          trackId: trackMap.get(e.trackId) ?? e.trackId,
          locationId: e.locationId ? locationMap.get(e.locationId) ?? null : null,
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
      for (const loc of bundle.locations) {
        db.locations.push({
          ...deepClone(loc),
          id: locationMap.get(loc.id) ?? uuid(),
          workspaceId: newWsId,
          linkedEventId: loc.linkedEventId ? eventMap.get(loc.linkedEventId) ?? null : null,
          characterIds: loc.characterIds.map((cid) => charMap.get(cid) ?? cid),
        });
      }
      for (const lk of bundle.locationLinks) {
        db.locationLinks.push({
          ...deepClone(lk),
          sourceId: locationMap.get(lk.sourceId) ?? lk.sourceId,
          targetId: locationMap.get(lk.targetId) ?? lk.targetId,
        });
      }
      const sceneMap = new Map<string, string>();
      for (const s of bundle.vnScenes) {
        const newId = uuid();
        sceneMap.set(s.id, newId);
        db.vnScenes.push({
          ...deepClone(s),
          id: newId,
          workspaceId: newWsId,
          outlineNodeId: s.outlineNodeId ? null : null,
        });
      }
      for (const l of bundle.vnLines) {
        db.vnLines.push({
          ...deepClone(l),
          id: uuid(),
          sceneId: sceneMap.get(l.sceneId) ?? l.sceneId,
          characterId: l.characterId ? charMap.get(l.characterId) ?? null : null,
          choiceTargetSceneId: l.choiceTargetSceneId
            ? sceneMap.get(l.choiceTargetSceneId) ?? null
            : null,
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
        locationId: input.locationId ?? null,
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
      if (input.locationId !== undefined) ev.locationId = input.locationId;
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
        coverImage: input.coverImage ?? null,
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
      if (input.coverImage !== undefined) n.coverImage = input.coverImage;
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

    // ===== location (map) =====
    case 'list_locations': {
      const wsId = args.workspaceId as string;
      return db.locations.filter((l) => l.workspaceId === wsId);
    }
    case 'create_location': {
      const input = args.input as CreateLocationInput;
      if (!input.name?.trim()) invalidInput('地点名称不能为空');
      const now = nowISO();
      const loc: Location = {
        id: uuid(),
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? '',
        posX: input.posX ?? 200,
        posY: input.posY ?? 200,
        color: input.color ?? '#C68A3E',
        icon: input.icon ?? '📍',
        linkedEventId: input.linkedEventId ?? null,
        characterIds: input.characterIds ?? [],
        createdAt: now,
        updatedAt: now,
      };
      db.locations.push(loc);
      return loc;
    }
    case 'update_location': {
      const input = args.input as UpdateLocationInput;
      const loc = db.locations.find((l) => l.id === input.id);
      if (!loc) notFound(`地点 ${input.id} 不存在`);
      if (input.name !== undefined) loc.name = input.name;
      if (input.description !== undefined) loc.description = input.description;
      if (input.posX !== undefined) loc.posX = input.posX;
      if (input.posY !== undefined) loc.posY = input.posY;
      if (input.color !== undefined) loc.color = input.color;
      if (input.icon !== undefined) loc.icon = input.icon;
      if (input.linkedEventId !== undefined) loc.linkedEventId = input.linkedEventId;
      if (input.characterIds !== undefined) loc.characterIds = input.characterIds;
      loc.updatedAt = nowISO();
      return loc;
    }
    case 'delete_location': {
      const id = args.id as string;
      db.locations = db.locations.filter((l) => l.id !== id);
      db.locationLinks = db.locationLinks.filter(
        (lk) => lk.sourceId !== id && lk.targetId !== id,
      );
      return null;
    }
    case 'list_location_links': {
      const wsId = args.workspaceId as string;
      return db.locationLinks
        .filter(
          (lk) =>
            db.locations.find((l) => l.id === lk.sourceId)?.workspaceId === wsId &&
            db.locations.find((l) => l.id === lk.targetId)?.workspaceId === wsId,
        )
        .map((lk) => ({
          ...lk,
          sourceName: db.locations.find((l) => l.id === lk.sourceId)?.name ?? '',
          targetName: db.locations.find((l) => l.id === lk.targetId)?.name ?? '',
        }));
    }
    case 'link_locations': {
      const input = args.input as LinkLocationsInput;
      if (input.sourceId === input.targetId) invalidInput('不能连接到自身');
      const src = db.locations.find((l) => l.id === input.sourceId);
      const tgt = db.locations.find((l) => l.id === input.targetId);
      if (!src || !tgt) notFound('地点不存在');
      db.locationLinks = db.locationLinks.filter(
        (lk) => !(lk.sourceId === input.sourceId && lk.targetId === input.targetId),
      );
      db.locationLinks.push({
        sourceId: input.sourceId,
        targetId: input.targetId,
        label: input.label ?? '',
        sourceName: src.name,
        targetName: tgt.name,
      });
      return null;
    }
    case 'unlink_locations': {
      const { sourceId, targetId } = args as { sourceId: string; targetId: string };
      db.locationLinks = db.locationLinks.filter(
        (lk) => !(lk.sourceId === sourceId && lk.targetId === targetId),
      );
      return null;
    }

    // ===== vn (visual novel) =====
    case 'list_vn_scenes': {
      const wsId = args.workspaceId as string;
      return db.vnScenes
        .filter((s) => s.workspaceId === wsId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    case 'create_vn_scene': {
      const input = args.input as CreateVnSceneInput;
      if (!input.title?.trim()) invalidInput('场景标题不能为空');
      const now = nowISO();
      const count = db.vnScenes.filter((s) => s.workspaceId === input.workspaceId).length;
      const scene: VnScene = {
        id: uuid(),
        workspaceId: input.workspaceId,
        title: input.title,
        background: input.background ?? '',
        backgroundAssetPath: input.backgroundAssetPath ?? null,
        bgmPath: input.bgmPath ?? null,
        outlineNodeId: input.outlineNodeId ?? null,
        sortOrder: count,
        createdAt: now,
        updatedAt: now,
      };
      db.vnScenes.push(scene);
      return scene;
    }
    case 'update_vn_scene': {
      const input = args.input as UpdateVnSceneInput;
      const s = db.vnScenes.find((x) => x.id === input.id);
      if (!s) notFound(`场景 ${input.id} 不存在`);
      if (input.title !== undefined) s.title = input.title;
      if (input.background !== undefined) s.background = input.background;
      if (input.backgroundAssetPath !== undefined) s.backgroundAssetPath = input.backgroundAssetPath;
      if (input.bgmPath !== undefined) s.bgmPath = input.bgmPath;
      if (input.outlineNodeId !== undefined) s.outlineNodeId = input.outlineNodeId;
      if (input.sortOrder !== undefined) s.sortOrder = input.sortOrder;
      s.updatedAt = nowISO();
      return s;
    }
    case 'delete_vn_scene': {
      const id = args.id as string;
      db.vnScenes = db.vnScenes.filter((s) => s.id !== id);
      db.vnLines = db.vnLines.filter((l) => l.sceneId !== id);
      return null;
    }
    case 'list_vn_lines': {
      const sceneId = args.sceneId as string;
      return db.vnLines
        .filter((l) => l.sceneId === sceneId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    case 'list_all_vn_lines': {
      const wsId = args.workspaceId as string;
      return db.vnLines
        .filter((l) => db.vnScenes.find((s) => s.id === l.sceneId)?.workspaceId === wsId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    case 'create_vn_line': {
      const input = args.input as CreateVnLineInput;
      const now = nowISO();
      const count = db.vnLines.filter((l) => l.sceneId === input.sceneId).length;
      const line: VnLine = {
        id: uuid(),
        sceneId: input.sceneId,
        sortOrder: count,
        lineType: input.lineType ?? 'dialog',
        characterId: input.characterId ?? null,
        speakerName: input.speakerName ?? '',
        text: input.text ?? '',
        emotion: input.emotion ?? '',
        choiceLabel: input.choiceLabel ?? '',
        choiceTargetSceneId: input.choiceTargetSceneId ?? null,
        spriteAssetPath: input.spriteAssetPath ?? null,
        voicePath: input.voicePath ?? null,
        createdAt: now,
      };
      db.vnLines.push(line);
      return line;
    }
    case 'update_vn_line': {
      const input = args.input as UpdateVnLineInput;
      const l = db.vnLines.find((x) => x.id === input.id);
      if (!l) notFound(`台词 ${input.id} 不存在`);
      if (input.lineType !== undefined) l.lineType = input.lineType;
      if (input.characterId !== undefined) l.characterId = input.characterId;
      if (input.speakerName !== undefined) l.speakerName = input.speakerName;
      if (input.text !== undefined) l.text = input.text;
      if (input.emotion !== undefined) l.emotion = input.emotion;
      if (input.choiceLabel !== undefined) l.choiceLabel = input.choiceLabel;
      if (input.choiceTargetSceneId !== undefined) l.choiceTargetSceneId = input.choiceTargetSceneId;
      if (input.sortOrder !== undefined) l.sortOrder = input.sortOrder;
      return l;
    }
    case 'delete_vn_line': {
      const id = args.id as string;
      db.vnLines = db.vnLines.filter((l) => l.id !== id);
      return null;
    }
    case 'export_vn_renpy': {
      const wsId = args.workspaceId as string;
      const scenes = db.vnScenes
        .filter((s) => s.workspaceId === wsId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      let rpy = '# Ren\'Py script generated by Plotline\n\n';
      for (const s of scenes) {
        const safeLabel = s.title.replace(/\s+/g, '_').replace(/[^\w\u4e00-\u9fa5]/g, '_');
        rpy += `# Scene: ${s.title}\n`;
        rpy += `label ${safeLabel}:\n`;
        const lines = db.vnLines
          .filter((l) => l.sceneId === s.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        for (const l of lines) {
          if (l.lineType === 'narration') {
            rpy += `    "${l.text}"\n`;
          } else if (l.lineType === 'dialog') {
            const speaker = l.speakerName || 'narrator';
            rpy += `    ${speaker} "${l.text}"\n`;
          } else if (l.lineType === 'choice') {
            rpy += `    menu:\n`;
            const labelText = l.choiceLabel || l.text || 'Continue';
            rpy += `        "${labelText}":\n`;
            const target = db.vnScenes.find((sc) => sc.id === l.choiceTargetSceneId);
            if (target) {
              const targetLabel = target.title.replace(/\s+/g, '_').replace(/[^\w\u4e00-\u9fa5]/g, '_');
              rpy += `            jump ${targetLabel}\n`;
            } else {
              rpy += `            pass\n`;
            }
          }
        }
        rpy += '\n';
      }
      return rpy;
    }
    case 'check_vn_consistency': {
      const wsId = args.workspaceId as string;
      const scenes = db.vnScenes.filter((s) => s.workspaceId === wsId);
      const lines = db.vnLines.filter((l) => scenes.some((s) => s.id === l.sceneId));
      const sceneIds = new Set(scenes.map((s) => s.id));
      const issues: VnGraphIssue[] = [];
      for (const line of lines) {
        if (line.lineType === 'choice' && line.choiceTargetSceneId && !sceneIds.has(line.choiceTargetSceneId)) {
          const scene = scenes.find((s) => s.id === line.sceneId);
          issues.push({
            kind: 'missing_choice_target',
            sceneId: line.sceneId,
            sceneTitle: scene?.title ?? null,
            lineId: line.id,
            message: `选项「${line.choiceLabel || line.text}」跳转到了不存在的场景`,
          });
        }
      }
      const incoming = new Set<string>();
      for (const line of lines) {
        if (line.lineType === 'choice' && line.choiceTargetSceneId) {
          incoming.add(line.choiceTargetSceneId);
        }
      }
      for (const scene of scenes) {
        if (scene.sortOrder !== 0 && !incoming.has(scene.id)) {
          issues.push({
            kind: 'unreachable_scene',
            sceneId: scene.id,
            sceneTitle: scene.title,
            lineId: null,
            message: `场景「${scene.title}」没有来自其他场景的入口`,
          });
        }
      }
      for (const scene of scenes) {
        if (!lines.some((l) => l.sceneId === scene.id)) {
          issues.push({
            kind: 'empty_scene',
            sceneId: scene.id,
            sceneTitle: scene.title,
            lineId: null,
            message: `场景「${scene.title}」还没有任何台词`,
          });
        }
      }
      return issues;
    }

    // ===== ai =====
    case 'create_ai_session': {
      const input = args.input as CreateAiSessionInput;
      const now = nowISO();
      const session: AiSession = {
        id: uuid(),
        workspaceId: input.workspaceId,
        title: input.title ?? '新会话',
        summary: '',
        createdAt: now,
        updatedAt: now,
      };
      db.aiSessions.push(session);
      return session;
    }
    case 'list_ai_sessions': {
      return db.aiSessions
        .filter((s) => s.workspaceId === args.workspaceId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    case 'get_ai_session': {
      const s = db.aiSessions.find((x) => x.id === args.id);
      if (!s) notFound(`AI 会话 ${args.id} 不存在`);
      return s;
    }
    case 'delete_ai_session': {
      const id = args.id as string;
      db.aiSessions = db.aiSessions.filter((s) => s.id !== id);
      db.aiMessages = db.aiMessages.filter((m) => m.sessionId !== id);
      return null;
    }
    case 'add_ai_message': {
      const input = args.input as CreateAiMessageInput;
      const session = db.aiSessions.find((s) => s.id === input.sessionId);
      if (!session) notFound(`AI 会话 ${input.sessionId} 不存在`);
      const now = nowISO();
      const msg: AiMessage = {
        id: uuid(),
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        createdAt: now,
      };
      db.aiMessages.push(msg);
      session.updatedAt = now;
      return msg;
    }
    case 'list_ai_messages': {
      return db.aiMessages
        .filter((m) => m.sessionId === args.sessionId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    case 'ai_chat': {
      const input = args.input as {
        workspaceId: string;
        sessionId?: string | null;
        message: string;
        useRag?: boolean;
      };
      const now = nowISO();
      let session = input.sessionId
        ? db.aiSessions.find((s) => s.id === input.sessionId)
        : undefined;
      if (!session) {
        session = {
          id: uuid(),
          workspaceId: input.workspaceId,
          title: '新会话',
          summary: '',
          createdAt: now,
          updatedAt: now,
        };
        db.aiSessions.push(session);
      }
      const userMsg: AiMessage = {
        id: uuid(),
        sessionId: session.id,
        role: 'user',
        content: input.message,
        createdAt: now,
      };
      db.aiMessages.push(userMsg);
      session.updatedAt = now;

      let reply = `（模拟回复）我收到你的问题："${input.message}"`;
      if (input.useRag) {
        const hits = db.aiChunks.filter((c) => c.workspaceId === input.workspaceId);
        if (hits.length > 0) {
          reply += `。我找到了 ${hits.length} 条相关资料。`;
        }
      }
      const assistantMsg: AiMessage = {
        id: uuid(),
        sessionId: session.id,
        role: 'assistant',
        content: reply,
        createdAt: nowISO(),
      };
      db.aiMessages.push(assistantMsg);
      session.updatedAt = nowISO();

      const messages = db.aiMessages
        .filter((m) => m.sessionId === session!.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { sessionId: session.id, reply, messages };
    }
    case 'ai_index_workspace': {
      const wsId = args.workspaceId as string;
      db.aiChunks = db.aiChunks.filter((c) => c.workspaceId !== wsId);
      const now = nowISO();
      for (const c of db.characters.filter((x) => x.workspaceId === wsId)) {
        db.aiChunks.push({
          id: uuid(),
          workspaceId: wsId,
          sourceType: 'character',
          sourceId: c.id,
          content: `角色：${c.name}\n描述：${c.description}`,
          updatedAt: now,
        });
      }
      for (const e of db.events.filter((x) => x.workspaceId === wsId)) {
        db.aiChunks.push({
          id: uuid(),
          workspaceId: wsId,
          sourceType: 'event',
          sourceId: e.id,
          content: `事件：${e.title}\n描述：${e.description}`,
          updatedAt: now,
        });
      }
      for (const o of db.outlineNodes.filter((x) => x.workspaceId === wsId)) {
        db.aiChunks.push({
          id: uuid(),
          workspaceId: wsId,
          sourceType: 'outline',
          sourceId: o.id,
          content: `大纲节点：${o.title}\n内容：${o.content}`,
          updatedAt: now,
        });
      }
      for (const n of db.notes.filter((x) => x.workspaceId === wsId)) {
        db.aiChunks.push({
          id: uuid(),
          workspaceId: wsId,
          sourceType: 'note',
          sourceId: n.id,
          content: `笔记：${n.title}\n内容：${n.content}`,
          updatedAt: now,
        });
      }
      const summary = `角色 ${db.characters.filter((x) => x.workspaceId === wsId).length} 个，` +
        `事件 ${db.events.filter((x) => x.workspaceId === wsId).length} 个，` +
        `大纲节点 ${db.outlineNodes.filter((x) => x.workspaceId === wsId).length} 个，` +
        `笔记 ${db.notes.filter((x) => x.workspaceId === wsId).length} 条。`;
      const kv: AiKvEntry = {
        workspaceId: wsId,
        key: 'workspace_summary',
        value: summary,
        updatedAt: now,
      };
      db.aiKv = db.aiKv.filter((e) => !(e.workspaceId === wsId && e.key === 'workspace_summary'));
      db.aiKv.push(kv);
      return null;
    }
    case 'ai_kv_get': {
      const { workspaceId, key } = args as { workspaceId: string; key: string };
      return (
        db.aiKv.find((e) => e.workspaceId === workspaceId && e.key === key) ??
        null
      );
    }
    case 'ai_kv_set': {
      const entry = args.entry as AiKvEntry;
      const now = nowISO();
      db.aiKv = db.aiKv.filter(
        (e) => !(e.workspaceId === entry.workspaceId && e.key === entry.key),
      );
      db.aiKv.push({ ...entry, updatedAt: now });
      return db.aiKv[db.aiKv.length - 1];
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
        ...(input.fontTheme !== undefined ? { fontTheme: input.fontTheme } : {}),
        ...(input.aiProvider !== undefined ? { aiProvider: input.aiProvider } : {}),
        ...(input.aiModel !== undefined ? { aiModel: input.aiModel } : {}),
        ...(input.aiApiKey !== undefined ? { aiApiKey: input.aiApiKey } : {}),
        ...(input.aiBaseUrl !== undefined ? { aiBaseUrl: input.aiBaseUrl } : {}),
        ...(input.aiEnabled !== undefined ? { aiEnabled: input.aiEnabled } : {}),
        ...(input.aiRagEnabled !== undefined ? { aiRagEnabled: input.aiRagEnabled } : {}),
        ...(input.aiSystemPrompt !== undefined ? { aiSystemPrompt: input.aiSystemPrompt } : {}),
        ...(input.splashEnabled !== undefined ? { splashEnabled: input.splashEnabled } : {}),
        ...(input.splashDurationMs !== undefined ? { splashDurationMs: input.splashDurationMs } : {}),
      };
      return db.settings;
    }

    default:
      throw { code: 'UNKNOWN_COMMAND', message: `未知命令: ${command}` };
  }
}
