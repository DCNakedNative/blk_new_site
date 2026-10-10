import { addDays, addHours, format, parseISO } from 'date-fns';

// Dates come from the server as text such as "2026-10-10" or "2026-10-10T18:00".
// parseISO reads a date with no time zone as the viewer's local date, so an event
// on the 10th is shown on the 10th.
export function toDate(value) {
  if (!value) return null;
  const d = parseISO(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const hasTime = (value) => typeof value === 'string' && value.includes('T');

export function formatDay(value, pattern = 'EEEE, MMMM d, yyyy') {
  const d = toDate(value);
  return d ? format(d, pattern) : '';
}

export function formatTime(value) {
  const d = hasTime(value) ? toDate(value) : null;
  return d ? format(d, 'h:mm a') : '';
}

// "Saturday, October 10, 2026 at 6:00 PM" (the time appears only when one was entered)
export function formatWhen(value, pattern = 'EEEE, MMMM d, yyyy') {
  const day = formatDay(value, pattern);
  const time = formatTime(value);
  return time ? `${day} at ${time}` : day;
}

// Trip dates: "Mar 1 – Mar 8, 2027", "Mar 1, 2027", or an empty string.
export function formatRange(start, end) {
  const s = toDate(start);
  if (!s) return '';
  const e = toDate(end);
  if (!e || format(s, 'yyyy-MM-dd') === format(e, 'yyyy-MM-dd')) return format(s, 'MMM d, yyyy');
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${format(s, sameYear ? 'MMM d' : 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`;
}

// The value an <input type="datetime-local"> needs: "2026-10-10T18:00".
export function toDateTimeInput(value) {
  const d = toDate(value);
  return d ? format(d, "yyyy-MM-dd'T'HH:mm") : '';
}

// The value an <input type="date"> needs: "2026-10-10".
export function toDateInput(value) {
  const d = toDate(value);
  return d ? format(d, 'yyyy-MM-dd') : '';
}

// ---------------------------------------------------------------------------
// "Add to calendar" (.ics) support
// ---------------------------------------------------------------------------
const TZ_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;

function icsEscape(text = '') {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Lines longer than 75 characters must be folded onto continuation lines.
function icsFold(line) {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(` ${line.slice(i, i + 74)}`);
  return parts.join('\r\n');
}

function icsUtc(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Returns the DTSTART and DTEND lines.
function icsTimes(startValue, endValue) {
  const start = toDate(startValue);
  const end = toDate(endValue);

  if (!hasTime(startValue)) {
    // All-day: DTEND is the day AFTER the last day.
    const lastDay = end || start;
    return [
      `DTSTART;VALUE=DATE:${format(start, 'yyyyMMdd')}`,
      `DTEND;VALUE=DATE:${format(addDays(lastDay, 1), 'yyyyMMdd')}`,
    ];
  }

  const realEnd = end && hasTime(endValue) ? end : addHours(start, 2);
  if (TZ_SUFFIX.test(startValue)) {
    return [`DTSTART:${icsUtc(start)}`, `DTEND:${icsUtc(realEnd)}`];
  }
  // No time zone: use "floating" time so the calendar shows the same clock time
  // wherever the person is, which is what you want for an in-person event.
  return [`DTSTART:${format(start, "yyyyMMdd'T'HHmmss")}`, `DTEND:${format(realEnd, "yyyyMMdd'T'HHmmss")}`];
}

export function buildIcs({ id, title, description, start, end, location, url }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Shenanigators//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${id}@black-nudist.com`,
    `DTSTAMP:${icsUtc(new Date())}`,
    ...icsTimes(start, end),
    `SUMMARY:${icsEscape(title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  if (location) lines.push(`LOCATION:${icsEscape(location)}`);
  if (url) lines.push(`URL:${url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(icsFold).join('\r\n');
}

export function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

export function downloadIcs(item) {
  const safeName = (item.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  downloadFile(`${safeName || 'event'}.ics`, buildIcs(item), 'text/calendar;charset=utf-8');
}
