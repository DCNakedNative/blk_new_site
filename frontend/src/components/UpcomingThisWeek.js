import { Link } from 'react-router-dom';
import { CalendarClock, MapPin } from 'lucide-react';
import { addDays, isBefore, startOfToday } from 'date-fns';
import { formatWhen, toDate } from '../lib/dates';
import AddToCalendar from './AddToCalendar';

export function rsvpToCalendarEvent(r) {
  return {
    id: r.event_id,
    title: r.event_title,
    start: r.event_date,
    end: r.event_end_date,
    location: r.event_location_details ? `${r.event_location_details}, ${r.event_location}` : r.event_location,
    description: `${window.location.origin}/events/${r.event_id}`,
    url: `${window.location.origin}/events/${r.event_id}`,
  };
}

export default function UpcomingThisWeek({ rsvps }) {
  const today = startOfToday();
  const weekEnd = addDays(today, 7);
  const upcoming = rsvps
    .filter((r) => {
      const d = toDate(r.event_date);
      return r.event_title && d && !isBefore(d, today) && isBefore(d, weekEnd);
    })
    .sort((a, b) => toDate(a.event_date) - toDate(b.event_date));

  return (
    <section aria-labelledby="week-heading" className="mb-16 border border-brand-green/30 bg-brand-green/5 p-6 md:p-10" data-testid="coming-up-this-week">
      <h2 id="week-heading" className="flex items-center gap-3 text-2xl md:text-3xl font-bold tracking-tight mb-6">
        <CalendarClock size={26} className="text-brand-green" aria-hidden="true" /> Coming up this week
      </h2>
      {upcoming.length === 0 ? (
        <p className="text-brand-muted" data-testid="no-upcoming-this-week">
          Nothing on your calendar for the next 7 days. <Link to="/events" className="underline underline-offset-4 text-brand-green">See what's coming up</Link>.
        </p>
      ) : (
        <ul className="divide-y divide-black/10" data-testid="upcoming-week-list">
          {upcoming.map((r) => (
            <li key={r.id} className="py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3" data-testid={`upcoming-week-item-${r.event_id}`}>
              <div>
                <Link to={`/events/${r.event_id}`} className="text-lg font-bold hover:text-brand-orange transition-colors">{r.event_title}</Link>
                <p className="text-sm text-brand-muted">{formatWhen(r.event_date, 'EEE, MMM d')}</p>
                {r.event_location && <p className="flex items-center gap-2 text-sm text-brand-muted"><MapPin size={14} aria-hidden="true" />{r.event_location}</p>}
              </div>
              <AddToCalendar event={rsvpToCalendarEvent(r)} compact testIdPrefix={`week-calendar-${r.event_id}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
