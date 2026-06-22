import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Users,
  Trash2,
  X,
  Network,
  LayoutGrid,
  Grid3x3,
} from 'lucide-react';

import {
  AppIcon,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Label,
  Textarea,
  ConfirmDialog,
  Dialog,
  DialogContent,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn, truncate } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import type { Character } from '@/types';
import {
  useCreateCharacter,
  useDeleteCharacter,
  useCharactersQuery,
  useUpdateCharacter,
} from '@/features/characters/hooks';
import { RelationshipGraph } from '@/features/characters/RelationshipGraph';
import { RelationshipMatrix } from './RelationshipMatrix';
import { useRelationshipsQuery } from '@/features/characters/relationshipHooks';

const PALETTE = ['#F4B6C2', '#B6D4F4', '#B6F4C8', '#F4E4B6', '#D8B6F4', '#F4CBB6'];

type Tab = 'list' | 'graph' | 'matrix';

interface CharactersViewProps {
  workspaceId: string;
  workspaceName?: string;
}

export function CharactersView({ workspaceId, workspaceName }: CharactersViewProps) {
  const { t } = useI18n();
  const { data: characters = [], isLoading } = useCharactersQuery(workspaceId);
  const { data: relationships = [] } = useRelationshipsQuery(workspaceId);
  const createMutation = useCreateCharacter(workspaceId);
  const updateMutation = useUpdateCharacter(workspaceId);
  const deleteMutation = useDeleteCharacter(workspaceId);

  const [tab, setTab] = useState<Tab>('list');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const c of characters) for (const tag of c.tags) s.add(tag);
    return [...s];
  }, [characters]);

  const [filterTag, setFilterTag] = useState<string | null>(null);

  const filtered = characters.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTag && !c.tags.includes(filterTag)) return false;
    return true;
  });

  const selected = characters.find((c) => c.id === selectedId) ?? null;

  const handleAdd = async () => {
    const c = await createMutation.mutateAsync({
      workspaceId,
      name: '新角色',
      color: PALETTE[characters.length % PALETTE.length] ?? '#F4B6C2',
    });
    setEditing(c);
    setEditOpen(true);
    setSelectedId(c.id);
  };

  return (
    <>
      <Toolbar
        title={t('characters.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <div className="flex items-center gap-1">
            <div className="flex bg-bg-elevated rounded-[6px] p-0.5 mr-2">
              <button
                onClick={() => setTab('list')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
                  tab === 'list'
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={t('matrix.viewList')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTab('graph')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
                  tab === 'graph'
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={t('matrix.viewGraph')}
              >
                <Network className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTab('matrix')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs transition-colors',
                  tab === 'matrix'
                    ? 'bg-bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={t('matrix.title')}
              >
                <Grid3x3 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button size="sm" onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('characters.add')}</span>
            </Button>
          </div>
        }
      />

      {tab === 'graph' ? (
        <div className="flex flex-1 min-h-0 flex-col">
          <RelationshipGraph
            workspaceId={workspaceId}
            characters={characters}
            onCharacterClick={(id) => setSelectedId(id)}
          />
          <AnimatePresence>
            {selected && (
              <motion.aside
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={MOTION_BASE}
                className="w-80 flex-shrink-0 border-l border-border bg-bg-surface overflow-y-auto"
              >
                <CharacterDetailPanel
                  character={selected}
                  onClose={() => setSelectedId(null)}
                  onEdit={() => {
                    setEditing(selected);
                    setEditOpen(true);
                  }}
                  onDelete={() => setConfirmDelete(selected.id)}
                  t={t}
                />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      ) : tab === 'matrix' ? (
        <div className="flex flex-1 min-h-0">
          <RelationshipMatrix
            characters={characters}
            relationships={relationships}
            onCharacterClick={(id) => setSelectedId(id)}
          />
          <AnimatePresence>
            {selected && (
              <motion.aside
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={MOTION_BASE}
                className="w-80 flex-shrink-0 border-l border-border bg-bg-surface overflow-y-auto"
              >
                <CharacterDetailPanel
                  character={selected}
                  onClose={() => setSelectedId(null)}
                  onEdit={() => {
                    setEditing(selected);
                    setEditOpen(true);
                  }}
                  onDelete={() => setConfirmDelete(selected.id)}
                  t={t}
                />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      ) : (
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('characters.search')}
                className="pl-9"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-xs text-text-secondary flex-shrink-0">
                  {t('characters.filterTag')}:
                </span>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap',
                      filterTag === tag
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-text-secondary hover:bg-bg-elevated',
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-40 rounded-[8px]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={
                  <AppIcon size="lg" tone="accent">
                    <Users />
                  </AppIcon>
                }
                title={t('characters.empty.title')}
                description={t('characters.empty.description')}
                action={
                  <Button onClick={handleAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('characters.empty.cta')}
                  </Button>
                }
              />
            ) : (
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                  {filtered.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={MOTION_BASE}
                    >
                      <Card
                        hover
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          'cursor-pointer overflow-hidden',
                          selectedId === c.id && 'ring-2 ring-accent/40',
                        )}
                      >
                        <div
                          className="h-12 w-full"
                          style={{
                            background: `linear-gradient(135deg, ${c.color} 0%, ${c.color}40 100%)`,
                          }}
                        />
                        <CardContent className="pt-3">
                          <div className="flex items-start gap-3">
                            <div
                              className="h-12 w-12 rounded-full flex-shrink-0 grid place-items-center text-white font-bold shadow-sm"
                              style={{ backgroundColor: c.color }}
                            >
                              {c.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-text-primary truncate">
                                {c.name}
                              </h3>
                              <p className="text-xs text-text-secondary mt-0.5 line-clamp-2 min-h-[2em]">
                                {truncate(c.description || t('characters.noEvents'), 50)}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {c.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-[10px]">
                                    {tag}
                                  </Badge>
                                ))}
                                <span className="text-[10px] text-text-secondary">
                                  {t('characters.appearances', { count: c.eventIds.length })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>

        {/* 右侧详情面板 */}
        <AnimatePresence>
          {selected && (
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={MOTION_BASE}
              className="w-80 flex-shrink-0 border-l border-border bg-bg-surface overflow-y-auto"
            >
              <CharacterDetailPanel
                character={selected}
                onClose={() => setSelectedId(null)}
                onEdit={() => {
                  setEditing(selected);
                  setEditOpen(true);
                }}
                onDelete={() => setConfirmDelete(selected.id)}
                t={t}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      )}

      <CharacterEditDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
        character={editing}
        onSave={async (data) => {
          if (!editing) return;
          await updateMutation.mutateAsync({ id: editing.id, ...data });
          setEditOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={t('common.delete')}
        description={t('characters.title')}
        destructive
        confirmText={t('common.delete')}
        onConfirm={() => {
          if (confirmDelete) void deleteMutation.mutateAsync(confirmDelete);
          setSelectedId(null);
        }}
      />
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <Label className="text-xs text-text-secondary">{label}</Label>
      <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

interface CharacterDetailPanelProps {
  character: Character;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function CharacterDetailPanel({ character: selected, onClose, onEdit, onDelete, t }: CharacterDetailPanelProps) {
  return (
    <>
      <div className="h-12 px-4 flex items-center justify-between border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">{selected.name}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="text-text-secondary hover:text-accent p-1 rounded transition-colors"
            title={t('common.edit')}
          >
            <Plus className="h-3.5 w-3.5 rotate-45" />
          </button>
          <button
            onClick={onDelete}
            className="text-text-secondary hover:text-red-500 p-1 rounded transition-colors"
            title={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
            title={t('common.close')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div
          className="h-24 rounded-[8px]"
          style={{
            background: `linear-gradient(135deg, ${selected.color} 0%, ${selected.color}30 100%)`,
          }}
        />
        <div>
          <h2 className="text-lg font-bold text-text-primary">{selected.name}</h2>
          {selected.aliases.length > 0 && (
            <p className="text-xs text-text-secondary mt-0.5">
              {t('characters.form.aliases')}: {selected.aliases.join('、')}
            </p>
          )}
        </div>

        {selected.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.tags.map((tag) => (
              <Badge key={tag} variant="outline" color={selected.color}>
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <DetailField label={t('characters.form.description')} value={selected.description} />
        <DetailField label={t('characters.form.appearance')} value={selected.appearance} />
        <DetailField label={t('characters.form.backstory')} value={selected.backstory} />
        <DetailField label={t('characters.form.goals')} value={selected.goals} />
        <DetailField label={t('characters.form.conflicts')} value={selected.conflicts} />
        <DetailField label={t('characters.form.arc')} value={selected.arc} />

        <div>
          <Label className="text-xs text-text-secondary">
            {t('characters.appearances', { count: selected.eventIds.length })}
          </Label>
          {selected.eventIds.length === 0 ? (
            <p className="text-xs text-text-secondary/60 mt-1">{t('characters.noEvents')}</p>
          ) : (
            <p className="text-xs text-text-secondary mt-1">关联 {selected.eventIds.length} 个事件</p>
          )}
        </div>
      </div>
    </>
  );
}

function CharacterEditDialog({
  open,
  onOpenChange,
  character,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Character | null;
  onSave: (data: Partial<Character>) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<Partial<Character>>({});
  const [tagInput, setTagInput] = useState('');

  useMemo(() => {
    if (character) {
      setForm({
        name: character.name,
        aliases: character.aliases,
        description: character.description,
        appearance: character.appearance,
        backstory: character.backstory,
        goals: character.goals,
        conflicts: character.conflicts,
        arc: character.arc,
        tags: character.tags,
        color: character.color,
      });
    }
  }, [character]);

  if (!character) return null;

  const update = (patch: Partial<Character>) => setForm((f) => ({ ...f, ...patch }));

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!(form.tags ?? []).includes(v)) {
      update({ tags: [...(form.tags ?? []), v] });
    }
    setTagInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('common.edit')} className="max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('characters.form.name')}</Label>
              <Input
                value={form.name ?? ''}
                onChange={(e) => update({ name: e.target.value })}
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <Label>{t('characters.form.aliases')}</Label>
              <Input
                value={(form.aliases ?? []).join(', ')}
                onChange={(e) =>
                  update({
                    aliases: e.target.value
                      .split(/[,，]/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={t('characters.form.aliasesPlaceholder')}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>{t('characters.form.color')}</Label>
            <div className="flex gap-2 mt-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => update({ color: c })}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform',
                    form.color === c
                      ? 'ring-2 ring-offset-2 ring-accent scale-110'
                      : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>{t('characters.form.description')}</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => update({ description: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('characters.form.appearance')}</Label>
              <Textarea
                value={form.appearance ?? ''}
                onChange={(e) => update({ appearance: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>{t('characters.form.backstory')}</Label>
              <Textarea
                value={form.backstory ?? ''}
                onChange={(e) => update({ backstory: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>{t('characters.form.goals')}</Label>
              <Textarea
                value={form.goals ?? ''}
                onChange={(e) => update({ goals: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>{t('characters.form.conflicts')}</Label>
              <Textarea
                value={form.conflicts ?? ''}
                onChange={(e) => update({ conflicts: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>{t('characters.form.arc')}</Label>
            <Textarea
              value={form.arc ?? ''}
              onChange={(e) => update({ arc: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>{t('characters.form.tags')}</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={t('characters.form.tagsPlaceholder')}
                className="flex-1"
              />
              <Button variant="outline" onClick={addTag}>
                {t('common.add' as never) || '+'}
              </Button>
            </div>
            {(form.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.tags ?? []).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => update({ tags: (form.tags ?? []).filter((x) => x !== tag) })}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => onSave(form)} disabled={!form.name?.trim()}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
