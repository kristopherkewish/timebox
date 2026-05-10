import { useEffect, useRef, type ReactNode } from 'react';

import { useSheet } from '@/hooks/useSheet';

interface Props {
  title?: string;
  subtitle?: ReactNode;
  body: ReactNode;
  cta?: ReactNode;
}

export function BottomSheet({ title, subtitle, body, cta }: Props) {
  const close = useSheet((s) => s.close);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);

  // Drag-to-dismiss: pointer-drag on the handle past 40% of sheet height closes;
  // anything shorter springs back. Drives the sheet via raw `transform` so it
  // tracks the finger 1:1 without React re-renders.
  useEffect(() => {
    const handle = handleRef.current;
    const sheet = sheetRef.current;
    if (!handle || !sheet) return;

    let dragging = false;
    let startY = 0;

    const onDown = (e: PointerEvent) => {
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        // Safari may throw if the pointer isn't captureable — ignore.
      }
      dragging = true;
      startY = e.clientY;
      sheet.style.transition = 'none';
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dy = Math.max(0, e.clientY - startY);
      sheet.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      const dy = Math.max(0, e.clientY - startY);
      const h = sheet.getBoundingClientRect().height;
      sheet.style.transition = 'transform 0.25s ease-out';
      if (dy > h * 0.4) {
        sheet.style.transform = `translateY(${h}px)`;
        window.setTimeout(close, 250);
      } else {
        sheet.style.transform = 'translateY(0)';
      }
    };

    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
    return () => {
      handle.removeEventListener('pointerdown', onDown);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
    };
  }, [close]);

  return (
    <>
      <div className="tbm-scrim" onClick={close} aria-hidden />
      <div
        ref={sheetRef}
        className="tbm-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div ref={handleRef} className="tbm-sheet-handle" />
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
