import { useContext, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, Clock, ExternalLink, MapPin, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { AuthContext } from '../AuthContext';
import api, { getErrorMessage } from '../lib/api';
import useFetch from '../hooks/useFetch';
import PageMeta from '../components/PageMeta';
import Field from '../components/Field';
import { ErrorBox, PageLoading } from '../components/StateViews';
import { downloadIcs, formatRange } from '../lib/dates';

export default function TravelDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const trip = useFetch(`/travel-packages/${id}`);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '', message: '', travel_date: '' });
  const set = (key) => (ev) => setForm({ ...form, [key]: ev.target.value });

  if (trip.loading && !trip.data) return <PageLoading />;
  if (trip.error) {
    return (
      <div className="min-h-[60vh] py-24 max-w-3xl mx-auto px-6">
        <ErrorBox message={trip.error} onRetry={trip.reload} />
        <Link to="/travel" className="inline-flex items-center gap-2 mt-8 text-brand-green underline"><ArrowLeft size={16} aria-hidden="true" /> Back to trips</Link>
      </div>
    );
  }
  const t = trip.data;
  const dates = formatRange(t.start_date, t.end_date);

  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    try {
      await api.post('/booking-inquiries', { package_id: t.id, ...form, travel_date: t.start_date || form.travel_date });
      setSent(true);
      toast.success("Thanks! We'll be in touch.");
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not send your message. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  let panel;
  if (sent) {
    panel = <p className="flex items-center gap-3 text-xl font-medium text-brand-green" role="status"><Check size={22} aria-hidden="true" /> Got it. We'll be in touch.</p>;
  } else if (!user) {
    panel = (
      <div className="space-y-6">
        <p className="text-brand-muted leading-relaxed">Sign in or create a free account to tell us you're interested. Only the organizers see your details.</p>
        <Link to="/auth" state={{ from: location.pathname }} className="btn-accent w-full" data-testid="login-to-inquire">Sign in to get in touch</Link>
      </div>
    );
  } else {
    panel = (
      <form onSubmit={submit} className="space-y-6">
        <Field label="Name" data-testid="input-name" autoComplete="name" value={form.name} onChange={set('name')} required />
        <Field label="Email" type="email" data-testid="input-email" autoComplete="email" value={form.email} onChange={set('email')} required />
        <Field label="Phone (optional)" type="tel" data-testid="input-phone" autoComplete="tel" value={form.phone} onChange={set('phone')} hint="Only if you'd like a call or text." />
        {!t.start_date && <Field label="Preferred dates (optional)" type="date" data-testid="input-travel-date" value={form.travel_date} onChange={set('travel_date')} />}
        <Field as="textarea" label="Message (optional)" data-testid="input-message" rows={4} className="resize-none" value={form.message} onChange={set('message')} placeholder="Questions or special requests?" />
        <button type="submit" data-testid="submit-inquiry-button" disabled={busy} className="btn-accent w-full">{busy ? 'Sending…' : "I'm interested"}</button>
      </form>
    );
  }

  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="travel-detail-page">
      <PageMeta title={t.title} description={t.description.slice(0, 160)} />
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <Link to="/travel" data-testid="back-button" className="inline-flex items-center gap-2 text-sm uppercase tracking-widest text-brand-muted hover:text-brand-ink mb-12 transition-colors">
          <ArrowLeft size={16} aria-hidden="true" /> Back to trips
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            {t.image_url && (
              <div className="mb-12 border border-black/10 overflow-hidden">
                <img src={t.image_url} alt="" className="w-full h-auto object-cover" style={{ maxHeight: '600px' }} />
              </div>
            )}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8" data-testid="package-title">{t.title}</h1>

            <dl className="flex flex-wrap gap-x-10 gap-y-6 mb-12">
              <div className="flex items-center gap-3"><MapPin size={24} className="text-brand-green" aria-hidden="true" /><div><dt className="text-xs uppercase tracking-widest text-brand-muted mb-1">Destination</dt><dd className="text-lg font-medium">{t.destination}</dd></div></div>
              {dates && <div className="flex items-center gap-3"><CalendarDays size={24} className="text-brand-green" aria-hidden="true" /><div><dt className="text-xs uppercase tracking-widest text-brand-muted mb-1">Dates</dt><dd className="text-lg font-medium">{dates}</dd></div></div>}
              {t.duration && <div className="flex items-center gap-3"><Clock size={24} className="text-brand-green" aria-hidden="true" /><div><dt className="text-xs uppercase tracking-widest text-brand-muted mb-1">Length</dt><dd className="text-lg font-medium">{t.duration}</dd></div></div>}
              {t.price != null && <div className="flex items-center gap-3"><DollarSign size={24} className="text-brand-orange" aria-hidden="true" /><div><dt className="text-xs uppercase tracking-widest text-brand-muted mb-1">Price</dt><dd className="text-2xl font-bold tracking-tight">${Number(t.price).toLocaleString()} <span className="text-sm font-normal text-brand-muted">per person</span></dd></div></div>}
            </dl>

            <div className="flex flex-wrap gap-4 mb-12">
              {t.external_url && (
                <a href={t.external_url} target="_blank" rel="noopener noreferrer" className="btn-primary" data-testid="trip-external-link">
                  Trip details and booking <ExternalLink size={16} aria-hidden="true" />
                </a>
              )}
              {t.start_date && (
                <button type="button" className="btn-outline" data-testid="trip-add-to-calendar"
                  onClick={() => downloadIcs({ id: t.id, title: t.title, description: t.description, start: t.start_date, end: t.end_date || t.start_date, location: t.destination, url: window.location.href })}>
                  Add to calendar
                </button>
              )}
            </div>

            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-6 tracking-tight">About this trip</h2>
              <p className="text-lg text-brand-muted leading-relaxed whitespace-pre-line max-w-prose" data-testid="package-description">{t.description}</p>
            </div>

            {t.highlights?.length > 0 && (
              <div>
                <h2 className="text-3xl font-bold mb-6 tracking-tight">Highlights</h2>
                <ul className="space-y-4" data-testid="package-highlights">
                  {t.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-4"><Check size={20} className="text-brand-green mt-1 shrink-0" aria-hidden="true" /><span className="text-lg text-brand-muted leading-relaxed">{h}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="border border-black/10 p-8 bg-white/50 lg:sticky lg:top-28" data-testid="inquiry-form">
              <h2 className="text-2xl font-bold mb-6 tracking-tight">Interested in this trip?</h2>
              {panel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
