import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  X,
  Play,
  ChevronRight,
  Film,
  MessageSquare,
  BookOpen,
  GitBranch,
  Pencil,
  Download,
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  Music,
  FileAudio,
  AlertTriangle,
  CheckCircle,
  ScanLine,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';

import {
  AppIcon,
  Badge,
  Button,
  EmptyState,
  Input,
  Textarea,
  ConfirmDialog,
  Dialog,
  DialogContent,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { isTauri } from '@/lib/ipc';
import { MOTION_BASE, MOTION_FAST } from '@/lib/motion';
import { toastError, toastSuccess } from '@/stores/toast';
import type { Character, CreateVnLineInput, CreateVnSceneInput, UpdateVnLineInput, UpdateVnSceneInput, VnLine, VnLineType, VnScene } from '@/types';
import {
  useVnScenesQuery,
  useCreateVnScene,
  useDeleteVnScene,
  useUpdateVnScene,
  useVnLinesQuery,
  useVnAllLinesQuery,
  useCreateVnLine,
  useUpdateVnLine,
  useDeleteVnLine,
  useExportVnRenpy,
  useUploadVnAsset,
  useVnConsistencyQuery,
  useCheckVnConsistency,
} from '@/features/vn/hooks';
import {
  createVnLine as apiCreateVnLine,
  updateVnLine as apiUpdateVnLine,
  updateVnScene as apiUpdateVnScene,
} from '@/features/vn/api';
import { useCharactersQuery } from '@/features/characters/hooks';
import { AiToolbarButton } from '@/features/ai/components/AiToolbarButton';
import { useAiContextStore } from '@/stores/aiContext';

const EMOTIONS: Array<{ value: string; label: string; emoji: string }> = [
  { value: '', label: '默认', emoji: '😐' },
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'sad', label: '悲伤', emoji: '😢' },
  { value: 'angry', label: '愤怒', emoji: '😠' },
  { value: 'surprised', label: '惊讶', emoji: '😲' },
];

const LINE_TYPE_ICONS: Record<VnLineType, React.ComponentType<{ className?: string }>> = {
  dialog: MessageSquare,
  narration: BookOpen,
  choice: GitBranch,
};

type VnViewMode = 'edit' | 'preview' | 'graph';

type BackgroundMode = 'color' | 'emoji' | 'text';

interface ParsedBackground {
  mode: BackgroundMode;
  value: string;
}

function parseBackground(value: string): ParsedBackground {
  const trimmed = value.trim();
  if (!trimmed) {
    return { mode: 'color', value: '' };
  }
  if (/^\p{Extended_Pictographic}/u.test(trimmed)) {
    return { mode: 'emoji', value: trimmed };
  }
  if (
    trimmed.startsWith('#') ||
    trimmed.includes('gradient') ||
    trimmed.includes('linear') ||
    trimmed.includes('radial')
  ) {
    return { mode: 'color', value: trimmed };
  }
  return { mode: 'text', value: trimmed };
}

/** 将 **粗体** / *斜体* / __粗体__ / _斜体_ 解析为 React 节点。 */
function formatRichText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    const raw = match[0];
    if ((raw.startsWith('**') && raw.endsWith('**')) || (raw.startsWith('__') && raw.endsWith('__'))) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {raw.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <em key={key++} className="italic">
          {raw.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return nodes;
}

interface VnViewProps {
  workspaceId: string;
  workspaceName?: string;
}

async function importRenpyScript(
  content: string,
  workspaceId: string,
  createScene: (input: CreateVnSceneInput) => Promise<VnScene>,
  createLine: (input: CreateVnLineInput) => Promise<VnLine>,
  updateScene: (input: UpdateVnSceneInput) => Promise<VnScene>,
  updateLine: (input: UpdateVnLineInput) => Promise<VnLine>,
) {
  const rawLines = content.split('\n');
  let currentSceneId: string | null = null;
  let pendingSpriteAssetPath: string | null = null;
  let pendingVoicePath: string | null = null;

  const attachPendingAssets = async (line: VnLine) => {
    if (!pendingSpriteAssetPath && !pendingVoicePath) return line;
    const patch: Partial<VnLine> = {};
    if (pendingSpriteAssetPath) patch.spriteAssetPath = pendingSpriteAssetPath;
    if (pendingVoicePath) patch.voicePath = pendingVoicePath;
    const updated = await updateLine({ id: line.id, ...patch });
    pendingSpriteAssetPath = null;
    pendingVoicePath = null;
    return updated;
  };

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const labelMatch = trimmed.match(/^label\s+(\w+)\s*:/);
    if (labelMatch?.[1]) {
      const scene = await createScene({
        workspaceId,
        title: labelMatch[1],
        background: '',
      });
      currentSceneId = scene.id;
      pendingSpriteAssetPath = null;
      pendingVoicePath = null;
      continue;
    }

    if (!currentSceneId) continue;

    const sceneMatch = trimmed.match(/^scene\s+(.+)/);
    if (sceneMatch?.[1]) {
      const value = sceneMatch[1].trim();
      if (value.includes('/') || value.includes('\\') || value.includes('.')) {
        await updateScene({ id: currentSceneId, backgroundAssetPath: value });
      } else {
        await updateScene({ id: currentSceneId, background: value });
      }
      continue;
    }

    const playMusicMatch = trimmed.match(/^play\s+music\s+(.+)/);
    if (playMusicMatch?.[1]) {
      await updateScene({ id: currentSceneId, bgmPath: playMusicMatch[1].trim() });
      continue;
    }

    const showMatch = trimmed.match(/^show\s+(\S+)/);
    if (showMatch?.[1]) {
      pendingSpriteAssetPath = showMatch[1].trim();
      continue;
    }

    const voiceMatch = trimmed.match(/^voice\s+(.+)/);
    if (voiceMatch?.[1]) {
      pendingVoicePath = voiceMatch[1].trim();
      continue;
    }

    if (trimmed === 'menu:') continue;

    const choiceMatch = trimmed.match(/^"([^"]+)"(?:\s*:\s*)?(?:jump\s+(\w+))?/);
    if (choiceMatch?.[1]) {
      const line = await createLine({
        sceneId: currentSceneId,
        lineType: 'choice',
        choiceLabel: choiceMatch[1],
        text: choiceMatch[1],
        choiceTargetSceneId: choiceMatch[2] || null,
      });
      await attachPendingAssets(line);
      continue;
    }

    const sayMatch = trimmed.match(/^(\w+)\s+"([^"]+)"/);
    if (sayMatch) {
      const speaker = sayMatch[1];
      const text = sayMatch[2];
      if (speaker && text) {
        const line = await createLine({
          sceneId: currentSceneId,
          lineType: 'dialog',
          speakerName: speaker,
          text,
        });
        await attachPendingAssets(line);
        continue;
      }
    }

    const narrationMatch = trimmed.match(/^"([^"]+)"/);
    if (narrationMatch?.[1]) {
      const line = await createLine({
        sceneId: currentSceneId,
        lineType: 'narration',
        text: narrationMatch[1],
      });
      await attachPendingAssets(line);
    }
  }
}

function useVnAssetUrl(assetPath: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!assetPath || !isTauri()) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const dir = await appDataDir();
        const full = await join(dir, assetPath);
        if (!cancelled) setUrl(convertFileSrc(full));
      } catch {
        if (!cancelled) setUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetPath]);

  return url;
}

export function VnView({ workspaceId, workspaceName }: VnViewProps) {
  const { t } = useI18n();
  const { data: scenes = [], isLoading } = useVnScenesQuery(workspaceId);
  const { data: characters = [] } = useCharactersQuery(workspaceId);
  const qc = useQueryClient();
  const createScene = useCreateVnScene(workspaceId);
  const deleteScene = useDeleteVnScene(workspaceId);
  const updateScene = useUpdateVnScene(workspaceId);
  const exportRenpy = useExportVnRenpy(workspaceId);

  const handleImportRenpy = async () => {
    if (!isTauri()) return;
    try {
      const path = await open({
        title: t('vn.importRenpy'),
        multiple: false,
        filters: [{ name: 'Ren\'Py', extensions: ['rpy'] }],
      });
      if (!path || Array.isArray(path)) return;
      const content = await readTextFile(path);
      await importRenpyScript(
        content,
        workspaceId,
        (input) => createScene.mutateAsync(input),
        apiCreateVnLine,
        apiUpdateVnScene,
        apiUpdateVnLine,
      );
      qc.invalidateQueries({ queryKey: ['vnScenes', workspaceId] });
      toastSuccess(t('vn.imported'));
    } catch (err) {
      toastError(err);
    }
  };

  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<VnViewMode>('edit');
  const [confirmDeleteScene, setConfirmDeleteScene] = useState<string | null>(null);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);

  const selectedScene = scenes.find((s) => s.id === selectedSceneId) ?? null;
  const setAiContext = useAiContextStore((s) => s.setContext);

  useEffect(() => {
    setAiContext({
      view: 'vn',
      viewLabel: t('vn.title'),
      selection: selectedScene
        ? {
            type: 'vn_scene',
            id: selectedScene.id,
            label: selectedScene.title,
            content: selectedScene.background ?? '',
          }
        : null,
      suggestions: [
        { label: t('ai.suggestVnLines'), prompt: t('ai.promptVnLines') },
        { label: t('ai.suggestVnScene'), prompt: t('ai.promptVnScene') },
        { label: t('ai.suggestVnBranch'), prompt: t('ai.promptVnBranch') },
      ],
    });
  }, [t, selectedScene, setAiContext]);

  const handleAddScene = async () => {
    const s = await createScene.mutateAsync({
      workspaceId,
      title: t('vn.newScene'),
    });
    setSelectedSceneId(s.id);
    setViewMode('edit');
  };

  const handleExportRenpy = async () => {
    const content = await exportRenpy.mutateAsync();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspaceName || workspaceId}_vn_script.rpy`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Toolbar
        title={t('vn.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <div className="flex items-center gap-2">
            {selectedScene && (
              <div className="flex items-center gap-0.5 rounded-[6px] border border-border bg-bg-elevated p-0.5">
                <Button
                  variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('edit')}
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('vn.editMode')}</span>
                </Button>
                <Button
                  variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('preview')}
                  className="gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('vn.previewMode')}</span>
                </Button>
                <Button
                  variant={viewMode === 'graph' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('graph')}
                  className="gap-1.5"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('vn.graphView')}</span>
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleImportRenpy()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t('vn.importRenpy')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportRenpy}
              loading={exportRenpy.isPending}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('vn.exportRenpy')}</span>
            </Button>
            <Button size="sm" onClick={handleAddScene} className="gap-2" data-testid="add-scene-btn">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('vn.addScene')}</span>
            </Button>
            <div className="w-px h-5 bg-border" />
            <AiToolbarButton
              view="vn"
              viewLabel={t('vn.title')}
              selection={
                selectedScene
                  ? {
                      type: 'vn_scene',
                      id: selectedScene.id,
                      label: selectedScene.title,
                      content: selectedScene.background ?? '',
                    }
                  : null
              }
              suggestions={[
                { label: t('ai.suggestVnLines'), prompt: t('ai.promptVnLines') },
                { label: t('ai.suggestVnScene'), prompt: t('ai.promptVnScene') },
                { label: t('ai.suggestVnBranch'), prompt: t('ai.promptVnBranch') },
              ]}
            />
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* 场景列表 */}
        <aside className="w-64 flex-shrink-0 border-r border-border bg-bg-surface overflow-auto">
          <div className="h-11 px-3 flex items-center border-b border-border">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t('vn.scenes')}
            </span>
          </div>
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-9 rounded-[6px]" />
              ))}
            </div>
          ) : scenes.length === 0 ? (
            <div className="p-4">
              <p className="text-xs text-text-secondary/60 text-center">{t('vn.emptyScenes')}</p>
            </div>
          ) : (
            <div className="py-2">
              {scenes.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...MOTION_BASE, delay: Math.min(i * 0.02, 0.1) }}
                  className={cn(
                    'group flex items-center gap-2 px-3 h-10 mx-1 rounded-[6px] cursor-pointer transition-colors',
                    selectedSceneId === s.id
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-primary hover:bg-bg-elevated',
                  )}
                  onClick={() => setSelectedSceneId(s.id)}
                >
                  <Film className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
                  <span className="text-sm truncate flex-1">{s.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteScene(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 p-0.5 rounded transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </aside>

        {/* 编辑器、预览或关系图 */}
        {selectedScene ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={MOTION_BASE}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {viewMode === 'preview' ? (
                <VnPreview
                  key={selectedScene.id}
                  scene={selectedScene}
                  characters={characters}
                  onExit={() => setViewMode('edit')}
                  onJumpScene={(id) => {
                    setSelectedSceneId(id);
                  }}
                  t={t}
                />
              ) : viewMode === 'graph' ? (
                <VnGraphPanel
                  workspaceId={workspaceId}
                  scenes={scenes}
                  onSelectScene={(id) => setSelectedSceneId(id)}
                  t={t}
                />
              ) : (
                <VnScriptEditor
                  scene={selectedScene}
                  characters={characters}
                  scenes={scenes}
                  workspaceId={workspaceId}
                  onRename={(title) => updateScene.mutateAsync({ id: selectedScene.id, title })}
                  onUpdateBackground={(background) =>
                    updateScene.mutateAsync({ id: selectedScene.id, background })
                  }
                  onFullPreview={() => setFullPreviewOpen(true)}
                  t={t}
                />
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex-1 grid place-items-center">
            <EmptyState
              icon={
                <AppIcon size="lg" tone="accent">
                  <Film />
                </AppIcon>
              }
              title={t('vn.empty.title')}
              description={t('vn.empty.description')}
              action={
                <Button onClick={handleAddScene} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('vn.addScene')}
                </Button>
              }
            />
          </div>
        )}
      </div>

      <VnFullPreviewDialog
        open={fullPreviewOpen}
        onOpenChange={setFullPreviewOpen}
        scenes={scenes}
        characters={characters}
        startSceneId={selectedSceneId ?? ''}
        t={t}
      />

      <ConfirmDialog
        open={confirmDeleteScene !== null}
        onOpenChange={(v) => !v && setConfirmDeleteScene(null)}
        title={t('common.delete')}
        description={t('vn.scene')}
        destructive
        confirmText={t('common.delete')}
        onConfirm={() => {
          if (confirmDeleteScene) {
            void deleteScene.mutateAsync(confirmDeleteScene);
            if (selectedSceneId === confirmDeleteScene) setSelectedSceneId(null);
          }
        }}
      />
    </>
  );
}

// ===== 剧本编辑器 =====
function VnScriptEditor({
  scene,
  characters,
  scenes,
  workspaceId,
  onRename,
  onUpdateBackground,
  onFullPreview,
  t,
}: {
  scene: VnScene;
  characters: Character[];
  scenes: VnScene[];
  workspaceId: string;
  onRename: (title: string) => void;
  onUpdateBackground: (background: string) => void;
  onFullPreview: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { data: lines = [], isLoading } = useVnLinesQuery(scene.id);
  const createLine = useCreateVnLine(scene.id);
  const updateLine = useUpdateVnLine(scene.id);
  const deleteLine = useDeleteVnLine(scene.id);
  const updateScene = useUpdateVnScene(workspaceId);
  const uploadAsset = useUploadVnAsset(workspaceId);

  const [title, setTitle] = useState(scene.title);
  const [background, setBackground] = useState(scene.background);

  const pickAndUploadAsset = async (
    titleKey: string,
    extensions: string[],
  ): Promise<string | null> => {
    if (!isTauri()) return null;
    const path = await open({
      title: t(titleKey),
      multiple: false,
      filters: [{ name: 'Files', extensions }],
    });
    if (!path || Array.isArray(path)) return null;
    return uploadAsset.mutateAsync(path);
  };

  const handleUploadBackground = async () => {
    const assetPath = await pickAndUploadAsset('vn.uploadBackground', ['png', 'jpg', 'jpeg', 'webp', 'gif']);
    if (assetPath) {
      await updateScene.mutateAsync({ id: scene.id, backgroundAssetPath: assetPath });
    }
  };

  const handleUploadBgm = async () => {
    const assetPath = await pickAndUploadAsset('vn.uploadBgm', ['mp3', 'ogg', 'wav']);
    if (assetPath) {
      await updateScene.mutateAsync({ id: scene.id, bgmPath: assetPath });
    }
  };

  useEffect(() => {
    setTitle(scene.title);
    setBackground(scene.background);
  }, [scene.id, scene.title, scene.background]);

  const handleAddLine = async (type: VnLineType) => {
    await createLine.mutateAsync({
      sceneId: scene.id,
      lineType: type,
      text: type === 'choice' ? t('vn.newChoice') : '',
      speakerName: type === 'narration' ? '' : '',
      spritePosition: 'center',
    });
  };

  const handleReorder = (lineId: string, direction: 'up' | 'down') => {
    const idx = lines.findIndex((l) => l.id === lineId);
    if (idx < 0) return;
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= lines.length) return;
    const line = lines[idx];
    const neighbor = lines[neighborIdx];
    if (!line || !neighbor) return;
    void updateLine.mutateAsync({ id: line.id, sortOrder: neighbor.sortOrder });
    void updateLine.mutateAsync({ id: neighbor.id, sortOrder: line.sortOrder });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 场景标题栏 */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-border bg-bg-surface">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== scene.title) void onRename(title.trim());
          }}
          className="flex-1 max-w-md text-sm font-semibold"
          data-testid="scene-title-input"
        />
        <Input
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          onBlur={() => {
            if (background !== scene.background) {
              void onUpdateBackground(background);
            }
          }}
          placeholder={t('vn.background')}
          className="w-40 text-xs"
          title={t('vn.background')}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void handleUploadBackground()}
          loading={uploadAsset.isPending}
          title={t('vn.uploadBackground')}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void handleUploadBgm()}
          loading={uploadAsset.isPending}
          title={t('vn.uploadBgm')}
        >
          <Music className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onFullPreview}
          className="gap-1.5"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('vn.fullPreview')}</span>
        </Button>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => handleAddLine('dialog')} className="gap-1.5" data-testid="add-line-dialog-btn">
            <MessageSquare className="h-3.5 w-3.5" />
            {t('vn.lineDialog')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddLine('narration')} className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {t('vn.lineNarration')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddLine('choice')} className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            {t('vn.lineChoice')}
          </Button>
        </div>
      </div>

      {/* 台词列表 */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="space-y-2 max-w-2xl mx-auto">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-[8px]" />
            ))}
          </div>
        ) : lines.length === 0 ? (
          <div className="grid place-items-center py-16">
            <p className="text-sm text-text-secondary/60">{t('vn.emptyLines')}</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-2">
            <AnimatePresence initial={false}>
              {lines.map((line, i) => (
                <VnLineRow
                  key={line.id}
                  line={line}
                  index={i}
                  characters={characters}
                  scenes={scenes}
                  workspaceId={workspaceId}
                  currentSceneId={scene.id}
                  canMoveUp={i > 0}
                  canMoveDown={i < lines.length - 1}
                  onChange={(patch) => updateLine.mutateAsync({ id: line.id, ...patch })}
                  onDelete={() => deleteLine.mutateAsync(line.id)}
                  onReorder={(direction) => handleReorder(line.id, direction)}
                  t={t}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 台词行 =====
export function VnLineRow({
  line,
  index,
  characters,
  scenes,
  workspaceId,
  currentSceneId,
  canMoveUp,
  canMoveDown,
  onChange,
  onDelete,
  onReorder,
  t,
}: {
  line: VnLine;
  index: number;
  characters: Character[];
  scenes: VnScene[];
  workspaceId: string;
  currentSceneId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (patch: Partial<VnLine>) => void;
  onDelete: () => void;
  onReorder: (direction: 'up' | 'down') => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const Icon = LINE_TYPE_ICONS[line.lineType];
  const isChoice = line.lineType === 'choice';
  const isNarration = line.lineType === 'narration';
  const uploadAsset = useUploadVnAsset(workspaceId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = line.text.slice(start, end);
    const newText = line.text.slice(0, start) + prefix + selected + suffix + line.text.slice(end);
    onChange({ text: newText });
    window.requestAnimationFrame(() => {
      el.focus();
      const caret = start + prefix.length + selected.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const pickAndUpload = async (titleKey: string, extensions: string[]) => {
    if (!isTauri()) return null;
    const path = await open({
      title: t(titleKey),
      multiple: false,
      filters: [{ name: 'Files', extensions }],
    });
    if (!path || Array.isArray(path)) return null;
    return uploadAsset.mutateAsync(path);
  };

  const handleUploadSprite = async () => {
    const assetPath = await pickAndUpload('vn.uploadSprite', ['png', 'jpg', 'jpeg', 'webp', 'gif']);
    if (assetPath) onChange({ spriteAssetPath: assetPath });
  };

  const handleUploadVoice = async () => {
    const assetPath = await pickAndUpload('vn.uploadVoice', ['mp3', 'ogg', 'wav']);
    if (assetPath) onChange({ voicePath: assetPath });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={MOTION_FAST}
      className={cn(
        'group relative rounded-[8px] border bg-bg-surface p-3 transition-shadow',
        isChoice ? 'border-accent/40' : 'border-border',
        'hover:shadow-[var(--shadow-card)]',
      )}
    >
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 mt-0.5 text-text-secondary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* 说话人 / 旁白 */}
          {!isChoice && (
            <div className="flex items-center gap-2">
              {isNarration ? (
                <span className="text-[11px] text-text-secondary italic">{t('vn.narrationLabel')}</span>
              ) : (
                <>
                  <select
                    value={line.characterId ?? ''}
                    onChange={(e) =>
                      onChange({
                        characterId: e.target.value || null,
                        speakerName: e.target.value ? '' : line.speakerName,
                      })
                    }
                    className="h-7 rounded-[4px] border border-border bg-bg-elevated px-2 text-xs"
                  >
                    <option value="">{t('vn.customSpeaker')}</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {!line.characterId && (
                    <Input
                      value={line.speakerName}
                      onChange={(e) => onChange({ speakerName: e.target.value })}
                      placeholder={t('vn.speakerNamePlaceholder')}
                      className="h-7 w-32 text-xs"
                    />
                  )}
                  <select
                    value={line.emotion}
                    onChange={(e) => onChange({ emotion: e.target.value as VnLine['emotion'] })}
                    className="h-7 rounded-[4px] border border-border bg-bg-elevated px-2 text-xs"
                  >
                    {EMOTIONS.map((em) => (
                      <option key={em.value} value={em.value}>
                        {em.emoji} {em.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {/* 台词文本 */}
          {isChoice ? (
            <div className="flex items-center gap-2">
              <Input
                value={line.choiceLabel}
                onChange={(e) => onChange({ choiceLabel: e.target.value })}
                placeholder={t('vn.choiceLabelPlaceholder')}
                className="h-8 w-40 text-xs"
              />
              <span className="text-text-secondary">→</span>
              <select
                value={line.choiceTargetSceneId ?? ''}
                onChange={(e) => onChange({ choiceTargetSceneId: e.target.value || null })}
                className="h-8 rounded-[4px] border border-border bg-bg-elevated px-2 text-xs flex-1"
              >
                <option value="">{t('vn.noTarget')}</option>
                {scenes
                  .filter((s) => s.id !== currentSceneId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}

          <div className="flex items-center gap-1">
            <button
              onClick={() => wrapSelection('**')}
              className="p-1 rounded-[4px] text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              title={t('common.bold')}
              type="button"
            >
              <Bold className="h-3 w-3" />
            </button>
            <button
              onClick={() => wrapSelection('*')}
              className="p-1 rounded-[4px] text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              title={t('common.italic')}
              type="button"
            >
              <Italic className="h-3 w-3" />
            </button>
          </div>
          <Textarea
            ref={textareaRef}
            value={line.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder={isChoice ? t('vn.choiceTextPlaceholder') : t('vn.textPlaceholder')}
            className="text-sm min-h-[44px] resize-y"
            data-testid="line-text-input"
          />
          {!isNarration && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void handleUploadSprite()}
                disabled={uploadAsset.isPending}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-[5px] text-[10px] border transition-colors disabled:opacity-50',
                  line.spriteAssetPath
                    ? 'border-accent/40 text-accent bg-accent/10'
                    : 'border-border text-text-secondary hover:text-text-primary',
                )}
                title={t('vn.uploadSprite')}
              >
                <ImageIcon className="h-3 w-3" />
                {line.spriteAssetPath ? t('vn.spriteUploaded') : t('vn.uploadSprite')}
              </button>
              {/* 立绘位置选择器 */}
              <div className="flex items-center gap-0.5 rounded-[5px] border border-border overflow-hidden">
                <span className="px-1.5 py-1 text-[10px] text-text-secondary border-r border-border bg-bg-elevated">
                  {t('vn.spritePosition')}
                </span>
                {([
                  { value: 'left', icon: AlignLeft, label: t('vn.spritePositionLeft') },
                  { value: 'center', icon: AlignCenter, label: t('vn.spritePositionCenter') },
                  { value: 'right', icon: AlignRight, label: t('vn.spritePositionRight') },
                ] as const).map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ spritePosition: value })}
                    className={cn(
                      'flex items-center justify-center p-1 transition-colors',
                      (line.spritePosition || 'center') === value
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
                    )}
                    title={label}
                  >
                    <Icon className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => void handleUploadVoice()}
                disabled={uploadAsset.isPending}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-[5px] text-[10px] border transition-colors disabled:opacity-50',
                  line.voicePath
                    ? 'border-accent/40 text-accent bg-accent/10'
                    : 'border-border text-text-secondary hover:text-text-primary',
                )}
                title={t('vn.uploadVoice')}
              >
                <FileAudio className="h-3 w-3" />
                {line.voicePath ? t('vn.voiceUploaded') : t('vn.uploadVoice')}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => onReorder('up')}
            disabled={!canMoveUp}
            className="text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-secondary p-1 rounded transition-all"
            title={t('vn.reorderUp')}
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => onReorder('down')}
            disabled={!canMoveDown}
            className="text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-secondary p-1 rounded transition-all"
            title={t('vn.reorderDown')}
          >
            <ArrowDown className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 p-1 rounded transition-all"
            title={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <span className="absolute top-1 left-1 text-[9px] text-text-secondary/40">{index + 1}</span>
    </motion.div>
  );
}

// ===== 关系图 =====
function VnGraphPanel({
  workspaceId,
  scenes,
  onSelectScene,
  t,
}: {
  workspaceId: string;
  scenes: VnScene[];
  onSelectScene: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { data: allLines = [], isLoading: linesLoading } = useVnAllLinesQuery(workspaceId, scenes.length > 0);
  const { data: issues = [], isLoading: issuesLoading, refetch } = useVnConsistencyQuery(workspaceId, scenes.length > 0);
  const check = useCheckVnConsistency(workspaceId);

  if (linesLoading || issuesLoading) {
    return (
      <div className="flex-1 grid place-items-center">
        <div className="space-y-2">
          <div className="skeleton h-8 w-32 rounded-[6px]" />
          <div className="skeleton h-32 w-64 rounded-[8px]" />
        </div>
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="flex-1 grid place-items-center">
        <p className="text-sm text-text-secondary/60">{t('vn.emptyScenes')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-bg-surface flex-shrink-0">
        <div className="flex items-center gap-2">
          {issues.length === 0 ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-text-secondary">{t('vn.noIssues')}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-text-secondary">
                {t('vn.issuesFound', { count: issues.length })}
              </span>
            </>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void (check.mutateAsync().then(() => refetch()))}
          loading={check.isPending}
          className="gap-1.5"
        >
          <ScanLine className="h-3.5 w-3.5" />
          {t('vn.checkBranches')}
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        {issues.length > 0 && (
          <div className="p-4 space-y-2">
            {issues.map((issue) => (
              <button
                key={`${issue.kind}-${issue.sceneId ?? ''}-${issue.lineId ?? ''}`}
                onClick={() => issue.sceneId && onSelectScene(issue.sceneId)}
                className="w-full text-left rounded-[6px] border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-text-secondary hover:bg-amber-500/10 transition-colors"
              >
                <span className="font-medium text-amber-600">{t(`vn.issue.${issue.kind}`)}</span>
                <span className="ml-2">{issue.message}</span>
              </button>
            ))}
          </div>
        )}
        <VnGraph scenes={scenes} lines={allLines} onSelectScene={onSelectScene} />
      </div>
    </div>
  );
}

function VnGraph({
  scenes,
  lines,
  onSelectScene,
}: {
  scenes: VnScene[];
  lines: VnLine[];
  onSelectScene: (id: string) => void;
}) {
  const nodes = useMemo(() => {
    const nodeWidth = 136;
    const gapX = 176;
    const gapY = 120;
    const cols = Math.max(1, Math.floor(720 / gapX));
    return scenes.map((s, i) => ({
      ...s,
      x: (i % cols) * gapX + nodeWidth / 2 + 24,
      y: Math.floor(i / cols) * gapY + 56,
    }));
  }, [scenes]);

  const edges = useMemo(() => {
    return lines
      .filter((l) => l.lineType === 'choice' && l.choiceTargetSceneId)
      .map((l) => ({
        from: l.sceneId,
        to: l.choiceTargetSceneId as string,
        label: l.choiceLabel || l.text,
      }));
  }, [lines]);

  const width = (() => {
    const gapX = 176;
    const cols = Math.max(1, Math.floor(720 / gapX));
    return cols * gapX + 48;
  })();

  const height = (() => {
    const gapY = 120;
    const cols = Math.max(1, Math.floor(720 / 176));
    return Math.ceil(scenes.length / cols) * gapY + 80;
  })();

  const nodeWidth = 136;
  const nodeHeight = 48;

  return (
    <div className="flex-1 overflow-auto bg-bg-base p-6">
      <svg
        width={width}
        height={height}
        className="mx-auto"
        role="img"
        aria-label="VN scene graph"
      >
        <defs>
          <marker
            id="vn-graph-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-text-secondary/60" />
          </marker>
        </defs>
        {edges.map((edge, idx) => {
          const from = nodes.find((n) => n.id === edge.from);
          const to = nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          const sx = from.x + nodeWidth / 2;
          const sy = from.y + nodeHeight / 2;
          const tx = to.x - nodeWidth / 2 - 6;
          const ty = to.y + nodeHeight / 2;
          const d = `M ${sx} ${sy} C ${sx + 48} ${sy}, ${tx - 48} ${ty}, ${tx} ${ty}`;
          return (
            <g key={idx}>
              <path
                d={d}
                fill="none"
                className="stroke-text-secondary/40"
                strokeWidth={1.5}
                markerEnd="url(#vn-graph-arrow)"
              />
            </g>
          );
        })}
        {nodes.map((n) => (
          <g
            key={n.id}
            onClick={() => onSelectScene(n.id)}
            className="cursor-pointer"
            transform={`translate(${n.x - nodeWidth / 2}, ${n.y - nodeHeight / 2})`}
          >
            <rect
              width={nodeWidth}
              height={nodeHeight}
              rx={8}
              className="fill-bg-surface stroke-accent"
              strokeWidth={1.5}
            />
            <text
              x={nodeWidth / 2}
              y={nodeHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-text-primary text-xs font-medium"
            >
              {n.title}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ===== VN 预览模式 =====
function useTypewriter(text: string, speed = 24) {
  const [display, setDisplay] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplay('');
    setDone(false);
    if (!text) {
      setDone(true);
      return;
    }
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setDisplay(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { display, done };
}

function VnPreview({
  scene,
  characters,
  onExit,
  onJumpScene,
  t,
}: {
  scene: VnScene;
  characters: Character[];
  onExit: () => void;
  onJumpScene: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { data: lines = [] } = useVnLinesQuery(scene.id);
  const charById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showChoices, setShowChoices] = useState(false);

  const currentLine = lines[currentIdx] ?? null;
  const isLast = currentIdx >= lines.length - 1;

  const bgImageUrl = useVnAssetUrl(scene.backgroundAssetPath);
  const bgmUrl = useVnAssetUrl(scene.bgmPath);
  const spriteUrl = useVnAssetUrl(currentLine?.spriteAssetPath ?? null);
  const voiceUrl = useVnAssetUrl(currentLine?.voicePath ?? null);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setCurrentIdx(0);
    setShowChoices(false);
  }, [scene.id]);

  useEffect(() => {
    if (!bgmUrl) {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
      return;
    }
    const audio = new Audio(bgmUrl);
    audio.loop = true;
    audio.volume = 0.5;
    void audio.play().catch(() => {});
    bgmRef.current = audio;
    return () => {
      audio.pause();
      if (bgmRef.current === audio) bgmRef.current = null;
    };
  }, [bgmUrl]);

  useEffect(() => {
    if (voiceRef.current) {
      voiceRef.current.pause();
      voiceRef.current = null;
    }
    if (!voiceUrl) return;
    const audio = new Audio(voiceUrl);
    audio.volume = 1;
    void audio.play().catch(() => {});
    voiceRef.current = audio;
    return () => {
      audio.pause();
      if (voiceRef.current === audio) voiceRef.current = null;
    };
  }, [voiceUrl]);

  const advance = () => {
    if (!currentLine) return;
    if (currentLine.lineType === 'choice' && !showChoices) {
      setShowChoices(true);
      return;
    }
    if (isLast) return;
    setCurrentIdx((i) => i + 1);
    setShowChoices(false);
  };

  const handleChoice = (target: string | null) => {
    if (target) {
      onJumpScene(target);
    } else if (!isLast) {
      setCurrentIdx((i) => i + 1);
      setShowChoices(false);
    }
  };

  const speaker = currentLine?.characterId
    ? charById.get(currentLine.characterId) ?? null
    : null;
  const speakerName = speaker?.name ?? currentLine?.speakerName ?? '';
  const emotionEmoji = EMOTIONS.find((e) => e.value === currentLine?.emotion)?.emoji ?? '';

  const bg = useMemo(() => parseBackground(scene.background), [scene.background]);
  const backgroundStyle = useMemo<React.CSSProperties>(() => {
    if (bg.value?.startsWith('#')) {
      return { '--scene-bg': `${bg.value}20` } as React.CSSProperties;
    }
    if (bg.value) return { background: bg.value };
    return {};
  }, [bg]);

  const typewriterText = currentLine?.lineType === 'narration' || currentLine?.lineType === 'dialog'
    ? currentLine.text
    : '';
  const { display: typedText, done: typewriterDone } = useTypewriter(typewriterText, 24);

  return (
    <div
      className={cn(
        'flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden',
        (!bg.value || bg.mode === 'emoji' || bg.mode === 'text') &&
          'bg-gradient-to-b from-bg-elevated to-bg-base',
        bg.value?.startsWith('#') &&
          'bg-[linear-gradient(180deg,var(--scene-bg)_0%,var(--bg-base)_70%)]',
      )}
      style={backgroundStyle}
      onClick={advance}
    >
      {/* 背景层 */}
      {bg.mode === 'emoji' && (
        <div className="absolute inset-0 grid place-items-center opacity-10 select-none pointer-events-none">
          <span className="text-[12rem] leading-none">{bg.value}</span>
        </div>
      )}
      {bg.mode === 'text' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center max-w-xl opacity-20 pointer-events-none select-none">
          <p className="text-2xl text-text-primary font-semibold">{bg.value}</p>
        </div>
      )}
      {bgImageUrl && (
        <img
          src={bgImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {spriteUrl && (
        <img
          src={spriteUrl}
          alt=""
          className={cn(
            'absolute bottom-28 z-10 h-56 object-contain drop-shadow-lg',
            (currentLine?.spritePosition || 'center') === 'center' && 'left-1/2 -translate-x-1/2',
            (currentLine?.spritePosition || 'center') === 'left' && 'left-8',
            (currentLine?.spritePosition || 'center') === 'right' && 'right-8',
          )}
        />
      )}

      {/* 顶部场景标题 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <Badge variant="outline" className="text-xs">
          {scene.title}
        </Badge>
      </div>

      {/* 退出按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        className="absolute top-4 right-4 text-text-secondary hover:text-text-primary p-2 rounded-[6px] hover:bg-bg-surface transition-colors"
        title={t('vn.editMode')}
      >
        <X className="h-4 w-4" />
      </button>

      {/* 对话框区域 */}
      <AnimatePresence mode="wait">
        {currentLine && (
          <motion.div
            key={currentLine.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={MOTION_BASE}
            className="w-full max-w-2xl"
          >
            {currentLine.lineType === 'narration' ? (
              <div className="text-center py-8">
                <p className="text-base text-text-secondary italic leading-relaxed whitespace-pre-wrap">
                  {formatRichText(typedText)}
                </p>
              </div>
            ) : currentLine.lineType === 'choice' && showChoices ? (
              <div className="flex flex-col gap-2 py-4" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm text-text-secondary text-center mb-2">
                  {currentLine.choiceLabel || t('vn.choose')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => handleChoice(currentLine.choiceTargetSceneId)}
                  className="gap-2"
                >
                  {currentLine.text || t('vn.continue')}
                  {currentLine.choiceTargetSceneId && <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ) : (
              <div className="rounded-[12px] bg-bg-surface/95 backdrop-blur-sm border border-border shadow-[var(--shadow-elevated)] p-6">
                {speakerName && (
                  <div className="flex items-center gap-2 mb-3">
                    {speaker && (
                      <span
                        className="h-8 w-8 rounded-full grid place-items-center overflow-hidden text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: speaker.color }}
                      >
                        {speaker.avatar ? (
                          <img
                            src={speaker.avatar}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          speaker.name.slice(0, 1)
                        )}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-text-primary">{speakerName}</span>
                    {emotionEmoji && <span className="text-base">{emotionEmoji}</span>}
                  </div>
                )}
                <p className="text-base text-text-primary leading-relaxed whitespace-pre-wrap min-h-[2em]">
                  {currentLine.lineType === 'choice' ? currentLine.text || '…' : formatRichText(typedText)}
                </p>
                {!isLast && typewriterDone && (
                  <div className="flex justify-end mt-3">
                    <ChevronRight className="h-4 w-4 text-text-secondary animate-pulse" />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部进度 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-text-secondary">
        <span>
          {currentIdx + 1} / {lines.length}
        </span>
        {isLast && currentLine && (
          <Badge variant="outline" className="text-[10px]">
            {t('vn.sceneEnd')}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ===== 完整预览对话框 =====
function VnFullPreviewDialog({
  open,
  onOpenChange,
  scenes,
  characters,
  startSceneId,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenes: VnScene[];
  characters: Character[];
  startSceneId: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [currentSceneId, setCurrentSceneId] = useState(startSceneId);

  useEffect(() => {
    if (open) setCurrentSceneId(startSceneId);
  }, [open, startSceneId]);

  const currentScene = scenes.find((s) => s.id === currentSceneId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col min-h-0">
          {currentScene ? (
            <VnPreview
              scene={currentScene}
              characters={characters}
              onExit={() => onOpenChange(false)}
              onJumpScene={(id) => setCurrentSceneId(id)}
              t={t}
            />
          ) : (
            <div className="flex-1 grid place-items-center">
              <p className="text-sm text-text-secondary">{t('vn.emptyScenes')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
