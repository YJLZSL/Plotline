import { useEffect } from 'react';
import { Routes, Route, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout';
import { WorkspaceSelector } from '@/components/views/WorkspaceSelector';
import { TimelineView } from '@/components/views/TimelineView';
import { CharactersView } from '@/components/views/CharactersView';
import { OutlineView } from '@/components/views/OutlineView';
import { StatisticsView } from '@/components/views/StatisticsView';
import { SettingsView } from '@/components/views/SettingsView';
import { NotebookView } from '@/components/views/NotebookView';
import { MapView } from '@/components/views/MapView';
import { VnView } from '@/components/views/VnView';
import { WorldbuildingView } from '@/components/views/WorldbuildingView';
import { NovelView } from '@/components/views/NovelView';
import { ScriptView } from '@/components/views/ScriptView';
import { AiAssistantView } from '@/features/ai-assistant/components/AiAssistantView';
import { useSettingsQuery } from '@/features/settings/hooks';
import { useThemeStore } from '@/stores/ui';
import { useMotionStore } from '@/stores/motion';
import { useI18n } from '@/hooks/useI18n';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useKonamiCode } from '@/hooks/useKonamiCode';
import { toastSuccess } from '@/stores/toast';
import { MOTION_FAST } from '@/lib/motion';

function WorkspaceRoutes() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  if (!workspaceId) return null;
  return <WorkspaceLayout />;
}

function KonamiEasterEgg() {
  useKonamiCode(() => {
    document.documentElement.classList.add('mc-easter');
    toastSuccess('MC 彩蛋已激活！Creeper? Aww man~');
    window.setTimeout(() => {
      document.documentElement.classList.remove('mc-easter');
    }, 8000);
  });
  return null;
}

function ThemeSync() {
  const { data: settings } = useSettingsQuery();
  const applyToDOM = useThemeStore((s) => s.applyToDOM);
  const { i18n } = useI18n();

  useEffect(() => {
    if (settings) {
      applyToDOM(settings);
      void i18n.changeLanguage(settings.language);
    }
  }, [settings, applyToDOM, i18n]);

  return null;
}

function MotionSync() {
  const { data: settings } = useSettingsQuery();
  const setAnimationsEnabled = useMotionStore((s) => s.setAnimationsEnabled);
  const applyFancyToDOM = useMotionStore((s) => s.applyFancyToDOM);

  useEffect(() => {
    if (settings) {
      setAnimationsEnabled(settings.animationsEnabled ?? true);
      applyFancyToDOM(useMotionStore.getState().fancyAnimationsEnabled);
    }
  }, [settings, setAnimationsEnabled, applyFancyToDOM]);

  return null;
}

export function AppRoutes() {
  useGlobalShortcuts();
  return (
    <>
      <ThemeSync />
      <MotionSync />
      <KonamiEasterEgg />
      <AnimatedRoutes />
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const topKey = location.pathname.startsWith('/workspaces') ? 'workspace' : location.pathname;
  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={topKey}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={MOTION_FAST}
        className="h-screen w-screen will-change-transform"
      >
        <Routes location={location}>
          <Route path="/" element={<WorkspaceSelector />} />
          <Route path="/workspaces/:workspaceId" element={<WorkspaceRoutes />}>
            <Route path="timeline" element={<WorkspaceViewWrapper view="timeline" />} />
            <Route path="characters" element={<WorkspaceViewWrapper view="characters" />} />
            <Route path="outline" element={<WorkspaceViewWrapper view="outline" />} />
            <Route path="statistics" element={<WorkspaceViewWrapper view="statistics" />} />
            <Route path="notebook" element={<WorkspaceViewWrapper view="notebook" />} />
            <Route path="ai-assistant" element={<WorkspaceViewWrapper view="ai-assistant" />} />
            <Route path="map" element={<WorkspaceViewWrapper view="map" />} />
            <Route path="vn" element={<WorkspaceViewWrapper view="vn" />} />
            <Route path="worldbuilding" element={<WorkspaceViewWrapper view="worldbuilding" />} />
            <Route path="novel" element={<WorkspaceViewWrapper view="novel" />} />
            <Route path="script" element={<WorkspaceViewWrapper view="script" />} />
            <Route path="settings" element={<WorkspaceViewWrapper view="settings" />} />
          </Route>
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

import { useWorkspaceViewData } from '@/hooks/useWorkspaceViewData';

function WorkspaceViewWrapper({ view }: { view: string }) {
  const { workspaceId, workspaceName } = useWorkspaceViewData();

  switch (view) {
    case 'timeline':
      return <TimelineView workspaceId={workspaceId} workspaceName={workspaceName} />;
    case 'characters':
      return <CharactersView workspaceId={workspaceId} workspaceName={workspaceName} />;
    case 'outline':
      return <OutlineView workspaceId={workspaceId} workspaceName={workspaceName} />;
    case 'statistics':
      return <StatisticsView workspaceId={workspaceId} workspaceName={workspaceName} />;
    case 'notebook':
      return <NotebookView workspaceId={workspaceId} workspaceName={workspaceName} />;
    case 'ai-assistant':
      return <AiAssistantView workspaceId={workspaceId} />;
    case 'map':
      return <MapView workspaceId={workspaceId} workspaceName={workspaceName} />;
    case 'vn':
      return <VnView workspaceId={workspaceId} workspaceName={workspaceName} />;
    case 'worldbuilding':
      return <WorldbuildingView workspaceId={workspaceId} workspaceName={workspaceName} />;
    case 'novel':
      return <NovelView workspaceId={workspaceId} workspaceName={workspaceName} />;
    case 'script':
      return <ScriptView workspaceId={workspaceId} workspaceName={workspaceName} />;
    case 'settings':
      return <SettingsView workspaceId={workspaceId} workspaceName={workspaceName} />;
    default:
      return null;
  }
}
