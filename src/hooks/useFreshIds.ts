import { create } from 'zustand';

const FRESH_MS = 2000;

interface FreshState {
  ids: ReadonlySet<string>;
  mark: (id: string, ms?: number) => void;
}

export const useFreshIds = create<FreshState>((set) => ({
  ids: new Set<string>(),
  mark: (id, ms = FRESH_MS) => {
    set((s) => {
      const next = new Set(s.ids);
      next.add(id);
      return { ids: next };
    });
    setTimeout(() => {
      set((s) => {
        if (!s.ids.has(id)) return s;
        const next = new Set(s.ids);
        next.delete(id);
        return { ids: next };
      });
    }, ms);
  },
}));

export const useIsFresh = (id: string): boolean =>
  useFreshIds((s) => s.ids.has(id));
