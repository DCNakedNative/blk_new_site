import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar as CalendarIcon, List, MapPin, Users } from 'lucide-react';
import { startOfToday } from 'date-fns';
import useFetch from '../hooks/useFetch';
import PageMeta from '../components/PageMeta';
import EventCalendar from '../components/EventCalendar';
import { EmptyBox, ErrorBox, PageLoading } from '../components/StateViews';
import { formatWhen, toDate } from '../lib/dates';

const isFull = (e) => e.attendees_count >= e.max_attendees;

function EventCard({ event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      data-testid={`event-card-${event.id}`}
      className="card-brutalist p-8 block group"
    >
      <div className="flex items-start justify-between mb-6 gap-4">
        <span className="text-xs uppercase tracking-widest px-4 py-1 bg-brand-green text-brand-cream">{event.category}</span>
        <div
          className={`flex items-center gap-2 text-sm shrink-0 ${isFull(event) ? 'text-brand-orange font-medium' : 'text-brand-muted'}`}
          aria-label={`${event.attendees_count} of ${event.max_attendees} spots taken`}
        >
          <Users size={16} aria-hidden="true" />
          {isFull(event) ? 'Full' : `${event.attendees_count}/${event.max_attendees}`}
        </div>
      </div>

      <h3 className="text-3xl font-bold mb-4 tracking-tight group-hover:text-brand-orange transition-colors">{event.title}</h3>
      <p className="text-brand-muted leading-relaxed mb-6 line-clamp-2">{event.description}</p>

      <div className="space-y-2">
        <div className="flex items-center gap-3 text-sm text-brand-muted">
          <CalendarIcon size={16} aria-hidden="true" />
          {formatWhen(event.date, 'EEE, MMMM d, yyyy')}
        </div>
        <div className="flex items-center gap-3 text-sm text-brand-muted">
          <MapPin size={16} aria-hidden="true" />
          {event.location}
        </div>
      </div>
    </Link>
  );
}

export default function Events() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'calendar' ? 'calendar' : 'list';
  const [category, setCategory] = useState('all');
  const [showPast, setShowPast] = useState(false);

  const events = useFetch('/events');
  const trips = useFetch('/travel-packages', {}, { enabled: view === 'calendar' });

  const categories = useMemo(() => {
    const unique = [...new Set((events.data || []).map((e) => e.category))].sort();
    return ['all', ...unique];
  }, [events.data]);

  const filtered = useMemo(
    () => (events.data || []).filter((e) => category === 'all' || e.category === category),
    [events.data, category]
  );

  const { upcoming, past } = useMemo(() => {
    const today = startOfToday().getTime();
    const up = [];
    const old = [];
    filtered.forEach((e) => {
      const last = toDate(e.end_date || e.date);
      (last && last.getTime() < today ? old : up).push(e);
    });
    return { upcoming: up, past: old.reverse() };
  }, [filtered]);

  const calendarItems = useMemo(() => {
    const items = filtered
      .filter((e) => toDate(e.date))
      .map((e) => ({
        key: `e-${e.id}`,
        title: e.title,
        start: toDate(e.date),
        end: toDate(e.end_date),
        kind: 'event',
        to: `/events/${e.id}`,
      }));
    if (category === 'all') {
      (trips.data || [])
        .filter((t) => toDate(t.start_date))
        .forEach((t) =>
          items.push({
            key: `t-${t.id}`,
            title: t.title,
            start: toDate(t.start_date),
            end: toDate(t.end_date),
            kind: 'trip',
            to: `/travel/${t.id}`,
          })
        );
    }
    return items;
  }, [filtered, trips.data, category]);

  const setView = (next) => setParams(next === 'calendar' ? { view: 'calendar' } : {}, { replace: true });

  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="events-page">
      <PageMeta
        title="Events"
        description="Upcoming socials, campouts and getaways from The Shenanigators. Browse the list or see events and trips on the calendar."
      />
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6" data-testid="events-title">
            Events
          </h1>
          <p className="text-xl text-brand-muted leading-relaxed max-w-3xl">
            See what's coming up. The calendar shows events and trips together, and the list has the details.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div className="inline-flex border border-brand-ink/30 self-start" role="group" aria-label="Choose a view">
            {[
              { id: 'list', label: 'List', Icon: List },
              { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                data-testid={`view-${id}`}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm uppercase tracking-widest font-medium transition-colors ${
                  view === id ? 'bg-brand-ink text-brand-cream' : 'text-brand-muted hover:text-brand-ink'
                }`}
              >
                <Icon size={16} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {view === 'list' && (
            <label className="flex items-center gap-3 text-sm text-brand-muted">
              <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="w-4 h-4 accent-[#1A4D2E]" />
              Show past events
            </label>
          )}
        </div>

        {categories.length > 2 && (
          <div className="flex gap-3 mb-10 overflow-x-auto pb-4" data-testid="category-filters" role="group" aria-label="Filter by category">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                data-testid={`filter-${cat}`}
                aria-pressed={category === cat}
                onClick={() => setCategory(cat)}
                className={`px-6 py-2 text-xs uppercase tracking-widest font-medium border transition-colors whitespace-nowrap ${
                  category === cat
                    ? 'bg-brand-green text-brand-cream border-brand-green'
                    : 'bg-white/50 text-brand-muted border-black/10 hover:border-brand-green'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {events.loading && !events.data ? (
          <PageLoading />
        ) : events.error ? (
          <ErrorBox message={events.error} onRetry={events.reload} />
        ) : view === 'calendar' ? (
          <>
            {trips.error && <p className="mb-6 text-brand-orange" role="alert">Trips couldn't be loaded, so only events are shown.</p>}
            <EventCalendar items={calendarItems} />
          </>
        ) : upcoming.length === 0 && !(showPast && past.length) ? (
          <EmptyBox>
            <p data-testid="no-events">No upcoming events yet.</p>
            <p className="text-base mt-3">
              Know of one? <Link to="/submit-event" className="underline text-brand-green">Submit an event</Link>.
            </p>
          </EmptyBox>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-testid="events-grid">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {showPast && past.length > 0 && (
              <section className="mt-16" aria-labelledby="past-heading">
                <h2 id="past-heading" className="text-3xl font-bold tracking-tight mb-8">Past events</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 opacity-80">
                  {past.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
