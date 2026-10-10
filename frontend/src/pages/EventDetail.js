import { useContext, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Check, Clock, Lock, MapPin, Users } from 'lucide-react';
import { startOfToday } from 'date-fns';
import { toast } from 'sonner';
import { AuthContext } from '../AuthContext';
import api, { getErrorMessage } from '../lib/api';
import useFetch from '../hooks/useFetch';
import PageMeta from '../components/PageMeta';
import Field from '../components/Field';
import { ErrorBox, PageLoading } from '../components/StateViews';
import { downloadIcs, formatDay, formatTime, formatWhen, hasTime, toDate } from '../lib/dates';

// "Saturday, October 10, 2026 at 6:00 PM", plus the end when there is one.
function describeWhen(event) {
  const start = formatWhen(event.date);
  if (!event.end_date) return start;
  const sameDay = formatDay(event.date, 'yyyy-MM-dd') === formatDay(event.end_date, 'yyyy-MM-dd');
  if (sameDay) {
    return hasTime(event.end_date) ? `${start} to ${formatTime(event.end_date)}` : start;
  }
  return `${start} until ${formatWhen(event.end_date, 'EEEE, MMMM d')}`;
}

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const event = useFetch(`/events/${id}`);
  const mine = useFetch('/my-rsvps', {}, { enabled: !!user });
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [busy, setBusy] = useState(false);

  if (event.loading && !event.data) return <PageLoading />;
  if (event.error) {
    return (
      <div className="min-h-[60vh] py-24 max-w-3xl mx-auto px-6">
        <ErrorBox message={event.error} onRetry={event.reload} />
        <Link to="/events" className="inline-flex items-center gap-2 mt-8 text-brand-green underline">
          <ArrowLeft size={16} aria-hidden="true" /> Back to events
        </Link>
      </div>
    );
  }

  const e = event.data;
  const rsvp = (mine.data || []).find((r) => r.event_id === e.id);
  const full = e.attendees_count >= e.max_attendees;
  const last = toDate(e.end_date || e.date);
  const isPast = !!last && last.getTime() < startOfToday().getTime();

  const refresh = () => {
    event.reload();
    mine.reload();
  };

  const handleRSVP = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    try {
      await api.post('/rsvp', { event_id: e.id, ...form });
      toast.success("You're registered!");
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not register. Please try again.'));
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your RSVP for this event?')) return;
    setBusy(true);
    try {
      await api.delete(`/rsvp/${rsvp.id}`);
      toast.success('Your RSVP was cancelled.');
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not cancel. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const addToCalendar = () =>
    downloadIcs({
      id: e.id,
      title: e.title,
      description: e.description,
      start: e.date,
      end: e.end_date,
      location: e.location_details ? `${e.location_details}, ${e.location}` : e.location,
      url: window.location.href,
    });

  let rsvpPanel;
  if (isPast) {
    rsvpPanel = <p className="text-brand-muted">This event has already happened.</p>;
  } else if (rsvp) {
    rsvpPanel = (
      <div className="space-y-6" data-testid="rsvp-confirmed">
        <p className="flex items-center gap-3 text-xl font-medium text-brand-green">
          <Check size={22} aria-hidden="true" /> You're going
        </p>
        <button type="button" onClick={addToCalendar} className="btn-primary w-full" data-testid="add-to-calendar">
          <CalendarPlus size={18} aria-hidden="true" /> Add to calendar
        </button>
        <button type="button" onClick={handleCancel} disabled={busy} className="btn-outline w-full" data-testid="cancel-rsvp">
          Cancel my RSVP
        </button>
      </div>
    );
  } else if (full) {
    rsvpPanel = <p className="text-brand-orange font-medium text-center py-4">This event is full.</p>;
  } else if (!user) {
    rsvpPanel = (
      <div className="space-y-6">
        <p className="text-brand-muted leading-relaxed">
          Sign in or create a free account to RSVP. Only the organizers see who has registered. Other visitors see just the headcount.
        </p>
        <Link to="/auth" state={{ from: location.pathname }} className="btn-accent w-full" data-testid="login-to-rsvp">
          Sign in to RSVP
        </Link>
        <button type="button" onClick={addToCalendar} className="btn-outline w-full">
          <CalendarPlus size={18} aria-hidden="true" /> Add to calendar
        </button>
      </div>
    );
  } else {
    rsvpPanel = (
      <form onSubmit={handleRSVP} className="space-y-6">
        <Field
          label="Name"
          data-testid="input-name"
          autoComplete="name"
          value={form.name}
          onChange={(ev) => setForm({ ...form, name: ev.target.value })}
          required
        />
        <Field
          label="Email"
          type="email"
          data-testid="input-email"
          autoComplete="email"
          value={form.email}
          onChange={(ev) => setForm({ ...form, email: ev.target.value })}
          required
        />
        <button type="submit" data-testid="rsvp-button" disabled={busy} className="btn-accent w-full">
          {busy ? 'Registering…' : 'RSVP'}
        </button>
      </form>
    );
  }

  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="event-detail-page">
      <PageMeta title={e.title} description={e.description.slice(0, 160)} />
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <Link
          to="/events"
          data-testid="back-button"
          className="inline-flex items-center gap-2 text-sm uppercase tracking-widest text-brand-muted hover:text-brand-ink mb-12 transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to events
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            <span className="text-xs uppercase tracking-widest px-4 py-1 bg-brand-green text-brand-cream inline-block mb-6">{e.category}</span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8" data-testid="event-title">
              {e.title}
            </h1>

            <div className="space-y-4 mb-10">
              <div className="flex items-start gap-3 text-lg">
                <Clock size={20} className="text-brand-green mt-1 shrink-0" aria-hidden="true" />
                {describeWhen(e)}
              </div>
              <div className="flex items-start gap-3 text-lg">
                <MapPin size={20} className="text-brand-green mt-1 shrink-0" aria-hidden="true" />
                {e.location}
              </div>
              <div className="flex items-start gap-3 text-lg">
                <Users size={20} className="text-brand-green mt-1 shrink-0" aria-hidden="true" />
                {e.attendees_count} of {e.max_attendees} spots taken
              </div>
            </div>

            {e.location_details ? (
              <div className="border border-brand-green/40 bg-white/60 p-6 mb-10" data-testid="location-details">
                <p className="font-medium mb-2">Exact address and arrival details</p>
                <p className="text-brand-muted whitespace-pre-line">{e.location_details}</p>
              </div>
            ) : (
              !isPast && (
                <p className="flex items-start gap-3 text-brand-muted mb-10">
                  <Lock size={18} className="mt-1 shrink-0" aria-hidden="true" />
                  The exact address and arrival details are shared with people who RSVP.
                </p>
              )
            )}

            <p className="text-lg text-brand-muted leading-relaxed whitespace-pre-line max-w-prose" data-testid="event-description">
              {e.description}
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="border border-black/10 p-8 bg-white/50 lg:sticky lg:top-28" data-testid="rsvp-form">
              <h2 className="text-2xl font-bold mb-6 tracking-tight">{rsvp ? 'Your RSVP' : 'Register for this event'}</h2>
              {rsvpPanel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
