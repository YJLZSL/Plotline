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
  Globe,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';
import { useUIStore } from '@/stores/ui';
import { MOTION_FAST } from '@/lib/motion';
import { AppIcon, BrandMark } from '@/components/ui';

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const items: NavItem[] = [
  { to: 'timeline', labelKey: 'nav.timeline', icon: Clock4 },
  { to: 'characters', labelKey: 'nav.characters', icon: Users },
  { to: 'outline', labelKey: 'nav.outline', icon: ListTree },
  { to: 'map', labelKey: 'nav.map', icon: MapIcon },
  { to: 'vn', labelKey: 'nav.vn', icon: Film },
  { to: 'worldbuilding', labelKey: 'nav.worldbuilding', icon: Globe },
  { to: 'novel', labelKey: 'nav.novel', icon: BookOpen },
  { to: 'statistics', labelKey: 'nav.statistics', icon: BarChart3 },
  { to: 'notebook', labelKey: 'nav.notebook', icon: StickyNote },
  { to: 'settings', labelKey: 'nav.settings', icon: SettingsIcon },
];

export function Sidebar({ workspaceId }: { workspaceId: string }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const { t } = useI18n();
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 240 }}
      transition={MOTION_FAST}
      className={cn(
        'flex flex-col bg-bg-surface border-r border-border',
        'flex-shrink-0 overflow-hidden',
      )}
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
        {items.map((item) => {
          const Icon = item.icon;
          const fullPath = `/workspaces/${workspaceId}/${item.to}`;
          const active = location.pathname.startsWith(fullPath);
          return (
            <NavLink
              key={item.to}
              to={fullPath}
              className={cn(
                'group flex items-center gap-3 rounded-[6px] px-2 h-10 transition-colors',
                'text-sm font-medium relative',
                active
                  ? 'text-accent bg-accent/10'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
              )}
              title={collapsed ? t(item.labelKey) : undefined}
            >
              {active && (
                <motion.span
                  layoutId={`sidebar-active-${item.to}`}
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-accent"
                  transition={MOTION_FAST}
                />
              )}
              <AppIcon size="sm" tone={active ? 'accent' : 'muted'}>
                <Icon />
              </AppIcon>
              {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={toggle}
        className={cn(
          'h-10 border-t border-border flex items-center justify-center',
          'text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors',
        )}
        aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </motion.aside>
  );
}
