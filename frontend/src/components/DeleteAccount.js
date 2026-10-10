import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthContext } from '../AuthContext';
import api, { getErrorMessage } from '../lib/api';
import Field from './Field';

export default function DeleteAccount() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm('Delete your account for good? Your RSVPs and trip inquiries will be removed. This cannot be undone.')) return;
    setLoading(true);
    try {
      await api.post('/auth/delete-account', { password });
      toast.success('Your account was deleted.');
      logout();
      navigate('/');
    } catch (error) {
      toast.error(getErrorMessage(error));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-brutalist p-6 space-y-6 border-brand-orange/40" data-testid="delete-account-form">
      <h3 className="text-xl font-bold">Delete account</h3>
      <p className="text-sm text-brand-muted">This permanently removes your account, RSVPs and trip inquiries.</p>
      <Field label="Confirm with your password" type="password" autoComplete="current-password" data-testid="delete-account-password-input" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} required />
      <button type="submit" disabled={loading} className="btn-accent" data-testid="delete-account-submit">
        {loading ? 'Please wait…' : 'Delete my account'}
      </button>
    </form>
  );
}
