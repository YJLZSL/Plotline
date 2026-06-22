import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, X } from 'lucide-react';

import { Button, Input, Label, Badge, ConfirmDialog, Dialog, DialogContent } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import type {
  Character,
  CharacterRelationship,
  RelationshipType,
} from '@/types';
import {
  useCreateRelationship,
  useDeleteRelationship,
  useRelationshipsQuery,
} from '@/features/characters/relationshipHooks';

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  family: '#E07B7B',
  love: '#E0977B',
  enemy: '#A04040',
  mentor: '#7BA0E0',
  friend: '#7BE0A0',
  rival: '#E0C97B',
};

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  family: '亲情',
  love: '爱情',
  enemy: '敌对',
  mentor: '师徒',
  friend: '友谊',
  rival: '竞争',
};

interface GraphNode {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string;
  target: string;
  type: RelationshipType;
  strength: number;
}

interface RelationshipGraphProps {
  workspaceId: string;
  characters: Character[];
  onCharacterClick?: (id: string) => void;
}

export function RelationshipGraph({ workspaceId, characters, onCharacterClick }: RelationshipGraphProps) {
  const { t } = useI18n();
  const { data: relationships = [] } = useRelationshipsQuery(workspaceId);
  const createRel = useCreateRelationship(workspaceId);
  const deleteRel = useDeleteRelationship(workspaceId);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [selectedRel, setSelectedRel] = useState<CharacterRelationship | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [newRel, setNewRel] = useState({
    sourceId: '',
    targetId: '',
    type: 'friend' as RelationshipType,
    description: '',
    strength: 3,
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // 监听容器尺寸
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

  // 构建节点与边
  const edges: GraphEdge[] = useMemo(
    () =>
      relationships.map((r) => ({
        source: r.sourceId,
        target: r.targetId,
        type: r.type,
        strength: r.strength,
      })),
    [relationships],
  );

  const [nodes, setNodes] = useState<GraphNode[]>([]);

  // 初始化节点位置（圆环布局）
  useEffect(() => {
    setNodes((prev) => {
      const existing = new Map(prev.map((n) => [n.id, n]));
      const next: GraphNode[] = characters.map((c, i) => {
        const ex = existing.get(c.id);
        if (ex) {
          return { ...ex, name: c.name, color: c.color };
        }
        const angle = (i / Math.max(characters.length, 1)) * Math.PI * 2;
        const r = Math.min(size.width, size.height) * 0.3;
        return {
          id: c.id,
          name: c.name,
          color: c.color,
          x: size.width / 2 + r * Math.cos(angle),
          y: size.height / 2 + r * Math.sin(angle),
          vx: 0,
          vy: 0,
        };
      });
      return next;
    });
  }, [characters, size.width, size.height]);

  // 力导向模拟（简化版）
  useEffect(() => {
    if (nodes.length === 0) return;
    let raf = 0;
    const tick = () => {
      setNodes((cur) => {
        if (cur.length === 0) return cur;
        const next = cur.map((n) => ({ ...n }));
        const cx = size.width / 2;
        const cy = size.height / 2;
        // 排斥力
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j]!.x - next[i]!.x;
            const dy = next[j]!.y - next[i]!.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 8000 / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (next[i]!.fx == null) {
              next[i]!.vx -= fx;
              next[i]!.vy -= fy;
            }
            if (next[j]!.fx == null) {
              next[j]!.vx += fx;
              next[j]!.vy += fy;
            }
          }
        }
        // 边吸引力
        for (const e of edges) {
          const s = next.find((n) => n.id === e.source);
          const t = next.find((n) => n.id === e.target);
          if (!s || !t) continue;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const target = 160;
          const force = (dist - target) * 0.02;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (s.fx == null) {
            s.vx += fx;
            s.vy += fy;
          }
          if (t.fx == null) {
            t.vx -= fx;
            t.vy -= fy;
          }
        }
        // 中心引力 + 阻尼 + 边界
        for (const n of next) {
          if (n.fx != null) {
            n.x = n.fx;
            n.y = n.fy ?? 0;
            continue;
          }
          n.vx += (cx - n.x) * 0.001;
          n.vy += (cy - n.y) * 0.001;
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x += n.vx;
          n.y += n.vy;
          n.x = Math.max(40, Math.min(size.width - 40, n.x));
          n.y = Math.max(40, Math.min(size.height - 40, n.y));
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [edges, size.width, size.height, nodes.length]);

  const handleMouseDown = (id: string) => {
    setDragging(id);
    setNodes((cur) => cur.map((n) => (n.id === id ? { ...n, fx: n.x, fy: n.y } : n)));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setNodes((cur) => cur.map((n) => (n.id === dragging ? { ...n, fx: x, fy: y } : n)));
  };

  const handleMouseUp = () => {
    if (dragging) {
      setNodes((cur) => cur.map((n) => (n.id === dragging ? { ...n, fx: null, fy: null } : n)));
      setDragging(null);
    }
  };

  const handleCreate = async () => {
    if (!newRel.sourceId || !newRel.targetId || newRel.sourceId === newRel.targetId) return;
    await createRel.mutateAsync({
      workspaceId,
      sourceId: newRel.sourceId,
      targetId: newRel.targetId,
      relationshipType: newRel.type,
      description: newRel.description,
      strength: newRel.strength,
    });
    setCreating(false);
    setNewRel({ sourceId: '', targetId: '', type: 'friend', description: '', strength: 3 });
  };

  if (characters.length === 0) {
    return (
      <div className="flex-1 grid place-items-center text-text-secondary text-sm">
        <p>请先创建角色，才能构建关系网络。</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden bg-bg-base">
      {/* 顶部操作 */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          添加关系
        </Button>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-3 left-3 z-10 bg-bg-surface/80 backdrop-blur-sm border border-border rounded-[8px] p-2 flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-text-secondary uppercase mb-0.5">关系类型</span>
        {(Object.keys(RELATIONSHIP_COLORS) as RelationshipType[]).map((k) => (
          <div key={k} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
            <span className="h-2 w-4 rounded-full" style={{ backgroundColor: RELATIONSHIP_COLORS[k] }} />
            {RELATIONSHIP_LABELS[k]}
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="absolute inset-0"
      >
        {/* 边 */}
        {edges.map((e, i) => {
          const s = nodes.find((n) => n.id === e.source);
          const t = nodes.find((n) => n.id === e.target);
          if (!s || !t) return null;
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2;
          const color = RELATIONSHIP_COLORS[e.type];
          return (
            <g key={i} onClick={() => setSelectedRel(relationships.find((r) => r.sourceId === e.source && r.targetId === e.target) ?? null)} className="cursor-pointer">
              <line
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={color}
                strokeWidth={1 + e.strength * 0.5}
                opacity={0.6}
              />
              <circle cx={mx} cy={my} r={3} fill={color} opacity={0.8} />
            </g>
          );
        })}

        {/* 节点 */}
        {nodes.map((n) => (
          <g
            key={n.id}
            transform={`translate(${n.x}, ${n.y})`}
            onMouseDown={() => handleMouseDown(n.id)}
            onClick={() => onCharacterClick?.(n.id)}
            className="cursor-grab active:cursor-grabbing"
          >
            <circle r={24} fill={n.color} opacity={0.9} stroke="var(--bg-surface)" strokeWidth={2} />
            <text
              y={4}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="white"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {n.name.slice(0, 1).toUpperCase()}
            </text>
            <text
              y={44}
              textAnchor="middle"
              fontSize={11}
              fill="var(--text-primary)"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {n.name.length > 8 ? n.name.slice(0, 8) + '…' : n.name}
            </text>
          </g>
        ))}
      </svg>

      {/* 关系详情侧滑 */}
      {selectedRel && (
        <motion.div
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 280, opacity: 0 }}
          className="absolute top-3 right-44 w-64 bg-bg-surface border border-border rounded-[8px] shadow-[var(--shadow-elevated)] p-4 z-20"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-text-primary">关系详情</h4>
            <button onClick={() => setSelectedRel(null)} className="text-text-secondary hover:text-text-primary">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Badge color={RELATIONSHIP_COLORS[selectedRel.type]}>
              {RELATIONSHIP_LABELS[selectedRel.type]}
            </Badge>
            <span className="text-xs text-text-secondary">强度 {selectedRel.strength}/5</span>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            {characters.find((c) => c.id === selectedRel.sourceId)?.name} →{' '}
            {characters.find((c) => c.id === selectedRel.targetId)?.name}
          </p>
          {selectedRel.description && (
            <p className="text-xs text-text-primary mb-3 whitespace-pre-wrap">{selectedRel.description}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(selectedRel.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* 创建关系对话框 */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent title="添加关系" className="max-w-md">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>源角色</Label>
                <select
                  value={newRel.sourceId}
                  onChange={(e) => setNewRel((r) => ({ ...r, sourceId: e.target.value }))}
                  className="mt-1.5 w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm"
                >
                  <option value="">选择…</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>目标角色</Label>
                <select
                  value={newRel.targetId}
                  onChange={(e) => setNewRel((r) => ({ ...r, targetId: e.target.value }))}
                  className="mt-1.5 w-full h-10 rounded-[6px] border border-border bg-bg-surface px-3 text-sm"
                >
                  <option value="">选择…</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>关系类型</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {(Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setNewRel((r) => ({ ...r, type: k }))}
                    className={cn(
                      'h-9 rounded-[6px] border text-xs transition-colors',
                      newRel.type === k
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-text-secondary hover:bg-bg-elevated',
                    )}
                  >
                    {RELATIONSHIP_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>强度（1-5）</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={newRel.strength}
                  onChange={(e) => setNewRel((r) => ({ ...r, strength: Number(e.target.value) }))}
                  className="flex-1 accent-accent"
                />
                <span className="text-sm w-6 text-right">{newRel.strength}</span>
              </div>
            </div>
            <div>
              <Label>描述（可选）</Label>
              <Input
                value={newRel.description}
                onChange={(e) => setNewRel((r) => ({ ...r, description: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setCreating(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newRel.sourceId || !newRel.targetId || newRel.sourceId === newRel.targetId}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={t('common.delete')}
        description="删除该关系？"
        destructive
        confirmText={t('common.delete')}
        onConfirm={() => {
          if (confirmDelete) void deleteRel.mutateAsync(confirmDelete);
          setSelectedRel(null);
        }}
      />
    </div>
  );
}
