import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useChangePassword } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const change = useChangePassword();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await change.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_password') {
        setSubmitError('Current password is incorrect.');
      } else if (e instanceof ApiError && e.code === 'invalid_body') {
        setSubmitError('New password must be ≥8 chars with mixed case + a digit.');
      } else {
        setSubmitError('Could not change password.');
      }
    }
  });

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2 className="modal-title">Change password</h2>
        <p className="modal-sub">
          You'll be signed out of all other devices after the change.
        </p>
        <label className="auth-field">
          <span>Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            {...register('currentPassword', { required: 'Required' })}
          />
          {errors.currentPassword && <em>{errors.currentPassword.message}</em>}
        </label>
        <label className="auth-field">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            {...register('newPassword', {
              required: 'Required',
              minLength: { value: 8, message: 'Min 8 characters' },
            })}
          />
          {errors.newPassword && <em>{errors.newPassword.message}</em>}
        </label>
        <label className="auth-field">
          <span>Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword', {
              required: 'Required',
              validate: (v) =>
                v === watch('newPassword') ? true : 'Does not match new password',
            })}
          />
          {errors.confirmPassword && <em>{errors.confirmPassword.message}</em>}
        </label>
        {submitError && <div className="auth-error">{submitError}</div>}
        <div className="modal-actions">
          <button type="button" className="tb-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="tb-btn primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}
