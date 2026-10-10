import { useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthContext } from '../AuthContext';
import api, { getErrorMessage } from '../lib/api';
import useFetch from '../hooks/useFetch';
import PageMeta from '../components/PageMeta';
import Field from '../components/Field';
import ManageAdmins from '../components/ManageAdmins';
import { EmptyBox, ErrorBox, PageLoading } from '../components/StateViews';
import { downloadFile, formatDay, formatRange, formatWhen, toDateInput, toDateTimeInput } from '../lib/dates';

// ---------------------------------------------------------------------------
// What each editable content type looks like. Adding a field means adding one
// line to `fields` plus its conversion in toForm / toPayload.
// ---------------------------------------------------------------------------
const HINTS = {
  events: ['social', 'campout', 'beach day', 'resort weekend', 'trip meetup', 'online'],
  posts: ['trip recap', 'community', 'tips', 'guides', 'announcements'],
};

const splitLines = (text) => text.split('\n').map((s) => s.trim()).filter(Boolean);
const splitCommas = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);
const orNull = (value) => (value && value.trim() ? value.trim() : null);

const CONTENT = {
  events: {
    noun: 'event',
    list: '/admin/events',
    api: '/events',
    hints: true,
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 200 },
      { name: 'category', label: 'Category', required: true, maxLength: 50, hint: 'Pick a suggestion or type your own.' },
      { name: 'date', label: 'Starts', kind: 'datetime', required: true },
      { name: 'end_date', label: 'Ends (optional)', kind: 'datetime' },
      { name: 'location', label: 'Public location', required: true, maxLength: 200, hint: 'City or general area. Everyone can see this.' },
      { name: 'location_details', label: 'Exact address and arrival details', kind: 'textarea', rows: 3, maxLength: 1000, hint: 'Only people who RSVP can see this.' },
      { name: 'max_attendees', label: 'Max attendees', kind: 'number', required: true, min: 1 },
      { name: 'description', label: 'Description', kind: 'textarea', rows: 6, required: true, maxLength: 5000 },
    ],
    blank: { title: '', category: '', date: '', end_date: '', location: '', location_details: '', max_attendees: '50', description: '' },
    toForm: (e) => ({
      title: e.title, category: e.category, date: toDateTimeInput(e.date), end_date: toDateTimeInput(e.end_date),
      location: e.location, location_details: e.location_details || '', max_attendees: String(e.max_attendees), description: e.description,
    }),
    toPayload: (f) => ({
      title: f.title.trim(), category: f.category.trim(), date: f.date, end_date: f.end_date || null,
      location: f.location.trim(), location_details: orNull(f.location_details),
      max_attendees: parseInt(f.max_attendees, 10), description: f.description.trim(),
    }),
    check: (f) => (f.end_date && f.end_date < f.date ? 'The end time must be after the start time.' : null),
    describe: (e) => ({
      title: e.title,
      badge: e.category,
      lines: [formatWhen(e.date, 'EEE, MMM d, yyyy'), e.location, `${e.attendees_count}/${e.max_attendees} registered`],
    }),
    confirmDelete: (e) =>
      `Delete "${e.title}"?${e.attendees_count ? ` This also removes its ${e.attendees_count} RSVP(s).` : ''} This can't be undone.`,
  },

  trips: {
    noun: 'trip',
    list: '/travel-packages',
    api: '/travel-packages',
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 200 },
      { name: 'destination', label: 'Destination', required: true, maxLength: 200 },
      { name: 'start_date', label: 'Starts (optional)', kind: 'date' },
      { name: 'end_date', label: 'Ends (optional)', kind: 'date' },
      { name: 'duration', label: 'Length (optional)', maxLength: 100, placeholder: '7 nights' },
      { name: 'price', label: 'Price per person (optional)', kind: 'number', min: 0, step: '0.01', hint: 'Leave blank if there is no set price.' },
      { name: 'external_url', label: 'Link for details or booking (optional)', kind: 'url', maxLength: 2000 },
      { name: 'image_url', label: 'Photo link (optional)', kind: 'url', maxLength: 2000 },
      { name: 'description', label: 'Description', kind: 'textarea', rows: 5, required: true, maxLength: 5000 },
      { name: 'highlights', label: 'Highlights (optional)', kind: 'textarea', rows: 4, hint: 'One per line.' },
    ],
    blank: { title: '', destination: '', start_date: '', end_date: '', duration: '', price: '', external_url: '', image_url: '', description: '', highlights: '' },
    toForm: (t) => ({
      title: t.title, destination: t.destination, start_date: toDateInput(t.start_date), end_date: toDateInput(t.end_date),
      duration: t.duration || '', price: t.price == null ? '' : String(t.price), external_url: t.external_url || '',
      image_url: t.image_url || '', description: t.description, highlights: (t.highlights || []).join('\n'),
    }),
    toPayload: (f) => ({
      title: f.title.trim(), destination: f.destination.trim(), start_date: f.start_date || null, end_date: f.end_date || null,
      duration: f.duration.trim(), price: f.price === '' ? null : parseFloat(f.price),
      external_url: orNull(f.external_url), image_url: orNull(f.image_url),
      description: f.description.trim(), highlights: splitLines(f.highlights),
    }),
    check: (f) => (f.end_date && f.start_date && f.end_date < f.start_date ? 'The end date must be after the start date.' : null),
    describe: (t) => ({
      title: t.title,
      badge: formatRange(t.start_date, t.end_date) || 'No dates yet',
      lines: [t.destination, t.price == null ? 'No set price' : `$${Number(t.price).toLocaleString()} per person`],
    }),
    confirmDelete: (t) => `Delete "${t.title}"? This can't be undone.`,
  },

  posts: {
    noun: 'post',
    list: '/admin/blog',
    api: '/blog',
    hints: true,
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 200 },
      { name: 'category', label: 'Category', required: true, maxLength: 50 },
      { name: 'excerpt', label: 'Short summary', kind: 'textarea', rows: 2, required: true, maxLength: 500, hint: 'Shown on the blog page and in search results.' },
      { name: 'content', label: 'Story', kind: 'textarea', rows: 14, required: true, maxLength: 50000, hint: 'Formatting is optional: # Heading, **bold**, [link](https://example.com), ![photo](https://example.com/photo.jpg)' },
      { name: 'image_url', label: 'Cover photo link (optional)', kind: 'url', maxLength: 2000 },
      { name: 'tags', label: 'Tags (optional)', maxLength: 300, hint: 'Separate with commas.' },
      { name: 'published', label: 'Published', kind: 'checkbox', hint: 'Untick to keep it as a draft that only admins can see.' },
    ],
    blank: { title: '', category: '', excerpt: '', content: '', image_url: '', tags: '', published: true },
    toForm: (p) => ({
      title: p.title, category: p.category, excerpt: p.excerpt, content: p.content, image_url: p.image_url || '',
      tags: (p.tags || []).join(', '), published: p.published !== false,
    }),
    toPayload: (f) => ({
      title: f.title.trim(), category: f.category.trim(), excerpt: f.excerpt.trim(), content: f.content,
      image_url: orNull(f.image_url), tags: splitCommas(f.tags), published: !!f.published,
    }),
    describe: (p) => ({
      title: p.title,
      badge: p.published === false ? 'Draft' : p.category,
      lines: [`${p.author_name} · ${formatDay(p.created_at, 'MMM d, yyyy')}`, (p.tags || []).join(', ')].filter(Boolean),
    }),
    confirmDelete: (p) => `Delete "${p.title}"? This can't be undone.`,
  },
};

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function ContentForm({ type, item, initial, note, saving, onSubmit, onCancel }) {
  const cfg = CONTENT[type];
  const [form, setForm] = useState(() => initial || (item ? cfg.toForm(item) : cfg.blank));
  const set = (name) => (e) => setForm({ ...form, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const listId = `${type}-suggestions`;

  const submit = (e) => {
    e.preventDefault();
    const problem = cfg.check?.(form);
    if (problem) {
      toast.error(problem);
      return;
    }
    onSubmit(cfg.toPayload(form));
  };

  return (
    <form onSubmit={submit} className="border border-black/10 bg-white/50 p-6 md:p-8 space-y-6" data-testid="admin-form">
      <h2 className="text-2xl font-bold tracking-tight">{item ? `Edit ${cfg.noun}` : `New ${cfg.noun}`}</h2>
      {note && <p className="border border-brand-green/40 bg-white/70 p-4 text-brand-ink whitespace-pre-line" role="note">{note}</p>}

      {cfg.fields.map((f) => {
        if (f.kind === 'checkbox') {
          return (
            <label key={f.name} className="flex items-start gap-3">
              <input type="checkbox" checked={!!form[f.name]} onChange={set(f.name)} className="w-5 h-5 mt-0.5 accent-[#1A4D2E]" data-testid={`admin-${f.name}`} />
              <span>
                <span className="font-medium">{f.label}</span>
                {f.hint && <span className="block text-sm text-brand-muted">{f.hint}</span>}
              </span>
            </label>
          );
        }
        const inputType = { datetime: 'datetime-local', date: 'date', number: 'number', url: 'url' }[f.kind];
        const isArea = f.kind === 'textarea';
        return (
          <Field
            key={f.name}
            as={isArea ? 'textarea' : 'input'}
            type={isArea ? undefined : inputType || 'text'}
            label={f.label}
            required={f.required}
            hint={f.hint}
            rows={f.rows}
            min={f.min}
            step={f.step}
            maxLength={f.maxLength}
            placeholder={f.placeholder}
            list={cfg.hints && f.name === 'category' ? listId : undefined}
            value={form[f.name] ?? ''}
            onChange={set(f.name)}
            data-testid={`admin-${f.name}`}
          />
        );
      })}
      {cfg.hints && (
        <datalist id={listId}>
          {HINTS[type].map((h) => <option key={h} value={h} />)}
        </datalist>
      )}

      <div className="flex flex-wrap gap-4 pt-2">
        <button type="submit" disabled={saving} className="btn-primary" data-testid="admin-save">{saving ? 'Saving…' : item ? 'Save changes' : `Create ${cfg.noun}`}</button>
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
      </div>
    </form>
  );
}

function ItemRow({ info, onEdit, onDelete }) {
  return (
    <div className="card-brutalist p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4" data-testid="admin-item">
      <div className="min-w-0">
        <span className="text-xs uppercase tracking-widest px-3 py-1 bg-brand-sand text-brand-ink inline-block mb-3">{info.badge}</span>
        <h3 className="text-xl font-bold mb-2 break-words">{info.title}</h3>
        {info.lines.map((line) => <p key={line} className="text-sm text-brand-muted">{line}</p>)}
      </div>
      <div className="flex gap-3 shrink-0">
        <button type="button" onClick={onEdit} className="btn-outline !px-4 !py-2 !text-xs" aria-label={`Edit ${info.title}`}><Pencil size={14} aria-hidden="true" /> Edit</button>
        <button type="button" onClick={onDelete} className="btn-outline !px-4 !py-2 !text-xs !text-brand-orange !border-brand-orange" aria-label={`Delete ${info.title}`}><Trash2 size={14} aria-hidden="true" /> Delete</button>
      </div>
    </div>
  );
}

function ContentTab({ type, draft, onDraftDone }) {
  const cfg = CONTENT[type];
  const list = useFetch(cfg.list);
  const [editor, setEditor] = useState(() => (draft ? { item: null, initial: draft.values, note: draft.note } : null));
  const [saving, setSaving] = useState(false);

  const save = async (payload) => {
    setSaving(true);
    try {
      if (editor.item) {
        await api.put(`${cfg.api}/${editor.item.id}`, payload);
      } else {
        await api.post(cfg.api, payload);
        if (draft?.submissionId) {
          await api.patch(`/admin/submissions/${draft.submissionId}`, { status: 'approved' }).catch(() => {});
          onDraftDone();
        }
      }
      toast.success(editor.item ? 'Saved.' : `Created. The new ${cfg.noun} is live.`);
      setEditor(null);
      list.reload();
    } catch (error) {
      toast.error(getErrorMessage(error, `Could not save the ${cfg.noun}.`));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(cfg.confirmDelete(item))) return;
    try {
      await api.delete(`${cfg.api}/${item.id}`);
      toast.success('Deleted.');
      list.reload();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete.'));
    }
  };

  if (editor) {
    return (
      <ContentForm
        type={type}
        item={editor.item}
        initial={editor.initial}
        note={editor.note}
        saving={saving}
        onSubmit={save}
        onCancel={() => setEditor(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-brand-muted" data-testid="admin-count">{(list.data || []).length} total</p>
        <button type="button" onClick={() => setEditor({ item: null })} className="btn-accent" data-testid="admin-new"><Plus size={16} aria-hidden="true" /> New {cfg.noun}</button>
      </div>
      {list.loading && !list.data ? <PageLoading /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : list.data.length === 0 ? (
        <EmptyBox>Nothing here yet.</EmptyBox>
      ) : (
        <div className="space-y-4">
          {list.data.map((item) => (
            <ItemRow key={item.id} info={cfg.describe(item)} onEdit={() => setEditor({ item })} onDelete={() => remove(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

// Spreadsheet programs run text that starts with = + - @ as a formula, so defuse it.
const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

function RsvpTab() {
  const rsvps = useFetch('/admin/all-rsvps');
  const [eventId, setEventId] = useState('all');

  const events = useMemo(() => {
    const map = new Map();
    (rsvps.data || []).forEach((r) => map.set(r.event_id, r.event_title));
    return [...map.entries()];
  }, [rsvps.data]);
  const shown = (rsvps.data || []).filter((r) => eventId === 'all' || r.event_id === eventId);

  const exportCsv = () => {
    const rows = [['Event', 'Event date', 'Name', 'Email', 'Registered']].concat(
      shown.map((r) => [r.event_title, formatDay(r.event_date, 'yyyy-MM-dd'), r.name, r.email, formatDay(r.created_at, 'yyyy-MM-dd')])
    );
    downloadFile('attendees.csv', rows.map((row) => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  };

  if (rsvps.loading && !rsvps.data) return <PageLoading />;
  if (rsvps.error) return <ErrorBox message={rsvps.error} onRetry={rsvps.reload} />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="sm:w-80">
          <Field as="select" label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="all">All events</option>
            {events.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </Field>
        </div>
        <button type="button" onClick={exportCsv} disabled={shown.length === 0} className="btn-outline"><Download size={16} aria-hidden="true" /> Download CSV</button>
      </div>
      {shown.length === 0 ? <EmptyBox>No RSVPs yet.</EmptyBox> : (
        <div className="overflow-x-auto border border-black/10 bg-white/50">
          <table className="w-full text-left text-sm" data-testid="rsvp-table">
            <caption className="sr-only">Event attendees</caption>
            <thead className="border-b border-black/10 uppercase tracking-widest text-xs text-brand-muted">
              <tr><th scope="col" className="p-4">Name</th><th scope="col" className="p-4">Email</th><th scope="col" className="p-4">Event</th><th scope="col" className="p-4">Registered</th></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-black/5 last:border-0">
                  <td className="p-4">{r.name}</td><td className="p-4">{r.email}</td><td className="p-4">{r.event_title}</td><td className="p-4 whitespace-nowrap">{formatDay(r.created_at, 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InquiryTab() {
  const inquiries = useFetch('/admin/all-inquiries');
  if (inquiries.loading && !inquiries.data) return <PageLoading />;
  if (inquiries.error) return <ErrorBox message={inquiries.error} onRetry={inquiries.reload} />;
  if (inquiries.data.length === 0) return <EmptyBox>No trip inquiries yet.</EmptyBox>;
  return (
    <div className="space-y-4">
      {inquiries.data.map((q) => (
        <div key={q.id} className="card-brutalist p-6" data-testid="inquiry-card">
          <h3 className="text-xl font-bold mb-1">{q.package_title}</h3>
          <p className="text-sm text-brand-muted mb-4">{q.package_destination}</p>
          <p className="font-medium">{q.name}</p>
          <p className="text-sm text-brand-muted"><a className="underline" href={`mailto:${q.email}`}>{q.email}</a>{q.phone ? ` · ${q.phone}` : ''}</p>
          {q.travel_date && <p className="text-sm text-brand-muted mt-1">Dates: {formatRange(q.travel_date) || q.travel_date}</p>}
          {q.message && <p className="text-sm text-brand-muted my-4 p-4 bg-white/60 border border-black/5 whitespace-pre-line">{q.message}</p>}
          <p className="text-xs uppercase tracking-widest text-brand-muted mt-3">Sent {formatDay(q.created_at, 'MMM d, yyyy')}</p>
        </div>
      ))}
    </div>
  );
}

function SubmissionsTab({ onCreateEvent }) {
  const subs = useFetch('/admin/submissions');

  const setStatus = async (s, status) => {
    try {
      await api.patch(`/admin/submissions/${s.id}`, { status });
      subs.reload();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
  const remove = async (s) => {
    if (!window.confirm(`Delete the submission "${s.title}"?`)) return;
    try {
      await api.delete(`/admin/submissions/${s.id}`);
      subs.reload();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (subs.loading && !subs.data) return <PageLoading />;
  if (subs.error) return <ErrorBox message={subs.error} onRetry={subs.reload} />;
  if (subs.data.length === 0) return <EmptyBox>No submissions yet. They'll appear here when someone uses the Submit an event form.</EmptyBox>;

  return (
    <div className="space-y-4">
      {subs.data.map((s) => (
        <div key={s.id} className="card-brutalist p-6" data-testid="submission-card">
          <span className="text-xs uppercase tracking-widest px-3 py-1 bg-brand-sand text-brand-ink inline-block mb-3">{s.status}</span>
          <h3 className="text-xl font-bold mb-2">{s.title}</h3>
          <p className="text-sm text-brand-muted">When: {s.when}</p>
          <p className="text-sm text-brand-muted">Where: {s.location}</p>
          {s.website && <p className="text-sm text-brand-muted break-all">Link: <a className="underline" href={s.website} target="_blank" rel="noopener noreferrer">{s.website}</a></p>}
          <p className="text-brand-muted my-4 whitespace-pre-line">{s.description}</p>
          <p className="text-sm text-brand-muted">From {s.contact_name}, <a className="underline" href={`mailto:${s.contact_email}`}>{s.contact_email}</a></p>
          <div className="flex flex-wrap gap-3 mt-5">
            {s.status !== 'approved' && <button type="button" className="btn-primary !px-4 !py-2 !text-xs" onClick={() => onCreateEvent(s)}>Create event from this</button>}
            {s.status === 'pending' && <button type="button" className="btn-outline !px-4 !py-2 !text-xs" onClick={() => setStatus(s, 'rejected')}>Dismiss</button>}
            {s.status !== 'pending' && <button type="button" className="btn-outline !px-4 !py-2 !text-xs" onClick={() => setStatus(s, 'pending')}>Move back to pending</button>}
            <button type="button" className="btn-outline !px-4 !py-2 !text-xs !text-brand-orange !border-brand-orange" onClick={() => remove(s)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: 'events', label: 'Events' },
  { id: 'trips', label: 'Trips' },
  { id: 'posts', label: 'Blog posts' },
  { id: 'rsvps', label: 'Attendees' },
  { id: 'inquiries', label: 'Trip inquiries' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'admins', label: 'Admins' },
];

// All hooks are called before any early return, so React's rules of hooks hold even if
// the signed-in user changes while this page is open.
export default function Admin() {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('events');
  const [draft, setDraft] = useState(null);

  const createFromSubmission = (s) => {
    setDraft({
      submissionId: s.id,
      values: { ...CONTENT.events.blank, title: s.title, location: s.location, description: s.description },
      note: `From a community submission by ${s.contact_name} (${s.contact_email}).\nThey wrote the date as: ${s.when}${s.website ? `\nLink: ${s.website}` : ''}\nChoose the real date and time below. Share any exact address only in "Exact address and arrival details".`,
    });
    setTab('events');
  };

  if (!user?.is_admin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 text-center" data-testid="admin-denied">
        <PageMeta title="Admin" />
        <div>
          <h1 className="text-4xl font-bold mb-4">Admins only</h1>
          <p className="text-brand-muted mb-8">Your account doesn't have admin access.</p>
          <Link to="/" className="btn-primary">Go to the home page</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="admin-page">
      <PageMeta title="Admin" />
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-10">Admin</h1>

        <div role="tablist" aria-label="Admin sections" className="flex gap-2 overflow-x-auto pb-4 mb-8 border-b border-black/10">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              data-testid={`admin-tab-${t.id}`}
              className={`px-5 py-2.5 text-sm uppercase tracking-widest font-medium whitespace-nowrap border transition-colors ${
                tab === t.id ? 'bg-brand-ink text-brand-cream border-brand-ink' : 'border-black/10 text-brand-muted hover:border-brand-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {['events', 'trips', 'posts'].includes(tab) && (
            <ContentTab key={tab} type={tab} draft={tab === 'events' ? draft : null} onDraftDone={() => setDraft(null)} />
          )}
          {tab === 'rsvps' && <RsvpTab />}
          {tab === 'inquiries' && <InquiryTab />}
          {tab === 'submissions' && <SubmissionsTab onCreateEvent={createFromSubmission} />}
          {tab === 'admins' && <ManageAdmins />}
        </div>
      </div>
    </div>
  );
}
