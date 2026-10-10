import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Calendar, MapPin, Plane } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import PageMeta from '../components/PageMeta';
import { formatWhen } from '../lib/dates';

// Swap this for one of your own photos (with everyone's consent) when you have one.
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1764889746854-0a6fd46ccac8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMG1vdW50YWlucyUyMGJlYWNoJTIwY2l0eXxlbnwwfHx8fDE3NjUyMjI2MzB8MA&ixlib=rb-4.1.0&q=85';

const FEATURES = [
  { to: '/events', Icon: Calendar, title: 'Events', testid: 'events', cta: 'View events', text: 'Socials, campouts and getaways. RSVP once and add it to your calendar.' },
  { to: '/blog', Icon: BookOpen, title: 'Stories', testid: 'blog', cta: 'Read stories', text: 'Trip recaps, tips and news from the community.' },
  { to: '/travel', Icon: Plane, title: 'Trips', testid: 'travel', cta: 'See trips', text: "Where we're headed next, with dates and how to join." },
];

export default function Home() {
  const events = useFetch('/events', { upcoming: true });
  const next = (events.data || []).slice(0, 3);

  return (
    <div className="min-h-screen">
      <PageMeta description="Events, trips and stories from The Shenanigators, a welcoming space for people of color to explore naturism, body positivity and wellness." />

      <section
        className="relative min-h-[80vh] flex items-center py-24"
        style={{ backgroundImage: `url(${HERO_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        data-testid="hero-section"
      >
        <div className="absolute inset-0 bg-black/50" aria-hidden="true"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
          <div className="max-w-3xl">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold text-brand-cream leading-none tracking-tighter mb-8" data-testid="hero-title">
              Explore.
              <br />Experience Nudism.
              <br />Remember.
            </h1>
            <p className="text-xl text-brand-cream leading-relaxed mb-12 max-w-xl">
              A welcoming space for people of color to explore naturism, body positivity and wellness, through events, trips and stories.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/events" data-testid="hero-cta" className="btn-accent !px-12 !py-4">See upcoming events</Link>
              <Link to="/about" className="btn-outline !px-12 !py-4 !text-brand-cream !border-brand-cream hover:!bg-brand-cream hover:!text-brand-ink">Who we are</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-brand-cream" aria-labelledby="coming-up" data-testid="coming-up-section">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-end justify-between gap-6 mb-10">
            <h2 id="coming-up" className="text-4xl md:text-5xl font-bold tracking-tight">Coming up</h2>
            <Link to="/events?view=calendar" className="text-brand-green underline underline-offset-4 hover:text-brand-orange shrink-0">Open the calendar</Link>
          </div>
          {events.loading && !events.data ? (
            <p className="text-brand-muted" role="status">Loading…</p>
          ) : events.error ? (
            <p className="text-brand-muted">We couldn't load events right now. <Link to="/events" className="underline">Try the events page</Link>.</p>
          ) : next.length === 0 ? (
            <p className="text-brand-muted text-lg">Nothing is scheduled yet. <Link to="/submit-event" className="underline text-brand-green">Know of an event?</Link></p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {next.map((e) => (
                <li key={e.id}>
                  <Link to={`/events/${e.id}`} className="card-brutalist p-8 block h-full group">
                    <p className="text-sm text-brand-muted mb-3">{formatWhen(e.date, 'EEE, MMM d')}</p>
                    <h3 className="text-2xl font-bold tracking-tight mb-4 group-hover:text-brand-orange transition-colors">{e.title}</h3>
                    <p className="flex items-center gap-2 text-sm text-brand-muted"><MapPin size={14} aria-hidden="true" />{e.location}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="pb-24 bg-brand-cream" data-testid="features-section" aria-label="Explore the site">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map(({ to, Icon, title, testid, cta, text }) => (
              <div key={to} className="border border-black/10 p-10 bg-white/50" data-testid={`feature-${testid}`}>
                <Icon size={44} className="mb-8 text-brand-green" aria-hidden="true" />
                <h3 className="text-3xl font-bold mb-4 tracking-tight">{title}</h3>
                <p className="text-brand-muted leading-relaxed mb-8">{text}</p>
                <Link to={to} data-testid={`${testid}-link`} className="inline-flex items-center gap-2 text-sm uppercase tracking-widest font-medium text-brand-green hover:text-brand-orange transition-colors">
                  {cta} <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
