import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MonthlyTask {
  id: string;
  title: string;
  notes: string | null;
  weekIndex: number | null;
  kind: 'default' | 'muted' | 'success' | 'info';
}

export interface MonthlyData {
  monthStart: string;
  pool: MonthlyTask[];
  byWeek: Record<number, MonthlyTask[] | undefined>;
}

export const monthlyKey = (monthStart: string) => ['monthly', monthStart] as const;

export function useMonthly(monthStart: string) {
  return useQuery<MonthlyData>({
    queryKey: monthlyKey(monthStart),
    queryFn: () => api<MonthlyData>(`/api/monthly/${monthStart}`),
    staleTime: 60_000,
  });
}

export function useCreateMonthlyTask(monthStart: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      title: string;
      notes?: string | null;
      weekIndex?: number | null;
    }) =>
      api<MonthlyTask>(`/api/monthly/${monthStart}`, {
        method: 'POST',
        body: JSON.stringify(vars),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: monthlyKey(monthStart) }),
  });
}

export function useUpdateMonthlyTask(monthStart: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: Partial<MonthlyTask> }) =>
      api<MonthlyTask>(`/api/monthly-tasks/${vars.id}`, {
        method: 'PATCH',
        body: JSON.stringify(vars.patch),
      }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: monthlyKey(monthStart) });
      const prev = qc.getQueryData<MonthlyData>(monthlyKey(monthStart));
      if (prev) {
        const flat = [
          ...prev.pool,
          ...Object.values(prev.byWeek).flatMap((arr) => arr ?? []),
        ].map((t) => (t.id === vars.id ? { ...t, ...vars.patch } : t));
        const next: MonthlyData = {
          ...prev,
          pool: flat.filter((t) => t.weekIndex == null),
          byWeek: flat.reduce<Record<number, MonthlyTask[]>>((acc, t) => {
            if (t.weekIndex == null) return acc;
            (acc[t.weekIndex] ??= []).push(t);
            return acc;
          }, {}),
        };
        qc.setQueryData(monthlyKey(monthStart), next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(monthlyKey(monthStart), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: monthlyKey(monthStart) }),
  });
}

export function useDeleteMonthlyTask(monthStart: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/monthly-tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: monthlyKey(monthStart) }),
  });
}
