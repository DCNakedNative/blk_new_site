import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Month calendar. `items` is a list of
 *   { key, title, start: Date, end: Date | null, kind: 'event' | 'trip', to: '/events/123' }
 * Trips that span several days appear on every day they cover.
 * Tap a day to list what's on; with no day selected the list shows the whole month.
 */
export default function EventCalendar({ items }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(null);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }),
    [month]
  );

  const normalized = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        first: startOfDay(it.start).getTime(),
        last: startOfDay(it.end || it.start).getTime(),
      })),
    [items]
  );

  const itemsOn = (day) => {
    const t = startOfDay(day).getTime();
    return normalized.filter((it) => it.first <= t && t <= it.last);
  };

  const monthItems = useMemo(() => {
    const first = startOfMonth(month).getTime();
    const last = endOfMonth(month).getTime();
    return normalized.filter((it) => it.first <= last && it.last >= first).sort((a, b) => a.first - b.first);
  }, [normalized, month]);

  const listItems = selected ? itemsOn(selected) : monthItems;
  const goTo = (next) => {
    setMonth(next);
    setSelected(null);
  };

  return (
    <div data-testid="event-calendar">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight" aria-live="polite">
          {format(month, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-outline !px-4 !py-2 !text-xs" onClick={() => goTo(startOfMonth(new Date()))}>
            Today
          </button>
          <button type="button" aria-label="Previous month" className="btn-outline !px-3 !py-2" onClick={() => goTo(addMonths(month, -1))}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Next month" className="btn-outline !px-3 !py-2" onClick={() => goTo(addMonths(month, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-black/10 bg-white/50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="border-r border-b border-black/10 py-2 text-center text-xs uppercase tracking-widest text-brand-muted">
            <span className="md:hidden">{d[0]}</span>
            <span className="hidden md:inline">{d}</span>
          </div>
        ))}

        {days.map((day) => {
          const dayItems = itemsOn(day);
          const inMonth = isSameMonth(day, month);
          const isSelected = selected && isSameDay(day, selected);
          const today = isSameDay(day, new Date());
          const label = `${format(day, 'MMMM d, yyyy')}${dayItems.length ? `, ${dayItems.length} ${dayItems.length === 1 ? 'listing' : 'listings'}` : ''}`;

          return (
            <button
              key={day.toISOString()}
              type="button"
              aria-label={label}
              aria-pressed={!!isSelected}
              onClick={() => setSelected(isSelected ? null : day)}
              className={`border-r border-b border-black/10 min-h-[3.5rem] md:min-h-[6.5rem] p-1.5 md:p-2 text-left align-top flex flex-col gap-1 transition-colors ${
                inMonth ? '' : 'bg-black/[0.03] text-brand-muted/60'
              } ${isSelected ? 'bg-brand-sand/60' : 'hover:bg-brand-sand/30'}`}
            >
              <span
                className={`text-sm leading-none inline-flex items-center justify-center ${
                  today ? 'bg-brand-ink text-brand-cream w-6 h-6 rounded-full' : ''
                }`}
              >
                {format(day, 'd')}
              </span>

              {/* Phones: small dots. Larger screens: titles. */}
              <span className="flex gap-1 md:hidden">
                {dayItems.slice(0, 3).map((it) => (
                  <span key={it.key} className={`w-2 h-2 rounded-full ${it.kind === 'trip' ? 'bg-brand-orange' : 'bg-brand-green'}`} />
                ))}
              </span>
              <span className="hidden md:flex flex-col gap-1">
                {dayItems.slice(0, 2).map((it) => (
                  <span
                    key={it.key}
                    className={`truncate text-xs px-1.5 py-0.5 text-brand-cream ${it.kind === 'trip' ? 'bg-brand-orange' : 'bg-brand-green'}`}
                  >
                    {it.title}
                  </span>
                ))}
                {dayItems.length > 2 && <span className="text-xs text-brand-muted">+{dayItems.length - 2} more</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-6 mt-4 text-sm text-brand-muted">
        <span className="flex items-center gap-2"><span className="w-3 h-3 bg-brand-green" /> Event</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 bg-brand-orange" /> Trip</span>
      </div>

      <div className="mt-10" data-testid="calendar-list">
        <h3 className="text-2xl font-bold tracking-tight mb-4">
          {selected ? format(selected, 'EEEE, MMMM d') : `Coming up in ${format(month, 'MMMM')}`}
        </h3>
        {listItems.length === 0 ? (
          <p className="text-brand-muted">
            {selected ? 'Nothing is planned for this day.' : 'Nothing is planned this month yet. Try the next month, or switch to the list view.'}
          </p>
        ) : (
          <ul className="divide-y divide-black/10 border-y border-black/10">
            {listItems.map((it) => (
              <li key={it.key}>
                <Link to={it.to} className="flex items-baseline justify-between gap-4 py-4 hover:text-brand-orange transition-colors">
                  <span className="font-medium text-lg">{it.title}</span>
                  <span className="text-sm text-brand-muted shrink-0">
                    {it.kind === 'trip' ? 'Trip' : 'Event'} · {format(it.start, 'MMM d')}
                    {it.end && !isSameDay(it.start, it.end) ? ` – ${format(it.end, 'MMM d')}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
