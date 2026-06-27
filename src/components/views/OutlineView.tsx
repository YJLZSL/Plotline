import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  ListTree,
  Trash2,
  Book,
  FileText,
  Circle,
  ArrowUp,
  ArrowDown,
  Download,
  Share2,
  CalendarDays,
  Image as ImageIcon,
  LayoutGrid,
  X,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

import {
  AppIcon,
  Button,
  EmptyState,
  Input,
  Label,
  Textarea,
  Badge,
  StatusDot,
  ConfirmDialog,
  Dialog,
  DialogContent,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn, downloadText } from '@/lib/utils';
import { MOTION_FAST } from '@/lib/motion';
import { toastError } from '@/stores/toast';
import { isTauri } from '@/lib/ipc';
import type { OutlineNode, OutlineNodeType } from '@/types';
import {
  useCreateOutlineNode,
  useDeleteOutlineNode,
  useOutlineQuery,
  useUpdateOutlineNode,
} from '@/features/outline/hooks';
import { useCreateEvent, useTracksQuery } from '@/features/timeline/hooks';
import { useExportOutlineMarkdown } from '@/features/workspace/hooks';
import { useMoveOutlineNode } from '@/features/outline/moveHooks';
import { OutlineTreeChart } from './OutlineTreeChart';
import { AiToolbarButton } from '@/features/ai/components/AiToolbarButton';
import { useAiContextStore } from '@/stores/aiContext';
import { useEditorSelectionStore } from '@/stores/editorSelection';

interface OutlineViewProps {
  workspaceId: string;
  workspaceName?: string;
}

const TYPE_ICONS: Record<OutlineNodeType, React.ComponentType<{ className?: string }>> = {
  volume: Book,
  chapter: FileText,
  scene: Circle,
  event: Circle,
};

export function OutlineView({ workspaceId, workspaceName }: OutlineViewProps) {
  const { t } = useI18n();
  const { data: nodes = [], isLoading } = useOutlineQuery(workspaceId);
  const createMutation = useCreateOutlineNode(workspaceId);
  const updateMutation = useUpdateOutlineNode(workspaceId);
  const deleteMutation = useDeleteOutlineNode(workspaceId);
  const moveMutation = useMoveOutlineNode(workspaceId);
  const exportMdMutation = useExportOutlineMarkdown();
  const createEvent = useCreateEvent(workspaceId);
  const { data: tracks = [] } = useTracksQuery(workspaceId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OutlineNode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card' | 'chart'>('list');

  // 构建树
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const setAiContext = useAiContextStore((s) => s.setContext);
  const registerTextEditor = useEditorSelectionStore(
    (s) => s.registerTextEditor,
  );
  const unregisterEditor = useEditorSelectionStore((s) => s.unregisterEditor);
  const updateContent = useEditorSelectionStore((s) => s.updateContent);
  const updateSelection = useEditorSelectionStore((s) => s.updateSelection);

  const registerOutlineTextEditor = (nodeId: string, content: string) => {
    registerTextEditor('outline', nodeId, content);
  };

  const isBlurMovingToAiPanel = (event: { relatedTarget: EventTarget | null }) => {
    const related = event.relatedTarget as HTMLElement | null;
    const aiPanel = document.querySelector('[data-testid="ai-assistant-panel"]');
    return Boolean(aiPanel && related && aiPanel.contains(related));
  };

  useEffect(() => {
    setAiContext({
      view: 'outline',
      viewLabel: t('outline.title'),
      selection: selected
        ? {
            type: selected.type,
            id: selected.id,
            label: selected.title,
            content: selected.content ?? '',
          }
        : null,
      suggestions: [
        { label: t('ai.suggestOutlineExpand'), prompt: t('ai.promptOutlineExpand') },
        { label: t('ai.suggestOutlineArc'), prompt: t('ai.promptOutlineArc') },
        { label: t('ai.suggestOutlineScene'), prompt: t('ai.promptOutlineScene') },
      ],
    });
  }, [t, selected, setAiContext]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async (type: OutlineNodeType, parentId: string | null) => {
    const n = await createMutation.mutateAsync({
      workspaceId,
      type,
      title: `新${type === 'volume' ? '卷' : type === 'chapter' ? '章' : type === 'scene' ? '场景' : '事件'}`,
      parentId,
    });
    if (parentId) setExpanded((p) => new Set(p).add(parentId));
    setSelectedId(n.id);
    setEditing(n);
    setEditDialogOpen(true);
  };

  const handleSave = async (data: { title: string; content: string; status: OutlineNode['status']; coverImage?: string | null }) => {
    if (!editing) return;
    await updateMutation.mutateAsync({
      id: editing.id,
      title: data.title,
      content: data.content,
      status: data.status,
      coverImage: data.coverImage,
    });
    setEditDialogOpen(false);
    setEditing(null);
  };

  const handleGenerateEvent = async (node: OutlineNode) => {
    if (tracks.length === 0) {
      toastError(new Error(t('outline.noTracksForEvent')));
      return;
    }
    const event = await createEvent.mutateAsync({
      workspaceId,
      trackId: tracks[0]!.id,
      title: node.title,
      description: node.content,
    });
    await updateMutation.mutateAsync({
      id: node.id,
      eventId: event.id,
    });
  };

  return (
    <>
      <Toolbar
        title={t('outline.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <div className="flex items-center gap-2">
            <div className="flex bg-bg-elevated rounded-[6px] p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
                  viewMode === 'list'
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={t('outline.title')}
              >
                <ListTree className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
                  viewMode === 'card'
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={t('outline.cardView')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
                  viewMode === 'chart'
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={t('treeChart.title')}
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void exportMdMutation.mutateAsync(workspaceId).then((md) => downloadText(`${workspaceName || t('outline.title')}.md`, md))}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('outline.exportMarkdown')}</span>
            </Button>
            <Button size="sm" onClick={() => void handleAdd('volume', null)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('outline.addVolume')}</span>
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <AiToolbarButton
              view="outline"
              viewLabel={t('outline.title')}
              selection={
                selected
                  ? {
                      type: selected.type,
                      id: selected.id,
                      label: selected.title,
                      content: selected.content ?? '',
                    }
                  : null
              }
              suggestions={[
                { label: t('ai.suggestOutlineExpand'), prompt: t('ai.promptOutlineExpand') },
                { label: t('ai.suggestOutlineArc'), prompt: t('ai.promptOutlineArc') },
                { label: t('ai.suggestOutlineScene'), prompt: t('ai.promptOutlineScene') },
              ]}
            />
          </div>
        }
      />

      {viewMode === 'chart' ? (
        <OutlineTreeChart
          nodes={nodes}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      ) : viewMode === 'card' ? (
        <OutlineCardView
          nodes={nodes}
          tree={tree}
          isLoading={isLoading}
          onSelect={(node) => {
            setSelectedId(node.id);
            setEditing(node);
            setEditDialogOpen(true);
          }}
          onAddVolume={() => void handleAdd('volume', null)}
        />
      ) : (
      <div className="flex flex-1 min-h-0">
        <div className="w-80 flex-shrink-0 border-r border-border bg-bg-surface overflow-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-8 rounded-[6px]" />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <EmptyState
              icon={<AppIcon size="lg" tone="accent"><ListTree /></AppIcon>}
              title={t('outline.empty.title')}
              description={t('outline.empty.description')}
              action={
                <Button size="sm" onClick={() => void handleAdd('volume', null)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('outline.addVolume')}
                </Button>
              }
            />
          ) : (
            <div className="py-2">
              {tree.map((node, i) => (
                <TreeView
                  key={node.id}
                  node={node}
                  level={0}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onAdd={handleAdd}
                  onDelete={(id) => setConfirmDelete(id)}
                  onMoveUp={i > 0 ? () => void moveMutation.mutateAsync({ id: node.id, parentId: node.parentId, sortOrder: tree[i - 1]!.sortOrder }) : undefined}
                  onMoveDown={i < tree.length - 1 ? () => void moveMutation.mutateAsync({ id: node.id, parentId: node.parentId, sortOrder: tree[i + 1]!.sortOrder }) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {selected ? (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">{selected.type}</Badge>
                <StatusDot status={selected.status} />
                <span className="text-xs text-text-secondary">
                  {selected.status === 'done'
                    ? t('outline.statusDone')
                    : selected.status === 'revise'
                      ? t('outline.statusRevise')
                      : t('outline.statusDraft')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-4">{selected.title}</h2>
              <div className="prose prose-sm max-w-none">
                {selected.content ? (
                  <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                    {selected.content}
                  </p>
                ) : (
                  <p className="text-sm text-text-secondary/60 italic">
                    {t('common.optional')} - 暂无内容
                  </p>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(selected);
                    setEditDialogOpen(true);
                  }}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleGenerateEvent(selected)}
                  loading={createEvent.isPending || updateMutation.isPending}
                  className="gap-1.5"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t('outline.generateEvent')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDelete(selected.id)}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<AppIcon size="lg" tone="accent"><ListTree /></AppIcon>}
              title={t('outline.title')}
              description={t('outline.subtitle')}
            />
          )}
        </div>
      </div>
      )}

      <OutlineEditDialog
        open={editDialogOpen}
        onOpenChange={(v) => {
          setEditDialogOpen(v);
          if (!v) setEditing(null);
        }}
        node={editing}
        onSave={handleSave}
        registerTextEditor={registerOutlineTextEditor}
        unregisterEditor={unregisterEditor}
        updateContent={updateContent}
        updateSelection={updateSelection}
        isBlurMovingToAiPanel={isBlurMovingToAiPanel}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={t('common.delete')}
        description={t('outline.title')}
        destructive
        confirmText={t('common.delete')}
        onConfirm={() => {
          if (confirmDelete) void deleteMutation.mutateAsync(confirmDelete);
          if (selectedId === confirmDelete) setSelectedId(null);
        }}
      />
    </>
  );
}

interface TreeNode extends OutlineNode {
  children: TreeNode[];
}

function buildTree(nodes: OutlineNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const n of nodes) map.set(n.id, { ...n, children: [] });
  const roots: TreeNode[] = [];
  for (const n of nodes) {
    const node = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  for (const node of map.values()) {
    node.children.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return roots.sort((a, b) => a.sortOrder - b.sortOrder);
}

function TreeView({
  node,
  level,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  node: TreeNode;
  level: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: OutlineNodeType, parentId: string | null) => void;
  onDelete: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { t } = useI18n();
  const Icon = TYPE_ICONS[node.type] ?? Circle;
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  const childType: OutlineNodeType | null =
    node.type === 'volume' ? 'chapter' : node.type === 'chapter' ? 'scene' : null;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1.5 px-2 h-9 rounded-[6px] mx-1 cursor-pointer transition-colors',
          selectedId === node.id
            ? 'bg-accent/10 text-accent'
            : 'text-text-primary hover:bg-bg-elevated',
        )}
        style={{ paddingLeft: 8 + level * 20 }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="text-text-secondary hover:text-text-primary p-0.5 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Icon className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
        <span className="text-sm truncate flex-1">{node.title}</span>
        <StatusDot status={node.status} />
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          {onMoveUp && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              className="text-text-secondary hover:text-accent p-1 rounded transition-colors"
              title="上移"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              className="text-text-secondary hover:text-accent p-1 rounded transition-colors"
              title="下移"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          )}
          {childType && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void onAdd(childType, node.id);
              }}
              className="text-text-secondary hover:text-accent p-1 rounded transition-colors"
              title={`添加${childType}`}
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="text-text-secondary hover:text-red-500 p-1 rounded transition-colors"
            title={t('common.delete')}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={MOTION_FAST}
            style={{ originY: 0 }}
            className="overflow-hidden will-change-transform"
          >
            {node.children.map((child) => (
              <TreeView
                key={child.id}
                node={child}
                level={level + 1}
                expanded={expanded}
                onToggle={onToggle}
                selectedId={selectedId}
                onSelect={onSelect}
                onAdd={onAdd}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OutlineCardView({
  nodes,
  tree,
  isLoading,
  onSelect,
  onAddVolume,
}: {
  nodes: OutlineNode[];
  tree: TreeNode[];
  isLoading: boolean;
  onSelect: (node: OutlineNode) => void;
  onAddVolume: () => void;
}) {
  const { t } = useI18n();

  const flatVolumes = useMemo(() => {
    const volumes = tree.filter((n) => n.type === 'volume');
    if (volumes.length === 0) {
      // 没有卷时，把所有顶层节点作为一组展示
      return [{ id: 'root', title: t('outline.title'), children: tree }];
    }
    return volumes.map((v) => ({ id: v.id, title: v.title, children: v.children }));
  }, [tree, t]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3">
            <div className="skeleton h-6 w-32 rounded-[6px]" />
            <div className="flex gap-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="skeleton w-40 h-52 rounded-[8px] flex-shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <EmptyState
          icon={<AppIcon size="lg" tone="accent"><LayoutGrid /></AppIcon>}
          title={t('outline.empty.title')}
          description={t('outline.empty.description')}
          action={
            <Button size="sm" onClick={onAddVolume} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('outline.addVolume')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-8">
      {flatVolumes.map((volume) => (
        <div key={volume.id}>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Book className="h-4 w-4 text-accent" />
            {volume.title}
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
            {volume.children.length === 0 ? (
              <span className="text-sm text-text-secondary/60 italic">{t('outline.emptyCardRow')}</span>
            ) : (
              volume.children.map((node) => (
                <OutlineCard key={node.id} node={node} onSelect={onSelect} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OutlineCard({
  node,
  onSelect,
}: {
  node: TreeNode;
  onSelect: (node: OutlineNode) => void;
}) {
  const { t } = useI18n();
  const Icon = TYPE_ICONS[node.type] ?? Circle;

  const imageUrl = useMemo(() => {
    if (!node.coverImage) return null;
    if (isTauri()) {
      try {
        return convertFileSrc(node.coverImage);
      } catch {
        return node.coverImage;
      }
    }
    return node.coverImage;
  }, [node.coverImage]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={MOTION_FAST}
      onClick={() => onSelect(node)}
      className={cn(
        'snap-start flex-shrink-0 w-40 rounded-[8px] bg-bg-surface border border-border cursor-pointer',
        'hover:border-accent/50 hover:shadow-md transition-all overflow-hidden',
      )}
    >
      <div className="h-28 w-full bg-bg-elevated flex items-center justify-center relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={node.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <Icon className="h-8 w-8 text-text-secondary/30" />
        )}
        <div className="absolute top-1.5 right-1.5">
          <StatusDot status={node.status} />
        </div>
      </div>
      <div className="p-2.5">
        <span className="text-xs font-medium text-text-primary line-clamp-2 leading-tight">
          {node.title}
        </span>
        <span className="text-[10px] text-text-secondary mt-1 block">
          {node.type === 'chapter' ? t('outline.chapter') : node.type === 'scene' ? t('outline.scene') : node.type === 'event' ? t('outline.event') : t('outline.volume')}
        </span>
      </div>
    </motion.div>
  );
}

function OutlineEditDialog({
  open: dialogOpen,
  onOpenChange,
  node,
  onSave,
  registerTextEditor,
  unregisterEditor,
  updateContent,
  updateSelection,
  isBlurMovingToAiPanel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: OutlineNode | null;
  onSave: (data: { title: string; content: string; status: OutlineNode['status']; coverImage?: string | null }) => void;
  registerTextEditor: (nodeId: string, content: string) => void;
  unregisterEditor: () => void;
  updateContent: (content: string) => void;
  updateSelection: (from: number, to: number) => void;
  isBlurMovingToAiPanel: (event: { relatedTarget: EventTarget | null }) => boolean;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<OutlineNode['status']>('draft');
  const [coverImage, setCoverImage] = useState<string | null>(null);

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content);
      setStatus(node.status);
      setCoverImage(node.coverImage);
      registerTextEditor(node.id, node.content);
    }
    return () => {
      unregisterEditor();
    };
  }, [node, registerTextEditor, unregisterEditor]);

  useEffect(() => {
    if (node) {
      updateContent(content);
    }
  }, [content, node, updateContent]);

  const pickCoverImage = async () => {
    if (!isTauri()) {
      toastError(new Error(t('outline.desktopOnlyImage')));
      return;
    }
    try {
      const path = await open({
        title: t('outline.selectCoverImage'),
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
      });
      if (path && typeof path === 'string') {
        setCoverImage(path);
      }
    } catch (e) {
      toastError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  const imageUrl = useMemo(() => {
    if (!coverImage) return null;
    if (isTauri()) {
      try {
        return convertFileSrc(coverImage);
      } catch {
        return coverImage;
      }
    }
    return coverImage;
  }, [coverImage]);

  if (!node) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
      <DialogContent title={t('common.edit')} className="max-w-xl">
        <div className="flex flex-col gap-4">
          <div>
            <Label>{t('common.edit')} - 标题</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
              autoFocus
              data-testid="outline-title-input"
            />
          </div>
          <div>
            <Label>状态</Label>
            <div className="flex gap-2 mt-1.5">
              {(['draft', 'done', 'revise'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    'flex-1 h-9 rounded-[6px] border text-xs transition-colors flex items-center justify-center gap-1.5',
                    status === s
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-secondary hover:bg-bg-elevated',
                  )}
                >
                  <StatusDot status={s} />
                  {s === 'draft'
                    ? t('outline.statusDraft')
                    : s === 'done'
                      ? t('outline.statusDone')
                      : t('outline.statusRevise')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="flex items-center justify-between">
              <span>封面图片</span>
              <div className="flex items-center gap-2">
                {coverImage && (
                  <button
                    onClick={() => setCoverImage(null)}
                    className="text-text-secondary hover:text-red-500 text-xs flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    清除
                  </button>
                )}
                <button
                  onClick={pickCoverImage}
                  className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"
                >
                  <ImageIcon className="h-3 w-3" />
                  {coverImage ? '更换' : '选择图片'}
                </button>
              </div>
            </Label>
            <div className="mt-1.5 h-32 rounded-[8px] border border-border bg-bg-elevated flex items-center justify-center overflow-hidden relative">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={t('outline.coverImage')}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-text-secondary/40">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs">{t('outline.noCoverImage')}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <Label>内容</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => {
                if (node) {
                  registerTextEditor(node.id, content);
                }
              }}
              onBlur={(e) => {
                if (isBlurMovingToAiPanel(e)) return;
                unregisterEditor();
              }}
              onSelect={(e) => {
                const target = e.target as HTMLTextAreaElement;
                updateSelection(target.selectionStart, target.selectionEnd);
              }}
              className="mt-1.5 min-h-[160px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => onSave({ title, content, status, coverImage })} disabled={!title.trim()} data-testid="outline-save-btn">
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
