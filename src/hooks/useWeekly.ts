import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface WeeklyTask {
  id: string;
  title: string;
  notes: string | null;
  dayOfWeek: number | null;
  kind: 'default' | 'muted' | 'success' | 'info';
}

export interface WeeklyData {
  weekStart: string;
  pool: WeeklyTask[];
  days: { dayOfWeek: number; tasks: WeeklyTask[] }[];
}

export const weeklyKey = (weekStart: string) => ['weekly', weekStart] as const;

export function useWeekly(weekStart: string) {
  return useQuery<WeeklyData>({
    queryKey: weeklyKey(weekStart),
    queryFn: () => api<WeeklyData>(`/api/weekly/${weekStart}`),
    staleTime: 60_000,
  });
}

export function useCreateWeeklyTask(weekStart: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      title: string;
      notes?: string | null;
      dayOfWeek?: number | null;
    }) =>
      api<WeeklyTask>(`/api/weekly/${weekStart}`, {
        method: 'POST',
        body: JSON.stringify(vars),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: weeklyKey(weekStart) }),
  });
}

export function useUpdateWeeklyTask(weekStart: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: Partial<WeeklyTask> }) =>
      api<WeeklyTask>(`/api/weekly-tasks/${vars.id}`, {
        method: 'PATCH',
        body: JSON.stringify(vars.patch),
      }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: weeklyKey(weekStart) });
      const prev = qc.getQueryData<WeeklyData>(weeklyKey(weekStart));
      if (prev) {
        const patch = vars.patch;
        const all = [...prev.pool, ...prev.days.flatMap((d) => d.tasks)].map((t) =>
          t.id === vars.id ? { ...t, ...patch } : t,
        );
        const next: WeeklyData = {
          ...prev,
          pool: all.filter((t) => t.dayOfWeek == null),
          days: prev.days.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            tasks: all.filter((t) => t.dayOfWeek === d.dayOfWeek),
          })),
        };
        qc.setQueryData(weeklyKey(weekStart), next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(weeklyKey(weekStart), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: weeklyKey(weekStart) }),
  });
}

export function useDeleteWeeklyTask(weekStart: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/weekly-tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: weeklyKey(weekStart) }),
  });
}
