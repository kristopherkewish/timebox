import { Outlet } from 'react-router-dom';

import { Rail } from './Rail';
import { TitleBar } from './TitleBar';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';

export function Shell() {
  const { isAuthenticated } = useAuth();
  // Trigger the settings fetch once authenticated; ThemeProvider listens via QueryCache.
  useSettings(isAuthenticated);

  return (
    <div className="win-frame">
      <TitleBar />
      <div className="tb-shell">
        <Rail />
        <div className="tb-main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
