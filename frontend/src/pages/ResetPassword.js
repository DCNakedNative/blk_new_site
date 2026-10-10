import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api, { getErrorMessage } from '../lib/api';
import PageMeta from '../components/PageMeta';
import Field from '../components/Field';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password updated. Please sign in.');
      navigate('/auth');
    } catch (error) {
      toast.error(getErrorMessage(error));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-16 px-6" data-testid="reset-password-page">
      <PageMeta title="Choose a new password" description="Reset your password." />
      <div className="w-full max-w-md border border-black/10 p-8 sm:p-12 bg-white/50">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">New password</h1>
        {!token ? (
          <p className="mt-8 text-brand-muted" data-testid="reset-missing-token">
            This reset link is incomplete. <Link to="/forgot-password" className="underline">Request a new one</Link>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 mt-8" data-testid="reset-password-form">
            <Field label="New password" type="password" data-testid="reset-password-input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} hint="At least 8 characters." required />
            <Field label="Confirm password" type="password" data-testid="reset-confirm-input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} maxLength={72} required />
            <button type="submit" data-testid="reset-submit-button" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
