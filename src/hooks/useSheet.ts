import { create } from 'zustand';

export type SheetKind = 'quickAdd' | 'block' | 'schedule' | 'demo';

interface SheetState {
  kind: SheetKind | null;
  payload: unknown;
  open: (kind: SheetKind, payload?: unknown) => void;
  close: () => void;
}

export const useSheet = create<SheetState>((set) => ({
  kind: null,
  payload: undefined,
  open: (kind, payload) => set({ kind, payload }),
  close: () => set({ kind: null, payload: undefined }),
}));
