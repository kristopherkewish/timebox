import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth, useSignUp } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';

interface FormValues {
  email: string;
  username: string;
  password: string;
  rememberMe: boolean;
}

const PASSWORD_RULES = [
  { test: (s: string) => s.length >= 8, label: 'At least 8 characters' },
  { test: (s: string) => /[a-z]/.test(s) && /[A-Z]/.test(s), label: 'Mixed case' },
  { test: (s: string) => /[0-9]/.test(s), label: 'At least one number' },
];

export function SignUpPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const signUp = useSignUp();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { email: '', username: '', password: '', rememberMe: true },
  });

  const password = watch('password') ?? '';

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await signUp.mutateAsync(values);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'email_taken') setSubmitError('That email is already in use.');
        else if (e.code === 'username_taken') setSubmitError('That username is already taken.');
        else if (e.code === 'invalid_body')
          setSubmitError('Please check the form and try again.');
        else setSubmitError('Sign up failed. Try again.');
      } else {
        setSubmitError('Sign up failed. Try again.');
      }
    }
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Plan your days, with no one else to share them with."
      footer={
        <>
          Already have an account? <Link to="/sign-in">Sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            {...register('email', { required: 'Required' })}
          />
          {errors.email && <em>{errors.email.message}</em>}
        </label>
        <label className="auth-field">
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            {...register('username', { required: 'Required' })}
          />
          {errors.username && <em>{errors.username.message}</em>}
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="new-password"
            {...register('password', { required: 'Required' })}
          />
        </label>
        <ul className="auth-rules">
          {PASSWORD_RULES.map((rule) => (
            <li key={rule.label} className={rule.test(password) ? 'pass' : ''}>
              {rule.label}
            </li>
          ))}
        </ul>
        <label className="auth-check">
          <input type="checkbox" {...register('rememberMe')} />
          <span>Stay signed in on this device</span>
        </label>
        {submitError && <div className="auth-error">{submitError}</div>}
        <button type="submit" className="tb-btn primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
