import { RefreshCw } from 'lucide-react';

export function PageLoading({ label = 'Loading…' }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center text-brand-muted" role="status">
      {label}
    </div>
  );
}

// Shown when a request fails, so a server problem never looks like "nothing found".
export function ErrorBox({ message, onRetry }) {
  return (
    <div className="border border-brand-orange/40 bg-white/60 p-8 text-center" role="alert">
      <p className="text-lg text-brand-ink mb-2">{message || 'Something went wrong.'}</p>
      <p className="text-brand-muted mb-6">Nothing has been lost. Try loading it again.</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-outline">
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyBox({ children }) {
  return <div className="text-center py-24 px-6 border border-black/10 bg-white/50 text-xl text-brand-muted">{children}</div>;
}
