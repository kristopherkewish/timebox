import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth, useSignIn } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';

interface FormValues {
  usernameOrEmail: string;
  password: string;
  rememberMe: boolean;
}

export function SignInPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const signIn = useSignIn();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { usernameOrEmail: '', password: '', rememberMe: false },
  });

  if (isLoading) return null;
  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await signIn.mutateAsync(values);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_credentials') {
        setSubmitError('Username/email or password is incorrect.');
      } else {
        setSubmitError('Sign in failed. Try again.');
      }
    }
  });

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          New here? <Link to="/sign-up">Create an account</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-field">
          <span>Username or email</span>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            {...register('usernameOrEmail', { required: 'Required' })}
          />
          {errors.usernameOrEmail && <em>{errors.usernameOrEmail.message}</em>}
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            {...register('password', { required: 'Required' })}
          />
          {errors.password && <em>{errors.password.message}</em>}
        </label>
        <label className="auth-check">
          <input type="checkbox" {...register('rememberMe')} />
          <span>Remember me for 30 days</span>
        </label>
        {submitError && <div className="auth-error">{submitError}</div>}
        <button type="submit" className="tb-btn primary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
