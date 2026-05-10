import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthGate } from '@/components/auth/AuthGate';
import { useIsMobile } from '@/hooks/useIsMobile';

import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { DailyPage } from '@/pages/DailyPage';
import { WeeklyPage } from '@/pages/WeeklyPage';
import { MonthlyPage } from '@/pages/MonthlyPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { MobileTodayPage } from '@/pages/mobile/MobileTodayPage';
import { MobileWeekPage } from '@/pages/mobile/MobileWeekPage';
import { MobileMonthPage } from '@/pages/mobile/MobileMonthPage';
import { MePage } from '@/pages/mobile/MePage';

const DesktopShell = lazy(() =>
  import('@/components/desktop/shell/Shell').then((m) => ({ default: m.Shell })),
);
const MobileShell = lazy(() =>
  import('@/components/mobile/shell/MobileShell').then((m) => ({ default: m.MobileShell })),
);

export function App() {
  const isMobile = useIsMobile();
  const Shell = isMobile ? MobileShell : DesktopShell;
  const Today = isMobile ? MobileTodayPage : DailyPage;
  const Week = isMobile ? MobileWeekPage : WeeklyPage;
  const Month = isMobile ? MobileMonthPage : MonthlyPage;

  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route
        element={
          <AuthGate>
            <Suspense fallback={null}>
              <Shell />
            </Suspense>
          </AuthGate>
        }
      >
        <Route path="/" element={<Today />} />
        <Route path="/week" element={<Week />} />
        <Route path="/month" element={<Month />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
