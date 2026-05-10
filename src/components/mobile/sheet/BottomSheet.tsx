import type { ReactNode } from 'react';

import { useSheet } from '@/hooks/useSheet';

interface Props {
  title?: string;
  subtitle?: ReactNode;
  body: ReactNode;
  cta?: ReactNode;
}

export function BottomSheet({ title, subtitle, body, cta }: Props) {
  const close = useSheet((s) => s.close);

  return (
    <>
      <div className="tbm-scrim" onClick={close} aria-hidden />
      <div className="tbm-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="tbm-sheet-handle" />
        {title && (
          <div className="tbm-sheet-head">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div className="tbm-sheet-title">{title}</div>
              {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{subtitle}</div>}
            </div>
            <button
              type="button"
              className="tbm-sheet-close"
              onClick={close}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
        <div className="tbm-sheet-body">{body}</div>
        {cta}
      </div>
    </>
  );
}
