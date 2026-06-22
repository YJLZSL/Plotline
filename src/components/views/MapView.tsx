import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, MapPin, Trash2, X, Link2 } from 'lucide-react';

import {
  AppIcon,
  Badge,
  Button,
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
import { cn } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import type { Character, Event, Location } from '@/types';
import {
  useLocationsQuery,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useLocationLinksQuery,
  useLinkLocations,
} from '@/features/map/hooks';
import { useEventsQuery } from '@/features/timeline/hooks';
import { useCharactersQuery } from '@/features/characters/hooks';

const PALETTE = ['#C68A3E', '#F4B6C2', '#B6D4F4', '#B6F4C8', '#F4E4B6', '#D8B6F4', '#F4CBB6'];
const ICONS = ['📍', '🏰', '🌲', '⛰️', '🌊', '🏠', '🔥', '❄️', '🌙', '⭐'];

interface MapViewProps {
  workspaceId: string;
  workspaceName?: string;
}

export function MapView({ workspaceId, workspaceName }: MapViewProps) {
  const { t } = useI18n();
  const { data: locations = [], isLoading } = useLocationsQuery(workspaceId);
  const { data: links = [] } = useLocationLinksQuery(workspaceId);
  const { data: events = [] } = useEventsQuery(workspaceId);
  const { data: characters = [] } = useCharactersQuery(workspaceId);
  const createLoc = useCreateLocation(workspaceId);
  const updateLoc = useUpdateLocation(workspaceId);
  const deleteLoc = useDeleteLocation(workspaceId);
  const linkLoc = useLinkLocations(workspaceId);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Location | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  const selected = locations.find((l) => l.id === selectedId) ?? null;

  const handleAdd = async () => {
    const cx = size.width / 2 + (Math.random() - 0.5) * 120;
    const cy = size.height / 2 + (Math.random() - 0.5) * 120;
    const loc = await createLoc.mutateAsync({
      workspaceId,
      name: t('map.newLocation'),
      posX: Math.round(cx),
      posY: Math.round(cy),
      color: PALETTE[locations.length % PALETTE.length],
      icon: '📍',
    });
    setSelectedId(loc.id);
    setEditing(loc);
    setEditOpen(true);
  };

  const handleDrag = (loc: Location, dx: number, dy: number) => {
    void updateLoc.mutateAsync({
      id: loc.id,
      posX: loc.posX + dx,
      posY: loc.posY + dy,
    });
  };

  const handleClickLocation = (loc: Location) => {
    if (linkMode && linkMode !== loc.id) {
      void linkLoc.mutateAsync({
        workspaceId,
        sourceId: linkMode,
        targetId: loc.id,
      });
      setLinkMode(null);
    } else {
      setSelectedId(loc.id);
    }
  };

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  return (
    <>
      <Toolbar
        title={t('map.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <Button size="sm" onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('map.addLocation')}</span>
          </Button>
        }
      />
      <div className="flex flex-1 min-h-0">
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-bg-base">
          {isLoading ? (
            <div className="absolute inset-0 grid place-items-center">
              <div className="skeleton h-64 w-96 rounded-[12px]" />
            </div>
          ) : locations.length === 0 ? (
            <EmptyState
              icon={
                <AppIcon size="lg" tone="accent">
                  <MapPin />
                </AppIcon>
              }
              title={t('map.empty.title')}
              description={t('map.empty.description')}
              action={
                <Button onClick={handleAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('map.empty.cta')}
                </Button>
              }
            />
          ) : (
            <>
              <svg
                ref={svgRef}
                width={size.width}
                height={size.height}
                className="absolute inset-0"
              >
                <defs>
                  <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.4" />
                  </pattern>
                  <radialGradient id="map-vignette" cx="50%" cy="50%" r="70%">
                    <stop offset="60%" stopColor="transparent" />
                    <stop offset="100%" stopColor="var(--bg-base)" stopOpacity="0.6" />
                  </radialGradient>
                </defs>
                <rect width={size.width} height={size.height} fill="url(#map-grid)" />

                {links.map((lk, i) => {
                  const src = locations.find((l) => l.id === lk.sourceId);
                  const tgt = locations.find((l) => l.id === lk.targetId);
                  if (!src || !tgt) return null;
                  const isActive =
                    linkMode === src.id ||
                    linkMode === tgt.id ||
                    selectedId === src.id ||
                    selectedId === tgt.id;
                  return (
                    <g key={i}>
                      <line
                        x1={src.posX}
                        y1={src.posY}
                        x2={tgt.posX}
                        y2={tgt.posY}
                        stroke={isActive ? 'var(--accent)' : 'var(--text-secondary)'}
                        strokeWidth={isActive ? 2.5 : 1.5}
                        strokeDasharray="6 4"
                        opacity={isActive ? 0.8 : 0.4}
                      />
                      {lk.label && (
                        <text
                          x={(src.posX + tgt.posX) / 2}
                          y={(src.posY + tgt.posY) / 2 - 6}
                          textAnchor="middle"
                          fontSize={10}
                          fill="var(--text-secondary)"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {lk.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {locations.map((loc, i) => (
                  <LocationNode
                    key={loc.id}
                    location={loc}
                    index={i}
                    selected={loc.id === selectedId}
                    linkMode={linkMode === loc.id}
                    onClick={() => handleClickLocation(loc)}
                    onDrag={(dx, dy) => handleDrag(loc, dx, dy)}
                    onEdit={() => {
                      setEditing(loc);
                      setEditOpen(true);
                    }}
                  />
                ))}

                <rect width={size.width} height={size.height} fill="url(#map-vignette)" pointerEvents="none" />
              </svg>

              {linkMode && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-accent text-white px-4 py-2 rounded-[8px] shadow-[var(--shadow-elevated)] text-sm flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  <span>{t('map.linkHint')}</span>
                  <button onClick={() => setLinkMode(null)} className="underline hover:no-underline">
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 右侧详情面板 */}
        {selected && (
          <motion.aside
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={MOTION_BASE}
            className="w-80 flex-shrink-0 border-l border-border bg-bg-surface overflow-y-auto"
          >
            <LocationDetailPanel
              location={selected}
              characters={characters}
              eventName={
                selected.linkedEventId
                  ? eventById.get(selected.linkedEventId)?.title ?? null
                  : null
              }
              onClose={() => setSelectedId(null)}
              onEdit={() => {
                setEditing(selected);
                setEditOpen(true);
              }}
              onDelete={() => setConfirmDelete(selected.id)}
              onStartLink={() => setLinkMode(selected.id)}
              t={t}
            />
          </motion.aside>
        )}
      </div>

      <LocationEditDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
        location={editing}
        events={events}
        characters={characters}
        onSave={async (data) => {
          if (!editing) return;
          await updateLoc.mutateAsync({ id: editing.id, ...data });
          setEditOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={t('common.delete')}
        description={t('map.title')}
        destructive
        confirmText={t('common.delete')}
        onConfirm={() => {
          if (confirmDelete) void deleteLoc.mutateAsync(confirmDelete);
          setSelectedId(null);
        }}
      />
    </>
  );
}

function LocationNode({
  location,
  index,
  selected,
  linkMode,
  onClick,
  onDrag,
  onEdit,
}: {
  location: Location;
  index: number;
  selected: boolean;
  linkMode: boolean;
  onClick: () => void;
  onDrag: (dx: number, dy: number) => void;
  onEdit: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null);

  const handleDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY, sx: location.posX, sy: location.posY };
  };

  const handleMove = (e: React.MouseEvent) => {
    if (!dragging || !startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    onDrag(dx, dy);
  };

  const handleUp = () => {
    setDragging(false);
    startRef.current = null;
  };

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...MOTION_BASE, delay: Math.min(index * 0.02, 0.1) }}
      transform={`translate(${location.posX}, ${location.posY})`}
      className="cursor-grab active:cursor-grabbing"
      onClick={(e) => {
        e.stopPropagation();
        if (!dragging) onClick();
      }}
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      {selected && (
        <circle
          r={32}
          fill={location.color}
          fillOpacity={0.15}
          stroke={location.color}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      )}
      <circle
        r={20}
        fill={location.color}
        fillOpacity={selected ? 0.95 : 0.8}
        stroke="var(--bg-surface)"
        strokeWidth={2.5}
      />
      <text
        y={6}
        textAnchor="middle"
        fontSize={18}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {location.icon}
      </text>
      <text
        y={38}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="var(--text-primary)"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {location.name.length > 8 ? location.name.slice(0, 8) + '…' : location.name}
      </text>
      {linkMode && (
        <circle r={24} fill="none" stroke="var(--accent)" strokeWidth={2} className="animate-pulse" />
      )}
    </motion.g>
  );
}

function LocationDetailPanel({
  location,
  characters,
  eventName,
  onClose,
  onEdit,
  onDelete,
  onStartLink,
  t,
}: {
  location: Location;
  characters: Character[];
  eventName: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStartLink: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const linkedChars = characters.filter((c) => location.characterIds.includes(c.id));
  return (
    <>
      <div className="h-12 px-4 flex items-center justify-between border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary truncate">{location.icon} {location.name}</h3>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="text-text-secondary hover:text-accent p-1 rounded transition-colors" title={t('common.edit')}>
            <Plus className="h-3.5 w-3.5 rotate-45" />
          </button>
          <button onClick={onDelete} className="text-text-secondary hover:text-red-500 p-1 rounded transition-colors" title={t('common.delete')}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors" title={t('common.close')}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <div className="h-20 rounded-[8px]" style={{ background: `linear-gradient(135deg, ${location.color} 0%, ${location.color}30 100%)` }} />
        {location.description && (
          <p className="text-sm text-text-primary whitespace-pre-wrap">{location.description}</p>
        )}
        {eventName && (
          <div>
            <Label className="text-xs text-text-secondary">{t('map.linkedEvent')}</Label>
            <p className="text-sm text-text-primary mt-1">{eventName}</p>
          </div>
        )}
        {linkedChars.length > 0 && (
          <div>
            <Label className="text-xs text-text-secondary">{t('map.linkedCharacters')}</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {linkedChars.map((c) => (
                <Badge key={c.id} variant="outline" color={c.color}>{c.name}</Badge>
              ))}
            </div>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onStartLink} className="gap-2 self-start">
          <Link2 className="h-3.5 w-3.5" />
          {t('map.startLink')}
        </Button>
      </div>
    </>
  );
}

function LocationEditDialog({
  open,
  onOpenChange,
  location,
  events,
  characters,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
  events: Event[];
  characters: Character[];
  onSave: (data: { name: string; description: string; color: string; icon: string; linkedEventId: string | null; characterIds: string[] }) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PALETTE[0]!);
  const [icon, setIcon] = useState('📍');
  const [linkedEventId, setLinkedEventId] = useState<string | null>(null);
  const [characterIds, setCharacterIds] = useState<string[]>([]);

  useEffect(() => {
    if (location) {
      setName(location.name);
      setDescription(location.description);
      setColor(location.color);
      setIcon(location.icon);
      setLinkedEventId(location.linkedEventId);
      setCharacterIds(location.characterIds);
    }
  }, [location]);

  if (!location) return null;

  const toggleCharacter = (id: string) => {
    setCharacterIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('common.edit')} className="max-w-lg">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('map.form.name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" autoFocus />
            </div>
            <div>
              <Label>{t('map.form.icon')}</Label>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={cn(
                      'h-8 w-8 rounded-[6px] text-lg transition-transform',
                      icon === ic ? 'ring-2 ring-accent scale-110' : 'hover:bg-bg-elevated',
                    )}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>{t('map.form.color')}</Label>
            <div className="flex gap-2 mt-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform',
                    color === c ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>{t('map.form.description')}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" />
          </div>

          <div>
            <Label>{t('map.form.linkedEvent')}</Label>
            <select
              value={linkedEventId ?? ''}
              onChange={(e) => setLinkedEventId(e.target.value || null)}
              className="mt-1.5 w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm"
            >
              <option value="">{t('common.optional')}</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>{t('map.form.characters')}</Label>
            <div className="mt-1.5 border border-border rounded-[6px] p-3 max-h-32 overflow-y-auto bg-bg-elevated/40">
              {characters.length === 0 ? (
                <p className="text-xs text-text-secondary/60 text-center py-2">{t('map.noCharacters')}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {characters.map((c) => {
                    const sel = characterIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCharacter(c.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition-all',
                          sel ? 'border-accent bg-accent/15 text-accent' : 'border-border text-text-secondary hover:bg-bg-surface',
                        )}
                      >
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => onSave({ name, description, color, icon, linkedEventId, characterIds })} disabled={!name.trim()}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
