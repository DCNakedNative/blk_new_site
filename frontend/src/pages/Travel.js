import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { startOfToday } from 'date-fns';
import useFetch from '../hooks/useFetch';
import PageMeta from '../components/PageMeta';
import { EmptyBox, ErrorBox, PageLoading } from '../components/StateViews';
import { formatRange, toDate } from '../lib/dates';

function TripCard({ trip }) {
  const dates = formatRange(trip.start_date, trip.end_date);
  return (
    <Link to={`/travel/${trip.id}`} data-testid={`package-card-${trip.id}`} className="card-brutalist overflow-hidden block group">
      {trip.image_url && (
        <div className="h-72 overflow-hidden">
          <img src={trip.image_url} alt="" loading="lazy" className="w-full h-full object-cover motion-safe:group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-4 tracking-tight leading-tight group-hover:text-brand-orange transition-colors">{trip.title}</h2>
        <p className="text-brand-muted leading-relaxed mb-6 line-clamp-2">{trip.description}</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-brand-muted"><MapPin size={16} className="text-brand-green" aria-hidden="true" />{trip.destination}</div>
          {dates && <div className="flex items-center gap-3 text-sm text-brand-muted"><CalendarDays size={16} className="text-brand-green" aria-hidden="true" />{dates}</div>}
          {trip.duration && <div className="flex items-center gap-3 text-sm text-brand-muted"><Clock size={16} className="text-brand-green" aria-hidden="true" />{trip.duration}</div>}
        </div>
        {trip.price != null && (
          <p className="pt-6 mt-6 border-t border-black/10">
            <span className="text-3xl font-bold tracking-tight">${Number(trip.price).toLocaleString()}</span>{' '}
            <span className="text-sm text-brand-muted">per person</span>
          </p>
        )}
      </div>
    </Link>
  );
}

export default function Travel() {
  const trips = useFetch('/travel-packages');

  const { upcoming, past } = useMemo(() => {
    const today = startOfToday().getTime();
    const up = [];
    const old = [];
    (trips.data || []).forEach((t) => {
      const last = toDate(t.end_date || t.start_date);
      (last && last.getTime() < today ? old : up).push(t);
    });
    // Trips with dates first, soonest first; undated trips after them.
    up.sort((a, b) => (toDate(a.start_date)?.getTime() ?? Infinity) - (toDate(b.start_date)?.getTime() ?? Infinity));
    return { upcoming: up, past: old };
  }, [trips.data]);

  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="travel-page">
      <PageMeta title="Trips" description="Where The Shenanigators are headed next. See trip dates, destinations and how to join." />
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6" data-testid="travel-title">Trips</h1>
          <p className="text-xl text-brand-muted leading-relaxed max-w-3xl">Where we're headed next, and how to come along.</p>
        </div>

        {trips.loading && !trips.data ? (
          <PageLoading />
        ) : trips.error ? (
          <ErrorBox message={trips.error} onRetry={trips.reload} />
        ) : upcoming.length === 0 && past.length === 0 ? (
          <EmptyBox><span data-testid="no-packages">No trips announced yet. Check back soon.</span></EmptyBox>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="packages-grid">
              {upcoming.map((t) => <TripCard key={t.id} trip={t} />)}
            </div>
            {past.length > 0 && (
              <section className="mt-16" aria-labelledby="past-trips">
                <h2 id="past-trips" className="text-3xl font-bold tracking-tight mb-8">Past trips</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-80">
                  {past.map((t) => <TripCard key={t.id} trip={t} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
