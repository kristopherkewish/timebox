import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Timebox {
  id: string;
  title: string;
  startMin: number | null;
  durationMin: number;
  notes: string | null;
  completionState: 'upcoming' | 'in-progress' | 'completed' | 'incomplete';
  completionOverridden: 0 | 1;
}

export interface DailyData {
  date: string;
  inbox: Timebox[];
  timeline: Timebox[];
}

export const dailyKey = (date: string) => ['daily', date] as const;

export function useDaily(date: string) {
  return useQuery<DailyData>({
    queryKey: dailyKey(date),
    queryFn: () => api<DailyData>(`/api/daily/${date}`),
    staleTime: 30_000,
  });
}

export function useCreateTimebox(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      title: string;
      durationMin: number;
      startMin?: number | null;
      notes?: string | null;
    }) =>
      api<Timebox>(`/api/daily/${date}`, {
        method: 'POST',
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dailyKey(date) });
    },
  });
}

export function useUpdateTimebox(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: Partial<Timebox> }) =>
      api<Timebox>(`/api/timeboxes/${vars.id}`, {
        method: 'PATCH',
        body: JSON.stringify(vars.patch),
      }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: dailyKey(date) });
      const prev = qc.getQueryData<DailyData>(dailyKey(date));
      if (prev) {
        const apply = (rows: Timebox[]) =>
          rows.map((t) => (t.id === vars.id ? { ...t, ...vars.patch } : t));
        const next: DailyData = {
          ...prev,
          inbox: apply(prev.inbox),
          timeline: apply(prev.timeline),
        };
        // Re-bucket if startMin moved across the inbox/timeline boundary.
        const all = [...next.inbox, ...next.timeline];
        next.inbox = all.filter((t) => t.startMin == null);
        next.timeline = all
          .filter((t) => t.startMin != null)
          .sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));
        qc.setQueryData<DailyData>(dailyKey(date), next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(dailyKey(date), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: dailyKey(date) });
    },
  });
}

export function useDeleteTimebox(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/timeboxes/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: dailyKey(date) });
      const prev = qc.getQueryData<DailyData>(dailyKey(date));
      if (prev) {
        qc.setQueryData<DailyData>(dailyKey(date), {
          ...prev,
          inbox: prev.inbox.filter((t) => t.id !== id),
          timeline: prev.timeline.filter((t) => t.id !== id),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(dailyKey(date), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: dailyKey(date) });
    },
  });
}
