import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api, { getErrorMessage } from '../lib/api';
import PageMeta from '../components/PageMeta';
import Field from '../components/Field';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-16 px-6" data-testid="forgot-password-page">
      <PageMeta title="Forgot password" description="Reset your password." />
      <div className="w-full max-w-md border border-black/10 p-8 sm:p-12 bg-white/50">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">Forgot password</h1>
        {sent ? (
          <p className="mt-8 text-brand-muted" data-testid="forgot-password-sent">
            If that email has an account, we've sent a link to reset your password. It's valid for 1 hour.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 mt-8" data-testid="forgot-password-form">
            <p className="text-brand-muted">Enter your email and we'll send you a link to choose a new password.</p>
            <Field label="Email" type="email" data-testid="forgot-email-input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit" data-testid="forgot-submit-button" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait…' : 'Send reset link'}
            </button>
          </form>
        )}
        <div className="mt-8 text-center">
          <Link to="/auth" data-testid="back-to-signin-link" className="text-sm text-brand-muted hover:text-brand-ink underline underline-offset-4">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
