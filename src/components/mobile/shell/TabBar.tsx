import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export function TabBar() {
  return (
    <nav className="tbm-tabbar" aria-label="Primary">
      <Tab to="/" end label="Today" icon={<CalendarIcon />} />
      <Tab to="/week" label="Week" icon={<WeekIcon />} />
      <Tab to="/month" label="Month" icon={<GridIcon />} />
      <Tab to="/me" label="Me" icon={<UserIcon />} />
    </nav>
  );
}

interface TabProps {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

function Tab({ to, label, icon, end }: TabProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `tbm-tab${isActive ? ' active' : ''}`}
    >
      {icon}
      <span className="lbl">{label}</span>
    </NavLink>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function WeekIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v4M16 3v4M9 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
