import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Settings {
  theme: 'light' | 'dark';
  accent: string;
  defaultIncrementMin: number;
  dayStartMin: number;
  dayEndMin: number;
  allowOverlap: boolean;
  firstDayOfWeek: number;
}

export const SETTINGS_QUERY_KEY = ['settings'] as const;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  accent: 'orange',
  defaultIncrementMin: 15,
  dayStartMin: 360,
  dayEndMin: 1320,
  allowOverlap: false,
  firstDayOfWeek: 1,
};

export function useSettings(enabled = true) {
  const query = useQuery<Settings>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => api<Settings>('/api/settings'),
    staleTime: 5 * 60_000,
    enabled,
  });
  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    raw: query,
  };
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Settings>) =>
      api<Settings>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: SETTINGS_QUERY_KEY });
      const prev = qc.getQueryData<Settings>(SETTINGS_QUERY_KEY);
      if (prev) qc.setQueryData<Settings>(SETTINGS_QUERY_KEY, { ...prev, ...patch });
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(SETTINGS_QUERY_KEY, ctx.prev);
    },
    onSuccess: (data) => {
      qc.setQueryData(SETTINGS_QUERY_KEY, data);
    },
  });
}
