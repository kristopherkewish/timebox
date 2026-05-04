import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthGate } from '@/components/auth/AuthGate';
import { Shell } from '@/components/shell/Shell';
import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { DailyPage } from '@/pages/DailyPage';
import { WeeklyPage } from '@/pages/WeeklyPage';
import { MonthlyPage } from '@/pages/MonthlyPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route
        element={
          <AuthGate>
            <Shell />
          </AuthGate>
        }
      >
        <Route path="/" element={<DailyPage />} />
        <Route path="/week" element={<WeeklyPage />} />
        <Route path="/month" element={<MonthlyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
