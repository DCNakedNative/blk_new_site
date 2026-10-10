import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Plane, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AuthContext } from '../AuthContext';
import api, { getErrorMessage } from '../lib/api';
import useFetch from '../hooks/useFetch';
import PageMeta from '../components/PageMeta';
import { ErrorBox, PageLoading } from '../components/StateViews';
import { formatDay, formatRange, formatWhen } from '../lib/dates';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const rsvps = useFetch('/my-rsvps');
  const bookings = useFetch('/my-bookings');

  const cancel = async (rsvp) => {
    if (!window.confirm(`Cancel your RSVP for ${rsvp.event_title || 'this event'}?`)) return;
    try {
      await api.delete(`/rsvp/${rsvp.id}`);
      toast.success('Your RSVP was cancelled.');
      rsvps.reload();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not cancel. Please try again.'));
    }
  };

  if ((rsvps.loading && !rsvps.data) || (bookings.loading && !bookings.data)) return <PageLoading />;

  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="dashboard-page">
      <PageMeta title="My account" />
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 break-words" data-testid="dashboard-title">Welcome, {user?.name}</h1>
          <p className="text-xl text-brand-muted leading-relaxed">Your RSVPs and trip inquiries in one place.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <section aria-labelledby="rsvp-heading">
            <div className="flex items-center justify-between mb-8">
              <h2 id="rsvp-heading" className="text-3xl font-bold tracking-tight">My events</h2>
              <span className="text-sm text-brand-muted" data-testid="rsvps-count">{(rsvps.data || []).length} {(rsvps.data || []).length === 1 ? 'event' : 'events'}</span>
            </div>
            {rsvps.error ? (
              <ErrorBox message={rsvps.error} onRetry={rsvps.reload} />
            ) : (rsvps.data || []).length === 0 ? (
              <div className="border border-black/10 bg-white/50 p-12 text-center" data-testid="no-rsvps">
                <Users size={48} className="mx-auto mb-4 text-brand-muted" aria-hidden="true" />
                <p className="text-brand-muted mb-6">You haven't RSVP'd to anything yet.</p>
                <Link to="/events" data-testid="browse-events-link" className="btn-primary">Browse events</Link>
              </div>
            ) : (
              <div className="space-y-6" data-testid="rsvps-list">
                {rsvps.data.map((r) => (
                  <div key={r.id} data-testid={`rsvp-card-${r.id}`} className="card-brutalist p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h3 className="text-xl font-bold">
                        {r.event_title ? <Link to={`/events/${r.event_id}`} className="hover:text-brand-orange transition-colors">{r.event_title}</Link> : 'This event was removed'}
                      </h3>
                      <Calendar size={20} className="text-brand-green shrink-0" aria-hidden="true" />
                    </div>
                    {r.event_date && <p className="text-sm text-brand-muted mb-1">{formatWhen(r.event_date, 'EEE, MMM d, yyyy')}</p>}
                    {r.event_location && <p className="flex items-center gap-2 text-sm text-brand-muted mb-1"><MapPin size={14} aria-hidden="true" />{r.event_location}</p>}
                    {r.event_location_details && <p className="text-sm text-brand-ink whitespace-pre-line mt-3 p-3 bg-white/60 border border-black/5">{r.event_location_details}</p>}
                    <div className="flex items-center justify-between mt-5">
                      <span className="text-xs uppercase tracking-widest text-brand-muted">Registered {formatDay(r.created_at, 'MMM d, yyyy')}</span>
                      <button type="button" onClick={() => cancel(r)} className="text-sm text-brand-orange underline underline-offset-4 hover:text-brand-ink">Cancel RSVP</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="trip-heading">
            <div className="flex items-center justify-between mb-8">
              <h2 id="trip-heading" className="text-3xl font-bold tracking-tight">My trip inquiries</h2>
              <span className="text-sm text-brand-muted" data-testid="bookings-count">{(bookings.data || []).length} {(bookings.data || []).length === 1 ? 'inquiry' : 'inquiries'}</span>
            </div>
            {bookings.error ? (
              <ErrorBox message={bookings.error} onRetry={bookings.reload} />
            ) : (bookings.data || []).length === 0 ? (
              <div className="border border-black/10 bg-white/50 p-12 text-center" data-testid="no-bookings">
                <Plane size={48} className="mx-auto mb-4 text-brand-muted" aria-hidden="true" />
                <p className="text-brand-muted mb-6">No trip inquiries yet.</p>
                <Link to="/travel" data-testid="browse-travel-link" className="btn-accent">Browse trips</Link>
              </div>
            ) : (
              <div className="space-y-6" data-testid="bookings-list">
                {bookings.data.map((b) => (
                  <div key={b.id} data-testid={`booking-card-${b.id}`} className="card-brutalist p-6">
                    <h3 className="text-xl font-bold mb-2">
                      {b.package_title ? <Link to={`/travel/${b.package_id}`} className="hover:text-brand-orange transition-colors">{b.package_title}</Link> : 'This trip was removed'}
                    </h3>
                    {b.package_destination && <p className="flex items-center gap-2 text-sm text-brand-muted mb-1"><MapPin size={14} aria-hidden="true" />{b.package_destination}</p>}
                    {b.travel_date && <p className="text-sm text-brand-muted mb-1">Dates: {formatRange(b.travel_date) || b.travel_date}</p>}
                    {b.message && <p className="text-sm text-brand-muted my-4 p-4 bg-white/50 border border-black/5">{b.message}</p>}
                    <p className="text-xs uppercase tracking-widest text-brand-muted mt-4">Sent {formatDay(b.created_at, 'MMM d, yyyy')}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
