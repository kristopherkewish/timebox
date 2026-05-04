import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDeleteAccount } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

interface FormValues {
  password: string;
  confirm: string;
}

const PHRASE = 'delete';

export function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const del = useDeleteAccount();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await del.mutateAsync({ password: values.password });
      navigate('/sign-in', { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_password') {
        setSubmitError('Password is incorrect.');
      } else {
        setSubmitError('Could not delete account.');
      }
    }
  });

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2 className="modal-title">Delete account</h2>
        <p className="modal-sub">
          This permanently removes your account and every timebox, weekly task, and monthly task
          tied to it. There is no undo.
        </p>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            {...register('password', { required: 'Required' })}
          />
          {errors.password && <em>{errors.password.message}</em>}
        </label>
        <label className="auth-field">
          <span>Type "delete" to confirm</span>
          <input
            type="text"
            {...register('confirm', {
              required: 'Required',
              validate: (v) => (v === PHRASE ? true : `Type ${PHRASE} exactly`),
            })}
          />
          {errors.confirm && <em>{errors.confirm.message}</em>}
        </label>
        {submitError && <div className="auth-error">{submitError}</div>}
        <div className="modal-actions">
          <button type="button" className="tb-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="tb-btn danger" disabled={isSubmitting}>
            {isSubmitting ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      </form>
    </div>
  );
}
