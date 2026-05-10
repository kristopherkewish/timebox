import { Outlet } from 'react-router-dom';

import { BottomSheet } from '@/components/mobile/sheet/BottomSheet';
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

  return (
    <div className="tbm">
      <Outlet />
      <TabBar />
      {sheetKind && <ActiveSheet kind={sheetKind} />}
    </div>
  );
}

function ActiveSheet({ kind }: { kind: string }) {
  // Phase 9 only renders the demo sheet; Phase 10 adds quickAdd / block / schedule.
  if (kind === 'demo') {
    return (
      <BottomSheet
        title="Demo sheet"
        body={
          <p style={{ color: 'var(--ink-2)', margin: 0 }}>
            BottomSheet primitive scaffolded. Tap the scrim or the close button to dismiss.
          </p>
        }
      />
    );
  }
  return null;
}
