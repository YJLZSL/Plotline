import { Outlet, useParams } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';

export function WorkspaceLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  if (!workspaceId) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base">
      <Sidebar workspaceId={workspaceId} />
      <div className="flex flex-1 flex-col min-w-0">
        <Outlet />
        <StatusBar left={<span>就绪</span>} right={<span>v0.1.0</span>} />
      </div>
    </div>
  );
}
