import { useCallback, useState } from 'react';

type View = 'daily' | 'weekly' | 'monthly';

const KEY_PREFIX = 'tb.poolCollapsed.';

function read(view: View, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + view);
    if (raw === '0') return false;
    if (raw === '1') return true;
    return fallback;
  } catch {
    return fallback;
  }
}

function write(view: View, collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY_PREFIX + view, collapsed ? '1' : '0');
  } catch {
    /* private mode / quota errors — silent */
  }
}

export function usePoolCollapsed(view: View, defaultCollapsed = true) {
  const [collapsed, setCollapsedState] = useState(() => read(view, defaultCollapsed));

  const setCollapsed = useCallback(
    (next: boolean) => {
      setCollapsedState(next);
      write(view, next);
    },
    [view],
  );

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      write(view, next);
      return next;
    });
  }, [view]);

  return { collapsed, setCollapsed, toggle };
}
