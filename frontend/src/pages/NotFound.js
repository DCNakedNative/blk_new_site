import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-24 text-center" data-testid="not-found">
      <PageMeta title="Page not found" />
      <div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">Page not found</h1>
        <p className="text-xl text-brand-muted mb-10">That link doesn't lead anywhere. It may have moved or been removed.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/" className="btn-primary">Go to the home page</Link>
          <Link to="/events" className="btn-outline">See events</Link>
        </div>
      </div>
    </div>
  );
}
