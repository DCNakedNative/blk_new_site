import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import api, { getErrorMessage } from '../lib/api';
import PageMeta from '../components/PageMeta';
import Field from '../components/Field';

const EMPTY = { title: '', when: '', location: '', description: '', website: '', contact_name: '', contact_email: '', company: '' };

export default function SubmitEvent() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/event-submissions', { ...form, website: form.website || null });
      setDone(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't send your event. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="submit-event-page">
      <PageMeta title="Submit an event" description="Know of an event or trip for the community? Send it to us and we'll review it for the calendar." />
      <div className="max-w-2xl mx-auto px-6 md:px-12">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6">Submit an event</h1>
        <p className="text-xl text-brand-muted leading-relaxed mb-12">
          Tell us about it. We review every submission before it goes on the calendar, and we may email you with questions.
        </p>

        {done ? (
          <div className="border border-brand-green/40 bg-white/60 p-8" role="status" data-testid="submit-success">
            <p className="flex items-center gap-3 text-2xl font-bold text-brand-green mb-4"><Check size={24} aria-hidden="true" /> Thanks, we got it</p>
            <p className="text-brand-muted mb-8">We'll review it and get back to you at {form.contact_email} if we need anything.</p>
            <div className="flex flex-wrap gap-4">
              <button type="button" className="btn-outline" onClick={() => { setForm(EMPTY); setDone(false); }}>Submit another</button>
              <Link to="/events" className="btn-primary">See the calendar</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-8" data-testid="submit-form">
            <Field label="Event name" value={form.title} onChange={set('title')} maxLength={200} required />
            <Field label="When" value={form.when} onChange={set('when')} maxLength={200} placeholder="Saturday, March 14, 2pm to 6pm" hint="Dates, times, and whether it spans several days." required />
            <Field label="Where (city or area)" value={form.location} onChange={set('location')} maxLength={200} hint="Don't include a private address here. Share exact details with us directly." required />
            <Field as="textarea" label="What is it?" rows={5} className="resize-none" value={form.description} onChange={set('description')} maxLength={3000} hint="Who it's for, what to expect, cost, and any rules." required />
            <Field label="Website or link (optional)" type="url" value={form.website} onChange={set('website')} maxLength={500} placeholder="https://" />
            <Field label="Your name" autoComplete="name" value={form.contact_name} onChange={set('contact_name')} maxLength={100} required />
            <Field label="Your email" type="email" autoComplete="email" value={form.contact_email} onChange={set('contact_email')} required />

            {/* Honeypot: hidden from people, tempting to spam bots. */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label>Leave this empty<input type="text" tabIndex={-1} autoComplete="off" value={form.company} onChange={set('company')} /></label>
            </div>

            <button type="submit" disabled={busy} className="btn-accent" data-testid="submit-event-button">{busy ? 'Sending…' : 'Send for review'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
