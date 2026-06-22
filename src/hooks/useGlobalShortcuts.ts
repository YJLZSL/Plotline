import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useUIStore } from '@/stores/ui';

interface ShortcutMap {
  combo: string;
  action: () => void;
  description: string;
}

/** 全局键盘快捷键：Ctrl/Cmd + B 切换侧栏、Esc 关闭对话框等。 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inEditable =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Ctrl/Cmd + B：切换侧栏
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // 数字键 1-5：切换视图（非编辑状态）
      if (!inEditable && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const wsMatch = location.pathname.match(/^\/workspaces\/([^/]+)/);
        if (wsMatch) {
          const wsId = wsMatch[1]!;
          const views = ['timeline', 'characters', 'outline', 'statistics', 'notebook'];
          const idx = parseInt(e.key, 10) - 1;
          if (idx >= 0 && idx < views.length) {
            e.preventDefault();
            navigate(`/workspaces/${wsId}/${views[idx]}`);
            return;
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, location.pathname, toggleSidebar]);
}

export const SHORTCUTS: ShortcutMap[] = [
  { combo: 'Ctrl/Cmd + B', action: () => {}, description: '切换侧栏' },
  { combo: '1 - 5', action: () => {}, description: '切换视图（时间轴/角色/大纲/统计/资料库）' },
  { combo: 'Delete', action: () => {}, description: '删除选中事件' },
  { combo: 'Esc', action: () => {}, description: '关闭对话框' },
];
