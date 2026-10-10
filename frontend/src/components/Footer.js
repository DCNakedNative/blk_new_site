import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../config';

export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-brand-cream mt-24" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <p className="font-serif text-xl font-bold tracking-tighter">THE SHENANIGATORS</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-brand-muted">
          <Link to="/submit-event" className="hover:text-brand-ink underline-offset-4 hover:underline">Submit an event</Link>
          <Link to="/guidelines" className="hover:text-brand-ink underline-offset-4 hover:underline">Community guidelines &amp; privacy</Link>
          <Link to="/about" className="hover:text-brand-ink underline-offset-4 hover:underline">About us</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-brand-ink underline-offset-4 hover:underline">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
