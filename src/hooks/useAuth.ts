import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

async function fetchMe(): Promise<AuthUser | null> {
  try {
    return await api<AuthUser>('/api/auth/me');
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export function useAuth() {
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });
  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
  };
}

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { usernameOrEmail: string; password: string; rememberMe: boolean }) =>
      api<{ user: AuthUser }>('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(vars),
      }),
    onSuccess: (data) => {
      qc.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useSignUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      email: string;
      username: string;
      password: string;
      rememberMe: boolean;
    }) =>
      api<{ user: AuthUser }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(vars),
      }),
    onSuccess: (data) => {
      qc.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: true }>('/api/auth/signout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(['auth', 'me'], null);
      qc.clear();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (vars: { currentPassword: string; newPassword: string }) =>
      api<{ ok: true }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(vars),
      }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { password: string }) =>
      api<{ ok: true }>('/api/account/delete', {
        method: 'DELETE',
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      qc.setQueryData(['auth', 'me'], null);
      qc.clear();
    },
  });
}
