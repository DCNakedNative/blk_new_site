import { useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthContext } from '../AuthContext';
import api, { getErrorMessage } from '../lib/api';
import PageMeta from '../components/PageMeta';
import Field from '../components/Field';

// After login, the /auth route (see App.js) sends people back to the page they came from.
export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const location = useLocation();
  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = isLogin ? { email: formData.email, password: formData.password } : formData;
      const res = await api.post(isLogin ? '/auth/login' : '/auth/register', payload);
      toast.success(isLogin ? 'Welcome back!' : 'Account created.');
      login(res.data.token, res.data.user);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't sign you in. Please try again."));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-16 px-6" data-testid="auth-page">
      <PageMeta title={isLogin ? 'Sign in' : 'Create account'} description="Sign in to RSVP to events and keep track of what you're going to." />
      <div className="w-full max-w-md">
        <div className="border border-black/10 p-8 sm:p-12 bg-white/50">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight" data-testid="auth-title">{isLogin ? 'Welcome back' : 'Join us'}</h1>
          {location.state?.from && <p className="mb-8 text-brand-muted">Sign in to continue.</p>}

          <form onSubmit={handleSubmit} className="space-y-8 mt-8" data-testid="auth-form">
            {!isLogin && <Field label="Name" data-testid="input-name" autoComplete="name" value={formData.name} onChange={set('name')} maxLength={80} required />}
            <Field label="Email" type="email" data-testid="input-email" autoComplete="email" value={formData.email} onChange={set('email')} required />
            <Field
              label="Password"
              type="password"
              data-testid="input-password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={formData.password}
              onChange={set('password')}
              minLength={isLogin ? undefined : 8}
              maxLength={72}
              hint={isLogin ? undefined : 'At least 8 characters.'}
              required
            />
            <button type="submit" data-testid="submit-button" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} data-testid="toggle-auth-mode" className="text-sm text-brand-muted hover:text-brand-ink underline underline-offset-4 transition-colors">
              {isLogin ? "New here? Create an account" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
