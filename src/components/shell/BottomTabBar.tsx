import { NavLink } from 'react-router-dom';

import { Icon } from '@/components/icons/Icon';

const TABS = [
  { to: '/', icon: 'calendar', label: 'Day' },
  { to: '/week', icon: 'calendar-week', label: 'Week' },
  { to: '/month', icon: 'calendar-month', label: 'Month' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
] as const;

export function BottomTabBar() {
  return (
    <nav className="tb-bottom-tabs" aria-label="Primary">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => `tb-bottom-tab ${isActive ? 'active' : ''}`}
          aria-label={t.label}
        >
          <span className="tb-bottom-tab-icon-wrap">
            <Icon name={t.icon} size={18} />
          </span>
          <span className="tb-bottom-tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
