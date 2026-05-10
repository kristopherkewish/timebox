import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { Icon } from '@/components/desktop/icons/Icon';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { to: '/', icon: 'calendar', label: 'Day' },
  { to: '/week', icon: 'calendar-week', label: 'Week' },
  { to: '/month', icon: 'calendar-month', label: 'Month' },
] as const;

export function Rail() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const initials = (user?.username ?? 'U').slice(0, 2).toUpperCase();

  return (
    <div className="tb-rail">
      {NAV_ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) => `tb-rail-item ${isActive ? 'active' : ''}`}
          title={it.label}
          aria-label={it.label}
        >
          <Icon name={it.icon} size={16} />
        </NavLink>
      ))}
      <div className="tb-rail-spacer" />
      <button
        type="button"
        className={`tb-rail-item ${location.pathname === '/settings' ? 'active' : ''}`}
        onClick={() => navigate('/settings')}
        title="Settings"
        aria-label="Settings"
      >
        <Icon name="settings" size={16} />
      </button>
      <div style={{ height: 8 }} />
      <div className="tb-rail-avatar" aria-label={`Signed in as ${user?.username ?? 'guest'}`}>
        {initials}
      </div>
    </div>
  );
}
