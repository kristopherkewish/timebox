import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import { Icon } from '@/components/desktop/icons/Icon';

interface HeaderProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  dateLabel?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  right?: ReactNode;
}

const VIEWS = [
  { id: 'day', to: '/', label: 'Day' },
  { id: 'week', to: '/week', label: 'Week' },
  { id: 'month', to: '/month', label: 'Month' },
] as const;

export function Header({ eyebrow, title, sub, dateLabel, onPrev, onNext, onToday, right }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView =
    location.pathname === '/week' ? 'week' : location.pathname === '/month' ? 'month' : 'day';

  return (
    <div className="tb-header">
      <div className="tb-header-left">
        {eyebrow && <div className="tb-header-eyebrow">{eyebrow}</div>}
        <div className="tb-header-title">{title}</div>
        {sub && <div className="tb-header-sub">{sub}</div>}
      </div>
      <div className="tb-header-right">
        <div className="tb-segmented" role="tablist" aria-label="View">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={activeView === v.id}
              className={activeView === v.id ? 'active' : ''}
              onClick={() => navigate(v.to)}
            >
              {v.label}
            </button>
          ))}
        </div>
        {dateLabel && (
          <div className="tb-date-step">
            <button type="button" onClick={onPrev} aria-label="Previous">
              <Icon name="chevron-left" size={14} />
            </button>
            <div className="label">{dateLabel}</div>
            <button type="button" onClick={onNext} aria-label="Next">
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
        )}
        {onToday && (
          <button type="button" className="tb-btn" onClick={onToday}>
            Today
          </button>
        )}
        {right}
      </div>
    </div>
  );
}
