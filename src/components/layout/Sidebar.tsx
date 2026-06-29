import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Clock4,
  Users,
  ListTree,
  BarChart3,
  StickyNote,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  Film,
  BookOpen,
  Scroll,
  Globe,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';
import { useAmbientAnimation } from '@/hooks/useAmbientAnimation';
import { useUIStore } from '@/stores/ui';
import { MOTION_FAST } from '@/lib/motion';
import { getScenePreset, getElementDelay } from '@/lib/motionOrchestrator';
import { AppIcon, BrandMark } from '@/components/ui';

interface NavItem {
  to: string;
  labelKey: string;
  tooltipKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

// SubTask 7.2: 三组分组顺序 — 工作区视图 → 创作辅助 → 系统
const workspaceItems: NavItem[] = [
  { to: 'timeline', labelKey: 'nav.timeline', tooltipKey: 'nav.tooltip.timeline', icon: Clock4 },
  { to: 'script', labelKey: 'nav.script', tooltipKey: 'nav.tooltip.script', icon: Scroll },
  { to: 'characters', labelKey: 'nav.characters', tooltipKey: 'nav.tooltip.characters', icon: Users },
  { to: 'outline', labelKey: 'nav.outline', tooltipKey: 'nav.tooltip.outline', icon: ListTree },
  { to: 'map', labelKey: 'nav.map', tooltipKey: 'nav.tooltip.map', icon: MapIcon },
  { to: 'vn', labelKey: 'nav.vn', tooltipKey: 'nav.tooltip.vn', icon: Film },
  { to: 'worldbuilding', labelKey: 'nav.worldbuilding', tooltipKey: 'nav.tooltip.worldbuilding', icon: Globe },
  { to: 'novel', labelKey: 'nav.novel', tooltipKey: 'nav.tooltip.novel', icon: BookOpen },
  { to: 'notebook', labelKey: 'nav.notebook', tooltipKey: 'nav.tooltip.notebook', icon: StickyNote },
];

const assistantItems: NavItem[] = [
  { to: 'ai-assistant', labelKey: 'nav.aiAssistant', tooltipKey: 'nav.tooltip.aiAssistant', icon: Sparkles },
];

const systemItems: NavItem[] = [
  { to: 'statistics', labelKey: 'nav.statistics', tooltipKey: 'nav.tooltip.statistics', icon: BarChart3 },
  { to: 'settings', labelKey: 'nav.settings', tooltipKey: 'nav.tooltip.settings', icon: SettingsIcon },
];

// SubTask 7.3: 首次进入工作区时高亮"时间轴"与"AI 创作"，复用 useUIStore.firstWorkspaceVisit 标记
const HIGHLIGHT_KEYS = new Set<string>(['timeline', 'ai-assistant']);
const HIGHLIGHT_DURATION_MS = 3000;

export function Sidebar({ workspaceId }: { workspaceId: string }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const firstWorkspaceVisit = useUIStore((s) => s.firstWorkspaceVisit);
  const enhancedAnimations = useUIStore((s) => s.enhancedAnimations);
  // 侧栏导航项入场场景：stagger 8ms，单项 120ms。
  // 退化模式下同步 200ms 淡入，无 stagger。
  const navPreset = getScenePreset('sidebarNavEnter', { enhanced: enhancedAnimations });
  const { t } = useI18n();
  const location = useLocation();
  const ambient = useAmbientAnimation();
  // 仅在首次进入工作区时（firstWorkspaceVisit === true）触发高亮，
  // 3 秒后自动消失；useUIStore 已通过 zustand persist 写入 localStorage，
  // 因此跨会话/刷新不会重复触发。
  const [highlight, setHighlight] = useState<boolean>(firstWorkspaceVisit);

  useEffect(() => {
    if (!highlight) return;
    const timeout = window.setTimeout(() => setHighlight(false), HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [highlight]);

  const renderNavItem = (item: NavItem, index: number, baseIndex: number) => {
    const Icon = item.icon;
    const fullPath = `/workspaces/${workspaceId}/${item.to}`;
    const active = location.pathname.startsWith(fullPath);
    const isHighlighted = highlight && HIGHLIGHT_KEYS.has(item.to);
    const itemIndex = baseIndex + index;
    return (
      <motion.div
        key={item.to}
        initial={navPreset.enhanced ? { opacity: 0, x: -8 } : { opacity: 0 }}
        animate={navPreset.enhanced ? { opacity: 1, x: 0 } : { opacity: 1 }}
        transition={{
          duration: navPreset.enter.duration,
          ease: navPreset.enter.ease,
          delay: getElementDelay(itemIndex, navPreset.enter.step),
        }}
      >
        <NavLink
          to={fullPath}
          className={cn(
            'group flex items-center gap-3 rounded-[6px] px-2 h-9 transition-colors',
            'text-sm font-medium relative',
            active
              ? 'text-accent bg-accent/10'
              : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
            isHighlighted && 'ring-2 ring-accent/40',
          )}
          title={t(item.tooltipKey)}
        >
          {active && (
            <motion.span
              animate={ambient.animate ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
              transition={
                ambient.animate
                  ? { opacity: { repeat: Infinity, duration: 2, ease: 'easeInOut' } }
                  : MOTION_FAST
              }
              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-accent shadow-[0_0_10px_var(--accent)] will-change-opacity"
            />
          )}
          <AppIcon size="sm" tone={active ? 'accent' : 'muted'}>
            <Icon />
          </AppIcon>
          {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
        </NavLink>
      </motion.div>
    );
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 240 }}
      transition={MOTION_FAST}
      className={cn(
        'flex flex-col bg-bg-surface border-r border-border',
        'flex-shrink-0 overflow-hidden will-change-width',
      )}
      style={{ backfaceVisibility: 'hidden' }}
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2 h-12 px-3 border-b border-border">
        <span className="flex-shrink-0 grid place-items-center h-8 w-8 rounded-[8px] bg-accent/15">
          <BrandMark size={20} title="Plotline" />
        </span>
        {!collapsed && (
          <span className="text-sm font-semibold text-text-primary truncate">
            Plotline
          </span>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 flex flex-col gap-1">
        {workspaceItems.map((item, idx) => renderNavItem(item, idx, 0))}
        <div className="my-1 h-px bg-border" role="separator" aria-hidden="true" />
        {assistantItems.map((item, idx) => renderNavItem(item, idx, workspaceItems.length))}
        <div className="my-1 h-px bg-border" role="separator" aria-hidden="true" />
        {systemItems.map((item, idx) => renderNavItem(item, idx, workspaceItems.length + assistantItems.length))}
      </nav>

      <button
        onClick={toggle}
        className={cn(
          'h-9 border-t border-border/60 flex items-center justify-center',
          'text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors',
        )}
        aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </motion.aside>
  );
}
