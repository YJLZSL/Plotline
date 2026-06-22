import { Outlet, useParams } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { HistoryControls } from './HistoryControls';

const APP_VERSION = '1.2.0';

export function WorkspaceLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  if (!workspaceId) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base">
      <Sidebar workspaceId={workspaceId} />
      <div className="flex flex-1 flex-col min-w-0">
        <Outlet />
        <StatusBar left={<HistoryControls />} right={<span>v{APP_VERSION}</span>} />
      </div>
    </div>
  );
}
