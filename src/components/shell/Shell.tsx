import { Outlet } from 'react-router-dom';

import { BottomTabBar } from './BottomTabBar';
import { Rail } from './Rail';
import { TitleBar } from './TitleBar';
import { useAuth } from '@/hooks/useAuth';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSettings } from '@/hooks/useSettings';

export function Shell() {
  const { isAuthenticated } = useAuth();
  const isPhone = useMediaQuery('(max-width: 640px)');
  // Trigger the settings fetch once authenticated; ThemeProvider listens via QueryCache.
  useSettings(isAuthenticated);

  return (
    <div className="win-frame">
      <TitleBar />
      <div className={`tb-shell ${isPhone ? 'tb-shell--phone' : ''}`}>
        {!isPhone && <Rail />}
        <div className="tb-main">
          <Outlet />
        </div>
        {isPhone && <BottomTabBar />}
      </div>
    </div>
  );
}
