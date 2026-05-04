import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SETTINGS_QUERY_KEY, useUpdateSettings } from '@/hooks/useSettings';
import type { Settings } from '@/hooks/useSettings';

export type Theme = 'light' | 'dark';
export type Accent =
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'rose'
  | 'slate';

export const ACCENTS: Accent[] = [
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'indigo',
  'violet',
  'rose',
  'slate',
];

interface ThemeContextValue {
  theme: Theme;
  accent: Accent;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'timebox.theme';

interface PersistedTheme {
  theme: Theme;
  accent: Accent;
}

function readPersisted(): PersistedTheme {
  if (typeof window === 'undefined') return { theme: 'light', accent: 'orange' };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { theme: 'light', accent: 'orange' };
    const parsed = JSON.parse(raw) as Partial<PersistedTheme>;
    return {
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      accent: ACCENTS.includes(parsed.accent as Accent) ? (parsed.accent as Accent) : 'orange',
    };
  } catch {
    return { theme: 'light', accent: 'orange' };
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readPersisted, []);
  const [theme, setThemeState] = useState<Theme>(initial.theme);
  const [accent, setAccentState] = useState<Accent>(initial.accent);
  const updateSettings = useUpdateSettings();
  const qc = useQueryClient();

  // Sync from server settings into local theme state when they arrive.
  useEffect(() => {
    const unsub = qc.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      const data = event.query.state.data as Settings | undefined;
      if (!event.query.queryKey || event.query.queryKey[0] !== SETTINGS_QUERY_KEY[0]) return;
      if (!data) return;
      if (data.theme && data.theme !== theme) setThemeState(data.theme);
      if (data.accent && data.accent !== accent && ACCENTS.includes(data.accent as Accent)) {
        setAccentState(data.accent as Accent);
      }
    });
    return unsub;
  }, [qc, theme, accent]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-accent', accent);
  }, [theme, accent]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, accent }));
    } catch {
      /* ignore quota / unavailable */
    }
  }, [theme, accent]);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      // Best-effort sync; ignored on auth pages where the request will 401.
      updateSettings.mutate({ theme: t });
    },
    [updateSettings],
  );
  const setAccent = useCallback(
    (a: Accent) => {
      setAccentState(a);
      updateSettings.mutate({ accent: a });
    },
    [updateSettings],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, accent, setTheme, setAccent }),
    [theme, accent, setTheme, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
