import { CalendarPlus, Download } from 'lucide-react';
import { downloadIcs, googleCalendarUrl } from '../lib/dates';

// Two one-tap options: Google Calendar (opens prefilled) and Apple/Outlook (.ics file).
export default function AddToCalendar({ event, compact = false, testIdPrefix = 'add-to-calendar' }) {
  const btn = compact
    ? 'inline-flex items-center gap-2 text-sm underline underline-offset-4 text-brand-green hover:text-brand-ink transition-colors'
    : 'btn-outline w-full';

  return (
    <div className={compact ? 'flex flex-wrap gap-x-5 gap-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'} data-testid={testIdPrefix}>
      <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={btn} data-testid={`${testIdPrefix}-google`}>
        <CalendarPlus size={compact ? 14 : 18} aria-hidden="true" /> Google Calendar
      </a>
      <button type="button" onClick={() => downloadIcs(event)} className={btn} data-testid={`${testIdPrefix}-apple`}>
        <Download size={compact ? 14 : 18} aria-hidden="true" /> Apple / Outlook
      </button>
    </div>
  );
}
