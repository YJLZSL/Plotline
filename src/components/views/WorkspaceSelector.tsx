import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Upload,
  Settings as SettingsIcon,
  Clock4,
  Pencil,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  X,
  Check,
} from 'lucide-react';

import { AppIcon, BrandMark, Button, Card, CardContent, EmptyState, Input } from '@/components/ui';
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useExportWorkspace,
  useExportWorkspaceMarkdown,
  useImportWorkspace,
  useUpdateWorkspace,
  useWorkspacesQuery,
} from '@/features/workspace/hooks';
import { ConfirmDialog, Dialog, DialogContent, DialogTrigger } from '@/components/ui/Dialog';
import { useI18n } from '@/hooks/useI18n';
import { useAmbientAnimation } from '@/hooks/useAmbientAnimation';
import { relativeTime, truncate, downloadJSON, downloadText, cn } from '@/lib/utils';
import { useHistoryStore, makeUpdateWorkspaceAction } from '@/stores/historyStore';
import type { Workspace, WorkspaceTemplate, WorkspaceBundle } from '@/types';

const TEMPLATES: Array<{ value: WorkspaceTemplate; labelKey: string; descKey: string }> = [
  { value: 'blank', labelKey: 'workspace.form.templateBlank', descKey: 'workspace.form.templateBlankDesc' },
  { value: 'hero-journey', labelKey: 'workspace.form.templateHeroJourney', descKey: 'workspace.form.templateHeroJourneyDesc' },
  { value: 'three-act', labelKey: 'workspace.form.templateThreeAct', descKey: 'workspace.form.templateThreeActDesc' },
  { value: 'chronicle', labelKey: 'workspace.form.templateChronicle', descKey: 'workspace.form.templateChronicleDesc' },
  { value: 'biography', labelKey: 'workspace.form.templateBiography', descKey: 'workspace.form.templateBiographyDesc' },
];

const COVER_PALETTE = [
  '#C68A3E',
  '#A86A2C',
  '#B85537',
  '#7B5E3C',
  '#D4A574',
  '#9C6B3E',
  '#F4B6C2',
  '#B6D4F4',
  '#B6F4C8',
  '#F4E4B6',
  '#D8B6F4',
  '#F4CBB6',
];

const CARD_WIDTH = 280;
const CARD_GAP = 24;

export function WorkspaceSelector() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: workspaces, isLoading } = useWorkspacesQuery();
  const createMutation = useCreateWorkspace();
  const updateMutation = useUpdateWorkspace();
  const deleteMutation = useDeleteWorkspace();
  const pushHistory = useHistoryStore((s) => s.push);
  const exportMutation = useExportWorkspace();
  const exportMdMutation = useExportWorkspaceMarkdown();
  const importMutation = useImportWorkspace();
  const ambient = useAmbientAnimation();

  const cardVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: ambient.transition },
    exit: { opacity: 0, y: 16, transition: ambient.transition },
  };
  const listVariants = {
    initial: {},
    animate: { transition: { staggerChildren: ambient.animate ? 0.05 : 0 } },
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Workspace | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', coverColor: '', coverImage: '' });
  const [form, setForm] = useState({
    name: '',
    description: '',
    template: 'blank' as WorkspaceTemplate,
  });

  const filtered = (workspaces ?? []).filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase()),
  );

  const updateScrollability = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollBy = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = direction === 'left' ? -(CARD_WIDTH + CARD_GAP) : CARD_WIDTH + CARD_GAP;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
    updateScrollability();
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const ws = await createMutation.mutateAsync({
      name: form.name.trim(),
      description: form.description.trim(),
      template: form.template,
    });
    setCreateOpen(false);
    setForm({ name: '', description: '', template: 'blank' });
    navigate(`/workspaces/${ws.id}/timeline`);
  };

  const handleEditSave = async () => {
    if (!editTarget || !editForm.name.trim()) return;
    const previous = editTarget;
    const next: Workspace = {
      ...previous,
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      coverColor: editForm.coverColor,
      coverImage: editForm.coverImage || null,
    };
    await updateMutation.mutateAsync({
      id: next.id,
      name: next.name,
      description: next.description,
      coverColor: next.coverColor,
      coverImage: next.coverImage,
    });
    pushHistory(makeUpdateWorkspaceAction(next.id, previous, next));
    setEditTarget(null);
  };

  const handleExport = async (id: string) => {
    const bundle = await exportMutation.mutateAsync(id);
    downloadJSON(`plotline-${id}.json`, bundle);
  };

  const handleExportMarkdown = async (id: string, name: string) => {
    const md = await exportMdMutation.mutateAsync(id);
    downloadText(`${name}.md`, md);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    try {
      const bundle = JSON.parse(text) as WorkspaceBundle;
      await importMutation.mutateAsync(bundle);
    } catch {
      // toast 错误由 onError 处理
    }
  };

  const handleCoverImageSelect = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setEditForm((f) => ({ ...f, coverImage: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-bg-base">
      <header
        className="h-14 flex items-center justify-between px-6 border-b border-border bg-bg-surface shrink-0"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-[8px] bg-accent/15 grid place-items-center shadow-sm">
            <BrandMark size={22} title={t('app.name')} />
          </span>
          <div>
            <h1 className="text-base font-semibold text-text-primary leading-tight">
              {t('app.name')}
            </h1>
            <p className="text-[11px] text-text-secondary leading-tight">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.settings')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent title={t('settings.title')} className="max-w-2xl">
              <SettingsQuickPanel />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 shrink-0 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-text-primary">{t('workspace.title')}</h2>
            <p className="text-sm text-text-secondary mt-0.5">{t('workspace.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('workspace.search')}
                className="pl-9 w-56"
              />
            </div>
            <label className="inline-flex">
              <Button variant="outline" size="md" className="gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">{t('workspace.import')}</span>
              </Button>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2"
              data-testid="create-workspace-btn"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('workspace.create')}</span>
            </Button>
          </div>
        </div>

        <div className="relative flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center gap-6 px-6 h-full overflow-hidden">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="skeleton shrink-0 rounded-[8px]"
                  style={{ width: CARD_WIDTH, height: 384 }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                icon={
                  <AppIcon size="lg" tone="accent">
                    <BrandMark size={28} />
                  </AppIcon>
                }
                title={t('workspace.empty.title')}
                description={t('workspace.empty.description')}
                action={
                  <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('workspace.empty.cta')}
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <motion.div
                ref={scrollRef}
                onScroll={updateScrollability}
                onWheel={handleWheel}
                variants={listVariants}
                initial="initial"
                animate="animate"
                className="flex items-center h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth px-6 py-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
              >
                <AnimatePresence>
                  {filtered.map((w) => (
                    <motion.div
                      key={w.id}
                      variants={cardVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="snap-center shrink-0 first:pl-0 last:pr-0 px-3"
                    >
                      <WorkspaceCard
                        workspace={w}
                        onOpen={() => navigate(`/workspaces/${w.id}/timeline`)}
                        onEdit={() => {
                          setEditTarget(w);
                          setEditForm({
                            name: w.name,
                            description: w.description,
                            coverColor: w.coverColor,
                            coverImage: w.coverImage ?? '',
                          });
                        }}
                        onExport={() => void handleExport(w.id)}
                        onExportMarkdown={() => void handleExportMarkdown(w.id, w.name)}
                        onDelete={() => setDeleteTarget(w.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                <motion.div
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  className="snap-center shrink-0 px-3"
                >
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="flex flex-col items-center justify-center gap-3 shrink-0 rounded-[8px] border-2 border-dashed border-border bg-bg-surface/50 text-text-secondary hover:border-accent hover:text-accent hover:bg-bg-elevated transition-colors"
                    style={{ width: CARD_WIDTH, height: 384 }}
                  >
                    <Plus className="h-10 w-10" />
                    <span className="text-sm font-medium">{t('workspace.create')}</span>
                  </button>
                </motion.div>
              </motion.div>

              <button
                type="button"
                onClick={() => scrollBy('left')}
                disabled={!canScrollLeft}
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-bg-surface border border-border shadow-[var(--shadow-card)] flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-accent transition-all',
                  !canScrollLeft && 'opacity-0 pointer-events-none',
                )}
                aria-label="向左滚动"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy('right')}
                disabled={!canScrollRight}
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-bg-surface border border-border shadow-[var(--shadow-card)] flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-accent transition-all',
                  !canScrollRight && 'opacity-0 pointer-events-none',
                )}
                aria-label="向右滚动"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title={t('workspace.create')} className="max-w-xl">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.form.name')}
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('workspace.form.namePlaceholder')}
                className="mt-1.5"
                autoFocus
                data-testid="workspace-name-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.form.description')}{' '}
                <span className="text-text-secondary text-xs">({t('common.optional')})</span>
              </label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t('workspace.form.descriptionPlaceholder')}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.form.template')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.value}
                    onClick={() => setForm((f) => ({ ...f, template: tpl.value }))}
                    className={`text-left p-3 rounded-[6px] border transition-all ${
                      form.template === tpl.value
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:bg-bg-elevated'
                    }`}
                  >
                    <div className="text-sm font-medium text-text-primary">
                      {t(tpl.labelKey)}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {t(tpl.descKey)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleCreate}
                loading={createMutation.isPending}
                disabled={!form.name.trim()}
                data-testid="workspace-submit"
              >
                {t('common.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t('workspace.delete')}
        description={t('workspace.deleteConfirm', {
          name: workspaces?.find((w) => w.id === deleteTarget)?.name ?? '',
        })}
        confirmText={t('common.delete')}
        destructive
        onConfirm={() => {
          if (deleteTarget) void deleteMutation.mutateAsync(deleteTarget);
        }}
      />

      <Dialog open={editTarget !== null} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent title={t('workspace.editTitle')} className="max-w-xl">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.form.name')}
              </label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('workspace.form.namePlaceholder')}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.form.description')}{' '}
                <span className="text-text-secondary text-xs">({t('common.optional')})</span>
              </label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t('workspace.form.descriptionPlaceholder')}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.coverColor')}
              </label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COVER_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditForm((f) => ({ ...f, coverColor: c }))}
                    className={cn(
                      'h-8 w-8 rounded-full transition-transform flex items-center justify-center',
                      editForm.coverColor === c
                        ? 'ring-2 ring-offset-2 ring-text-primary/40 scale-110'
                        : 'hover:scale-110',
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  >
                    {editForm.coverColor === c && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                封面图片 {/* TODO i18n */}
              </label>
              <div className="mt-2 flex items-center gap-3">
                <label className="inline-flex cursor-pointer">
                  <Button variant="outline" size="sm" className="gap-2 cursor-pointer" asChild>
                    <span>
                      <ImageIcon className="h-4 w-4" />
                      选择图片 {/* TODO i18n */}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCoverImageSelect(f);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
                {editForm.coverImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-text-secondary"
                    onClick={() => setEditForm((f) => ({ ...f, coverImage: '' }))}
                  >
                    <X className="h-3.5 w-3.5" />
                    清除 {/* TODO i18n */}
                  </Button>
                )}
              </div>
              {editForm.coverImage && (
                <div className="mt-2 h-24 w-full rounded-[6px] bg-bg-elevated border border-border overflow-hidden">
                  <img
                    src={editForm.coverImage}
                    alt="封面预览"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleEditSave}
                loading={updateMutation.isPending}
                disabled={!editForm.name.trim()}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface WorkspaceCardProps {
  workspace: Workspace;
  onOpen: () => void;
  onEdit: () => void;
  onExport: () => void;
  onExportMarkdown: () => void;
  onDelete: () => void;
}

function WorkspaceCard({
  workspace,
  onOpen,
  onEdit,
  onExport,
  onExportMarkdown,
  onDelete,
}: WorkspaceCardProps) {
  const { t } = useI18n();
  const ambient = useAmbientAnimation();

  const coverStyle: React.CSSProperties = workspace.coverImage
    ? { backgroundImage: `url(${workspace.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, ${workspace.coverColor} 0%, ${workspace.coverColor}80 100%)` };

  return (
    <Card
      hover
      className={cn(
        'group relative overflow-hidden cursor-pointer',
        ambient.animate && 'hover:-translate-y-1',
      )}
      style={{ width: CARD_WIDTH, height: 384 }}
      onClick={onOpen}
    >
      {ambient.animate && (
        <div
          data-testid="workspace-card-shimmer"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent/10 to-transparent opacity-0 transition-[transform,opacity] duration-700 ease-in-out group-hover:translate-x-full group-hover:opacity-100"
        />
      )}
      <div className="h-[45%] w-full relative" style={coverStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/20" />
      </div>
      <CardContent className="pt-4 h-[55%] flex flex-col">
        <h3 className="text-base font-semibold text-text-primary truncate">
          {workspace.name}
        </h3>
        <p className="text-xs text-text-secondary mt-1.5 line-clamp-3 flex-1">
          {truncate(workspace.description || t('workspace.subtitle'), 120)}
        </p>
        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-[4px] bg-bg-elevated border border-border text-text-primary font-medium">
                {workspace.eventCount}
              </span>
              {t('workspace.stats.events')}
            </span>
            <span className="flex items-center gap-1" title={t('workspace.updatedAt', { date: workspace.updatedAt })}>
              <Clock4 className="h-3 w-3" />
              {relativeTime(workspace.updatedAt)}
            </span>
          </div>
        </div>
      </CardContent>

      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <ActionButton onClick={(e) => { e.stopPropagation(); onEdit(); }} title={t('workspace.edit')}>
          <Pencil className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton onClick={(e) => { e.stopPropagation(); onExportMarkdown(); }} title={t('workspace.exportMarkdown')}>
          <FileText className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton onClick={(e) => { e.stopPropagation(); onExport(); }} title={t('workspace.export')}>
          <Upload className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton onClick={(e) => { e.stopPropagation(); onDelete(); }} title={t('workspace.delete')} danger>
          <Trash2 className="h-3.5 w-3.5" />
        </ActionButton>
      </div>
    </Card>
  );
}

function ActionButton({
  children,
  onClick,
  title,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'h-8 w-8 rounded-full bg-bg-surface/90 border border-border shadow-sm flex items-center justify-center transition-colors',
        danger
          ? 'text-text-secondary hover:text-red-500 hover:border-red-200'
          : 'text-text-secondary hover:text-accent hover:border-accent/30',
      )}
    >
      {children}
    </button>
  );
}

/** 设置快速面板：用于工作区选择器内的临时设置入口。 */
function SettingsQuickPanel() {
  const { t } = useI18n();
  return (
    <div className="text-sm text-text-secondary">
      <p>{t('settings.title')} - 完整设置请进入工作区后访问。</p>
    </div>
  );
}
