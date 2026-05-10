import { Outlet } from 'react-router-dom';

import { BlockDetailSheet } from '@/components/mobile/sheet/BlockDetailSheet';
import { QuickAddSheet } from '@/components/mobile/sheet/QuickAddSheet';
import { ScheduleSheet } from '@/components/mobile/sheet/ScheduleSheet';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useSheet } from '@/hooks/useSheet';
import { TabBar } from './TabBar';

import '@/styles/mobile.css';

export function MobileShell() {
  const { isAuthenticated } = useAuth();
  // Trigger the settings fetch once authenticated; ThemeProvider listens via QueryCache.
  useSettings(isAuthenticated);
  const sheetKind = useSheet((s) => s.kind);
  const payload = useSheet((s) => s.payload);

  return (
    <div className="tbm">
      <Outlet />
      <TabBar />
      {sheetKind && <ActiveSheet kind={sheetKind} payload={payload} />}
    </div>
  );
}

function ActiveSheet({ kind, payload }: { kind: string; payload: unknown }) {
  if (kind === 'quickAdd') return <QuickAddSheet />;
  if (kind === 'schedule' && hasTaskId(payload)) {
    return <ScheduleSheet taskId={payload.taskId} />;
  }
  if (kind === 'block' && hasTaskId(payload)) {
    return <BlockDetailSheet taskId={payload.taskId} />;
  }
  return null;
}

function hasTaskId(p: unknown): p is { taskId: string } {
  return (
    typeof p === 'object' &&
    p !== null &&
    'taskId' in p &&
    typeof (p as { taskId: unknown }).taskId === 'string'
  );
}
