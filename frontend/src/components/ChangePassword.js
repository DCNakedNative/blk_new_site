import { useState } from 'react';
import { toast } from 'sonner';
import api, { getErrorMessage } from '../lib/api';
import Field from './Field';

const EMPTY = { current: '', next: '', confirm: '' };

export default function ChangePassword() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      toast.error("New passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { current_password: form.current, new_password: form.next });
      toast.success('Password updated.');
      setForm(EMPTY);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-brutalist p-6 space-y-6" data-testid="change-password-form">
      <h3 className="text-xl font-bold">Change password</h3>
      <Field label="Current password" type="password" autoComplete="current-password" data-testid="current-password-input" value={form.current} onChange={set('current')} maxLength={72} required />
      <Field label="New password" type="password" autoComplete="new-password" data-testid="new-password-input" value={form.next} onChange={set('next')} minLength={8} maxLength={72} hint="At least 8 characters." required />
      <Field label="Confirm new password" type="password" autoComplete="new-password" data-testid="confirm-new-password-input" value={form.confirm} onChange={set('confirm')} minLength={8} maxLength={72} required />
      <button type="submit" disabled={loading} className="btn-primary" data-testid="change-password-submit">
        {loading ? 'Please wait…' : 'Update password'}
      </button>
    </form>
  );
}
