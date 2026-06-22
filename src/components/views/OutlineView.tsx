import { useMemo, useState } from 'react';
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
} from 'lucide-react';

import {
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
import { cn } from '@/lib/utils';
import type { OutlineNode, OutlineNodeType } from '@/types';
import {
  useCreateOutlineNode,
  useDeleteOutlineNode,
  useOutlineQuery,
  useUpdateOutlineNode,
} from '@/features/outline/hooks';

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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OutlineNode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // 构建树
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

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

  const handleSave = async (data: { title: string; content: string; status: OutlineNode['status'] }) => {
    if (!editing) return;
    await updateMutation.mutateAsync({
      id: editing.id,
      title: data.title,
      content: data.content,
      status: data.status,
    });
    setEditDialogOpen(false);
    setEditing(null);
  };

  return (
    <>
      <Toolbar
        title={t('outline.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <Button size="sm" onClick={() => void handleAdd('volume', null)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('outline.addVolume')}</span>
          </Button>
        }
      />

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
              icon={<ListTree className="h-10 w-10" />}
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
              {tree.map((node) => (
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
              <div className="mt-6 flex gap-2">
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
              icon={<ListTree className="h-10 w-10" />}
              title={t('outline.title')}
              description={t('outline.subtitle')}
            />
          )}
        </div>
      </div>

      <OutlineEditDialog
        open={editDialogOpen}
        onOpenChange={(v) => {
          setEditDialogOpen(v);
          if (!v) setEditing(null);
        }}
        node={editing}
        onSave={handleSave}
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
}: {
  node: TreeNode;
  level: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: OutlineNodeType, parentId: string | null) => void;
  onDelete: (id: string) => void;
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
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

function OutlineEditDialog({
  open,
  onOpenChange,
  node,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: OutlineNode | null;
  onSave: (data: { title: string; content: string; status: OutlineNode['status'] }) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<OutlineNode['status']>('draft');

  useMemo(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content);
      setStatus(node.status);
    }
  }, [node]);

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('common.edit')} className="max-w-xl">
        <div className="flex flex-col gap-4">
          <div>
            <Label>{t('common.edit')} - 标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" autoFocus />
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
            <Label>内容</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1.5 min-h-[160px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => onSave({ title, content, status })} disabled={!title.trim()}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
