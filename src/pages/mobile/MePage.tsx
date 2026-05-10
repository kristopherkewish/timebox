import { Navigate } from 'react-router-dom';

// Phase 9 placeholder — bounces the Me tab to /settings until Phase 12
// reshapes settings as a mobile-first Me page.
export function MePage() {
  return <Navigate to="/settings" replace />;
}
